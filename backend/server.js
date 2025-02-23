require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");
const jwt = require("jsonwebtoken"); // ADDED for JWT

// 1. Express App
const app = express();
app.use(express.json());

// 2. CORS (allow requests from your frontend URL)
app.use(cors()); // open to all origins (dev only)

// 3. Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

// 4. Supabase Client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// 5. Multer Setup (in-memory storage for file buffer)
const upload = multer({ storage: multer.memoryStorage() });

// ==================== ADDED: JWT SECRET =====================
const JWT_SECRET = process.env.JWT_SECRET || "someSuperSecretKey";

// 6. Mongoose Schemas & Models

// CHANGED: We add a User schema to store username/password
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true }, // unique username
  passwordHash: { type: String, required: true },
});

// The Folder schema now might have an owner to store which user created it (optional).
const FolderSchema = new mongoose.Schema({
  name: String,
  unlockDate: Date,
  passwordHash: String,
  files: [String], // Will store file paths or URLs
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // ADDED if you want ownership
});

const User = mongoose.model("User", UserSchema);
const Folder = mongoose.model("Folder", FolderSchema);

// ==================== ADDED: Auth Middleware for JWT =====================
// If you want each user to have their own folders, protect routes with this:
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization; // expecting "Bearer <token>"
  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Invalid auth header format" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // attach userId to request
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// =============================================================
// ==================== USER AUTH ENDPOINTS ====================
// =============================================================

// ---------------------- REGISTER USER ------------------------
app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists." });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const newUser = new User({
      username,
      passwordHash,
    });
    await newUser.save();

    return res.status(201).json({ message: "User registered successfully." });
  } catch (error) {
    console.error("Error in /register:", error);
    return res.status(500).json({ error: error.message });
  }
});

// ---------------------- LOGIN USER ---------------------------
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials." });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials." });
    }

    // Create JWT
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "1d" });

    return res.status(200).json({
      message: "Logged in successfully.",
      token,
    });
  } catch (error) {
    console.error("Error in /login:", error);
    return res.status(500).json({ error: error.message });
  }
});

// =============================================================
// ======================== FOLDER ENDPOINTS ===================
// =============================================================

// ---------------------- CREATE FOLDER ------------------------
app.post("/create-folder", authMiddleware, async (req, res) => {
  try {
    const { name, unlockDate, password } = req.body;

    // 1) Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 2) Create folder doc in MongoDB
    const folder = new Folder({
      name,
      unlockDate,
      passwordHash,
      files: [],
      owner: req.userId, // store the user ID from the token
    });
    await folder.save();

    return res.json({ message: "Folder created successfully!" });
  } catch (error) {
    console.error("Error in /create-folder:", error);
    return res.status(500).json({ error: error.message });
  }
});

// ---------------------- UPLOAD FILE --------------------------
app.post("/upload-file", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    // 1) Get folderId from the form field
    const { folderId } = req.body;
    // 2) Get the file from multer
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Check if folder belongs to this user (optional, if you want ownership check)
    const folder = await Folder.findById(folderId);
    if (!folder) {
      return res.status(404).json({ error: "Folder not found" });
    }
    if (folder.owner.toString() !== req.userId) {
      return res.status(403).json({ error: "Not authorized to upload to this folder" });
    }

    // 3) Construct file path for Supabase
    // e.g. "folderId/originalfilename"
    const filePath = `${folderId}/${file.originalname}`;

    // 4) Upload to Supabase
    const { data, error } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .upload(filePath, file.buffer, {
        upsert: true,
        contentType: file.mimetype,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return res.status(500).json({ error: error.message });
    }

    // 5) If your bucket is public, you can build a public URL:
    //    https://<your-supabase-url>/storage/v1/object/public/<bucketName>/<filePath>
    const fileUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/${process.env.SUPABASE_BUCKET}/${filePath}`;

    // 6) Update the MongoDB folder document with the new file path
    //    (You can store the path or the fileUrl, whichever you prefer)
    await Folder.findByIdAndUpdate(folderId, {
      $push: { files: filePath },
    });

    // 7) Return success
    return res.json({ message: "File uploaded successfully!", fileUrl });
  } catch (error) {
    console.error("Error in /upload-file:", error);
    return res.status(500).json({ error: error.message });
  }
});

// ---------------------- ACCESS FOLDER ------------------------
app.post("/access-folder", authMiddleware, async (req, res) => {
  try {
    const { name, password } = req.body;

    // 1) Find the folder by name AND owner
    const folder = await Folder.findOne({ name, owner: req.userId });
    if (!folder) {
      return res.status(404).json({ error: "Folder not found" });
    }

    // 2) Check unlock date
    if (new Date() < new Date(folder.unlockDate)) {
      return res
        .status(403)
        .json({ error: "Folder is locked until " + folder.unlockDate });
    }

    // 3) Validate password
    const isValid = await bcrypt.compare(password, folder.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid password" });
    }

    // 4) Return the folder data or files
    return res.json({ message: "Access granted", files: folder.files });
  } catch (error) {
    console.error("Error in /access-folder:", error);
    return res.status(500).json({ error: error.message });
  }
});

// ---------------------- GET ALL FOLDERS ----------------------
// This returns only folders belonging to the logged-in user
app.get("/folders", authMiddleware, async (req, res) => {
  try {
    // Exclude passwordHash & __v from the response
    const folders = await Folder.find({ owner: req.userId }, { __v: 0, passwordHash: 0 });
    return res.json(folders);
  } catch (error) {
    console.error("Error in /folders:", error);
    return res.status(500).json({ error: error.message });
  }
});

// =============================================================
// ======================== START SERVER =======================
// =============================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

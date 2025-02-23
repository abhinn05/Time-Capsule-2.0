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

// User Schema
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true }, // unique username
  passwordHash: { type: String, required: true },
});

// Folder Schema – note that this holds folder details. We assume that the folder remains “unlocked” if its unlockDate has passed and the password was previously verified by the owner.
const FolderSchema = new mongoose.Schema({
  name: String,
  unlockDate: Date,
  passwordHash: String,
  files: [String], // Will store file paths or URLs
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

const User = mongoose.model("User", UserSchema);
const Folder = mongoose.model("Folder", FolderSchema);

// ==================== ADDED: Auth Middleware for JWT =====================
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

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create folder doc in MongoDB
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

// ---------------------- UPLOAD FILES (Multiple) --------------------------
app.post("/upload-files", authMiddleware, upload.array("files"), async (req, res) => {
  try {
    const { folderId, folderName } = req.body; // folderId for existing folder or folderName when creating folder
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    // Check if folder belongs to this user (if folderId is provided)
    let folder;
    if (folderId) {
      folder = await Folder.findById(folderId);
      if (!folder) {
        return res.status(404).json({ error: "Folder not found" });
      }
      if (folder.owner.toString() !== req.userId) {
        return res.status(403).json({ error: "Not authorized to upload to this folder" });
      }
    } else if (folderName) {
      // If folderName is provided, try to find the folder belonging to this user
      folder = await Folder.findOne({ name: folderName, owner: req.userId });
      if (!folder) {
        return res.status(404).json({ error: "Folder not found for given name" });
      }
    } else {
      return res.status(400).json({ error: "Folder identifier not provided" });
    }

    const fileUrls = [];
    // Loop over each file to upload to Supabase
    for (const file of files) {
      // Construct file path, e.g., "folderId/originalfilename"
      const filePath = `${folder._id}/${file.originalname}`;

      // Upload to Supabase
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

      // Build public URL (if your bucket is public)
      const fileUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/${process.env.SUPABASE_BUCKET}/${filePath}`;
      fileUrls.push(fileUrl);

      // Update the folder document with the new file path
      await Folder.findByIdAndUpdate(folder._id, {
        $push: { files: filePath },
      });
    }

    return res.json({ message: "File(s) uploaded successfully!", fileUrls });
  } catch (error) {
    console.error("Error in /upload-files:", error);
    return res.status(500).json({ error: error.message });
  }
});

// ---------------------- ACCESS FOLDER ------------------------
app.post("/access-folder", authMiddleware, async (req, res) => {
  try {
    const { name, password } = req.body;

    // Find the folder by name AND owner
    const folder = await Folder.findOne({ name, owner: req.userId });
    if (!folder) {
      return res.status(404).json({ error: "Folder not found" });
    }

    // Check unlock date
    if (new Date() < new Date(folder.unlockDate)) {
      return res
        .status(403)
        .json({ error: "Folder is locked until " + folder.unlockDate });
    }

    // Validate password
    const isValid = await bcrypt.compare(password, folder.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid password" });
    }

    // Return the folder data or files
    return res.json({ message: "Access granted", files: folder.files });
  } catch (error) {
    console.error("Error in /access-folder:", error);
    return res.status(500).json({ error: error.message });
  }
});

// ---------------------- DELETE FOLDER ------------------------
app.delete("/delete-folder/:folderId", authMiddleware, async (req, res) => {
  try {
    const { folderId } = req.params;

    // Find the folder
    const folder = await Folder.findById(folderId);
    if (!folder) {
      return res.status(404).json({ error: "Folder not found" });
    }

    // Ensure the user owns the folder
    if (folder.owner.toString() !== req.userId) {
      return res.status(403).json({ error: "Not authorized to delete this folder" });
    }

    // Delete files from Supabase storage
    if (folder.files.length > 0) {
      const { error } = await supabase.storage
        .from(process.env.SUPABASE_BUCKET)
        .remove(folder.files);
      
      if (error) {
        console.error("Error deleting files from Supabase:", error);
        return res.status(500).json({ error: "Error deleting files from storage" });
      }
    }

    // Delete folder record from MongoDB
    await Folder.findByIdAndDelete(folderId);

    return res.json({ message: "Folder deleted successfully!" });
  } catch (error) {
    console.error("Error in /delete-folder:", error);
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

// ====================== SHARE ENDPOINTS ======================

// Create share token for a folder. Only the owner can create a share token.
app.post("/share-folder/:folderId", authMiddleware, async (req, res) => {
  try {
    const { folderId } = req.params;
    const folder = await Folder.findById(folderId);
    if (!folder) {
      return res.status(404).json({ error: "Folder not found" });
    }
    // Ensure the user owns the folder
    if (folder.owner.toString() !== req.userId) {
      return res.status(403).json({ error: "Not authorized to share this folder" });
    }
    // Ensure the folder is unlocked (by checking the unlockDate)
    if (new Date() < new Date(folder.unlockDate)) {
      return res.status(403).json({ error: "Folder is still locked" });
    }

    // Generate a share token that expires in 7 days.
    const shareToken = jwt.sign({ folderId: folder._id }, JWT_SECRET, { expiresIn: "7d" });

    return res.json({ message: "Share token generated", shareToken });
  } catch (error) {
    console.error("Error in /share-folder:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Public endpoint: Access folder with a share token. No auth required.
app.get("/public-folder/:shareToken", async (req, res) => {
  try {
    const { shareToken } = req.params;
    let payload;
    try {
      payload = jwt.verify(shareToken, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired share token" });
    }

    const folder = await Folder.findById(payload.folderId);
    if (!folder) {
      return res.status(404).json({ error: "Folder not found" });
    }

    // Here we assume that once shared, the files are public.
    return res.json({ name: folder.name, files: folder.files });
  } catch (error) {
    console.error("Error in /public-folder:", error);
    return res.status(500).json({ error: error.message });
  }
});

// =============================================================
// ======================== START SERVER =======================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

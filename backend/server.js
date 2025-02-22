const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');


dotenv.config();
const app = express();
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3001'
}));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

// Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Folder Schema
const FolderSchema = new mongoose.Schema({
  name: String,
  unlockDate: Date,
  passwordHash: String,
  files: [String], // Store Supabase file URLs
});
const Folder = mongoose.model('Folder', FolderSchema);

// POST /create-folder
app.post('/create-folder', async (req, res) => {
  try {
    const { name, unlockDate, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);

    const folder = new Folder({ name, unlockDate, passwordHash, files: [] });
    await folder.save();

    res.json({ message: 'Folder created successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post('/upload-file', async (req, res) => {
  try {
    const { folderId, fileName, fileContent } = req.body;
    const { data, error } = await supabase.storage
      .from('timed-vault')
      .upload(fileName, fileContent, { upsert: true });

    if (error) return res.status(500).json({ error: error.message });
    
    await Folder.findByIdAndUpdate(folderId, { $push: { files: data.path } });
    res.json({ message: 'File uploaded successfully!', fileUrl: data.path });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /access-folder
app.post('/access-folder', async (req, res) => {
  try {
    const { name, password } = req.body;
    const folder = await Folder.findOne({ name });

    if (!folder) return res.status(404).json({ error: 'Folder not found' });

    if (new Date() < new Date(folder.unlockDate)) {
      return res.status(403).json({ error: 'Folder is locked until ' + folder.unlockDate });
    }

    const isValid = await bcrypt.compare(password, folder.passwordHash);
    if (!isValid) return res.status(401).json({ error: 'Invalid password' });

    // Return folder data or files
    res.json({ message: 'Access granted', files: folder.files });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// GET /folders - Retrieve all folders
app.get('/folders', async (req, res) => {
  try {
    const folders = await Folder.find({}, { __v: 0, passwordHash: 0 });
    // ^ { __v: 0, passwordHash: 0 } excludes unwanted fields from the result
    res.json(folders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Start Server
app.listen(5000, () => console.log('Server running on port 5000'));

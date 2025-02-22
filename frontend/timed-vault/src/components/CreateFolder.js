import { useState, useEffect } from "react";

const CreateFolder = () => {
  // Folder creation states
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [unlockDate, setUnlockDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // State for listing all folders
  const [folders, setFolders] = useState([]);

  // State for accessing (unlocking) a folder
  const [accessError, setAccessError] = useState("");
  const [accessSuccess, setAccessSuccess] = useState("");
  const [files, setFiles] = useState([]);

  // State for uploading files
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

  // ================================
  // 1. Fetch All Folders on Mount
  // ================================
  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const res = await fetch("http://localhost:5000/folders"); // GET request
        if (!res.ok) {
          throw new Error("Failed to fetch folders");
        }
        const data = await res.json();
        setFolders(data);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch folders");
      }
    };

    fetchFolders();
  }, []);

  // Helper to re-fetch folders (after creation or upload)
  const refreshFolders = async () => {
    try {
      const res = await fetch("http://localhost:5000/folders");
      if (!res.ok) {
        throw new Error("Failed to fetch folders");
      }
      const data = await res.json();
      setFolders(data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch folders");
    }
  };

  // ================================
  // 2. Create a New Folder
  // ================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name || !password || !unlockDate) {
      setError("Please fill out all fields.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/create-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password, unlockDate }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      setSuccess(data.message || "Folder created successfully!");

      // Clear input fields
      setName("");
      setPassword("");
      setUnlockDate("");

      // Re-fetch the folders to update the list
      await refreshFolders();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ================================
  // 3. Access (Unlock) a Folder
  // ================================
  const handleAccessFolder = async (folderName) => {
    // Prompt for password (simple approach)
    const inputPassword = prompt(`Enter password for folder "${folderName}":`);
    if (!inputPassword) return; // User cancelled

    setAccessError("");
    setAccessSuccess("");
    setFiles([]);

    try {
      const response = await fetch("http://localhost:5000/access-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: folderName, password: inputPassword }),
      });

      const data = await response.json();
      if (!response.ok) {
        // e.g. { error: "Folder is locked until ..." } or "Invalid password"
        throw new Error(data.error || "Unable to access folder.");
      }

      // If successful: { message: "Access granted", files: [...] }
      setAccessSuccess(data.message || "Access granted!");
      setFiles(data.files || []);
    } catch (err) {
      setAccessError(err.message);
    }
  };

  // ================================
  // 4. Upload File to a Folder
  // ================================
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    try {
      if (!selectedFolderId || !selectedFile) {
        setUploadError("Please select a folder and a file.");
        return;
      }

      setUploadError("");
      setUploadSuccess("");

      // Convert the file to base64
      const base64String = await fileToBase64(selectedFile);
      const fileName = selectedFile.name; // e.g. "image.png"

      // Send POST request to /upload-file
      const response = await fetch("http://localhost:5000/upload-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderId: selectedFolderId,
          fileName,
          fileContent: base64String,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to upload file");
      }

      setUploadSuccess(data.message || "File uploaded successfully!");
      // Optionally refresh folder list to see updated files
      await refreshFolders();
    } catch (err) {
      setUploadError(err.message);
    }
  };

  // Utility function to convert File -> base64 string
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result); // e.g. "data:image/png;base64,iVBOR..."
      reader.onerror = (error) => reject(error);
    });
  };

  // ================================
  // Render
  // ================================
  return (
    <div className="p-4 max-w-md mx-auto bg-gray-100 rounded-lg shadow-md">
      {/* ================= CREATE FOLDER SECTION ================= */}
      <h2 className="text-xl font-bold mb-4">Create a Folder</h2>
      {error && <p className="text-red-500 mb-2">{error}</p>}
      {success && <p className="text-green-500 mb-2">{success}</p>}

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Folder Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 w-full mb-2"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 w-full mb-2"
        />
        <input
          type="datetime-local"
          value={unlockDate}
          onChange={(e) => setUnlockDate(e.target.value)}
          className="border p-2 w-full mb-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-500 text-white p-2 rounded w-full"
        >
          {loading ? "Creating..." : "Create Folder"}
        </button>
      </form>

      {/* ================= CAPSULES / FOLDER LIST ================= */}
      <div className="mt-6">
        <h2 className="text-xl font-bold mb-2">Capsules</h2>
        {folders.length === 0 ? (
          <p>No folders created yet.</p>
        ) : (
          <ul className="list-disc list-inside">
            {folders.map((folder) => (
              <li key={folder._id} className="mb-2">
                <strong>{folder.name}</strong> – Unlock Date:{" "}
                {new Date(folder.unlockDate).toLocaleString()}
                {/* Access button */}
                <button
                  onClick={() => handleAccessFolder(folder.name)}
                  className="ml-2 bg-green-500 text-white p-1 rounded"
                >
                  Access
                </button>
                {/* Show existing files (if any) */}
                {folder.files && folder.files.length > 0 && (
                  <ul className="list-disc list-inside mt-1 ml-4">
                    {folder.files.map((filePath, idx) => (
                      <li key={idx}>
                        {/* 
                          If your bucket is public, you can link directly to the file like:
                          https://YOUR_SUPABASE_URL/storage/v1/object/public/timed-vault/<filePath> 
                        */}
                        <a
                          href={`https://YOUR_SUPABASE_URL/storage/v1/object/public/timed-vault/${filePath}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 underline"
                        >
                          {filePath}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ================= ACCESS FOLDER RESULT ================= */}
      {accessError && (
        <p className="text-red-500 mt-4">
          <strong>Access Error: </strong> {accessError}
        </p>
      )}
      {accessSuccess && (
        <div className="text-green-500 mt-4">
          <p>{accessSuccess}</p>
          {/* If the server returns files */}
          {files.length > 0 && (
            <div className="mt-2">
              <h3 className="font-bold mb-1">Files:</h3>
              <ul className="list-disc list-inside">
                {files.map((file, index) => (
                  <li key={index}>{file}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ================= UPLOAD FILE SECTION ================= */}
      <div className="mt-6">
        <h2 className="text-xl font-bold mb-2">Upload File to Folder</h2>
        {uploadError && <p className="text-red-500 mb-2">{uploadError}</p>}
        {uploadSuccess && <p className="text-green-500 mb-2">{uploadSuccess}</p>}

        <label className="block mb-2">Select Folder:</label>
        <select
          value={selectedFolderId}
          onChange={(e) => setSelectedFolderId(e.target.value)}
          className="border p-2 w-full mb-2"
        >
          <option value="">--Choose a folder--</option>
          {folders.map((folder) => (
            <option key={folder._id} value={folder._id}>
              {folder.name}
            </option>
          ))}
        </select>

        <label className="block mb-2">Select File:</label>
        <input
          type="file"
          onChange={handleFileChange}
          className="border p-2 w-full mb-2"
        />

        <button
          onClick={handleUpload}
          className="bg-purple-500 text-white p-2 rounded w-full"
        >
          Upload File
        </button>
      </div>
    </div>
  );
};

export default CreateFolder;

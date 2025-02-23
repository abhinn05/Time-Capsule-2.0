// src/components/CreateFolder.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const CreateFolder = () => {
  const navigate = useNavigate();

  // ================================
  // 1. State for folder creation
  // ================================
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [unlockDate, setUnlockDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ================================
  // 2. State for listing all folders
  // ================================
  const [folders, setFolders] = useState([]);

  // ================================
  // 3. State for accessing (unlocking) a folder
  // ================================
  const [accessError, setAccessError] = useState("");
  const [accessSuccess, setAccessSuccess] = useState("");
  const [files, setFiles] = useState([]);

  // Track unlocked folder name (optional, if you only show the last accessed folder’s files)
  const [unlockedFolder, setUnlockedFolder] = useState("");

  // ================================
  // 4. State for uploading files
  // ================================
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

  // ================================
  // Supabase project info (update these)
  // ================================
  const SUPABASE_PROJECT_URL = "https://cwwkszeiocmoletqdeqd.supabase.co"; // <-- Replace with your actual Supabase project URL
  const BUCKET_NAME = "timed-vault"; // <-- Replace if your bucket is named differently

  // Helper to get token
  const getToken = () => localStorage.getItem("token");

  // ================================
  // Fetch all folders on mount
  // ================================
  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const res = await fetch("http://localhost:5000/folders", {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        });
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
      const res = await fetch("http://localhost:5000/folders", {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
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
  // Create a new folder
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
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
  // Access (unlock) a folder
  // ================================
  const handleAccessFolder = async (folderName, folderUnlockDate) => {
    const inputPassword = prompt(`Enter password for folder "${folderName}":`);
    if (!inputPassword) return; // User cancelled

    setAccessError("");
    setAccessSuccess("");
    setFiles([]);
    setUnlockedFolder("");

    try {
      const response = await fetch("http://localhost:5000/access-folder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ name: folderName, password: inputPassword }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to access folder.");
      }

      const currentDate = new Date();
      const unlockDateObj = new Date(folderUnlockDate);

      if (currentDate >= unlockDateObj) {
        // If successful, set unlocked folder
        setUnlockedFolder(folderName);
        setAccessSuccess(data.message || "Access granted!");
        setFiles(data.files || []);
      } else {
        throw new Error(
          "Folder is locked until " + unlockDateObj.toLocaleString()
        );
      }
    } catch (err) {
      setAccessError(err.message);
    }
  };

  // ================================
  // Upload file to a folder
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

      // Use FormData to match Multer's expectations
      const formData = new FormData();
      formData.append("folderId", selectedFolderId);
      formData.append("file", selectedFile);

      const response = await fetch("http://localhost:5000/upload-file", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
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

  // ================================
  // Logout Handler
  // ================================
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  // ================================
  // Render
  // ================================
  return (
    <div className="p-4 max-w-md mx-auto bg-gray-100 rounded-lg shadow-md">
      {/* Logout button */}
      <div className="text-right mb-4">
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white p-2 rounded"
        >
          Logout
        </button>
      </div>

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
            {folders.map((folder) => {
              return (
                <li key={folder._id} className="mb-2">
                  <strong>{folder.name}</strong> – Unlock Date:{" "}
                  {new Date(folder.unlockDate).toLocaleString()}
                  <button
                    onClick={() =>
                      handleAccessFolder(folder.name, folder.unlockDate)
                    }
                    className="ml-2 bg-green-500 text-white p-1 rounded"
                  >
                    Access
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ================= ACCESS FOLDER RESULT & FILES ================= */}
      {accessError && (
        <p className="text-red-500 mt-4">
          <strong>Access Error: </strong> {accessError}
        </p>
      )}
      {accessSuccess && (
        <div className="text-green-500 mt-4">
          <p>{accessSuccess}</p>
          {/* Only show files here once folder is unlocked */}
          {files.length > 0 && (
            <div className="mt-2">
              <h3 className="font-bold mb-1">Files:</h3>
              <ul className="list-disc list-inside">
                {files.map((file, index) => {
                  const imageUrl = `${SUPABASE_PROJECT_URL}/storage/v1/object/public/${BUCKET_NAME}/${file}`;
                  return (
                    <li key={index} className="my-2">
                      {/* Instead of linking to the file, show it as an image */}
                      <img
                        src={imageUrl}
                        alt={file}
                        style={{ maxWidth: "200px", display: "block" }}
                      />
                    </li>
                  );
                })}
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

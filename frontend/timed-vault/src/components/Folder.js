import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Folder.css";

const Folder = () => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [unlockDate, setUnlockDate] = useState("");
  const [createFolderFiles, setCreateFolderFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const getToken = () => localStorage.getItem("token");

  const handleCreateFolderFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setCreateFolderFiles(Array.from(e.target.files));
    }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name || !password || !unlockDate) {
      setError("Please fill out all fields.");
      return;
    }

    setLoading(true);

    try {
      // 1) Create the folder
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

      // 2) If user selected files, upload them
      if (createFolderFiles.length > 0) {
        const formData = new FormData();
        formData.append("folderName", name);
        createFolderFiles.forEach((file) => {
          formData.append("files", file);
        });

        const uploadRes = await fetch("http://localhost:5000/upload-files", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || "Failed to upload file(s).");
        }
      }

      setSuccess("Capsule created successfully!");
      setName("");
      setPassword("");
      setUnlockDate("");
      setCreateFolderFiles([]);

      // Optionally redirect to /capsules
      // navigate("/capsules");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/Home");
  };

  return (
    <div className="folder-container">
      <div className="folder-header">
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
        <button onClick={() => navigate("/capsules")} className="capsules-btn">
          Capsules
        </button>
      </div>

      <h2>Create a Capsule</h2>
      {error && <p className="error-text">{error}</p>}
      {success && <p className="success-text">{success}</p>}

      <form onSubmit={handleCreateFolder} className="create-folder-form">
        <input
          type="text"
          placeholder="Capsule Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="form-input"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="form-input"
        />
        <input
          type="datetime-local"
          value={unlockDate}
          onChange={(e) => setUnlockDate(e.target.value)}
          className="form-input"
        />

        {/* Custom File Upload Box */}
        <label htmlFor="file-upload" className="file-upload-box">
          {createFolderFiles.length > 0
            ? `${createFolderFiles.length} file(s) selected`
            : "Upload Files"}
        </label>
        <input
          id="file-upload"
          type="file"
          multiple
          onChange={handleCreateFolderFileChange}
          className="file-input"
        />

        <button type="submit" disabled={loading} className="primary-btn">
          {loading ? "Creating..." : "Create Capsule"}
        </button>
      </form>
    </div>
  );
};

export default Folder;

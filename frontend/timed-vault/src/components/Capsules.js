// src/components/Capsules.js
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Capsules.css";

const Capsules = () => {
  const navigate = useNavigate();

  const [folders, setFolders] = useState([]);
  const [error, setError] = useState("");
  const [accessError, setAccessError] = useState("");
  const [accessSuccess, setAccessSuccess] = useState("");
  const [files, setFiles] = useState([]);
  const [unlockedFolder, setUnlockedFolder] = useState("");
  const [wobbleFolderId, setWobbleFolderId] = useState(null);
  const [uploadMessages, setUploadMessages] = useState({});

  const SUPABASE_PROJECT_URL = "https://cwwkszeiocmoletqdeqd.supabase.co";
  const BUCKET_NAME = "timed-vault";

  const getToken = () => localStorage.getItem("token");

  // Fetch folders from the server
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

  useEffect(() => {
    fetchFolders();
  }, []);

  const refreshFolders = async () => {
    await fetchFolders();
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/Home");
  };

  // Navigate to create-folder page
  const handleCreateFolderClick = () => {
    navigate("/folder");
  };

  // Handle unlocking folder (asking for password) when folder box is clicked
  const handleFolderClick = async (folder) => {
    setAccessError("");
    setAccessSuccess("");
    setFiles([]);
    setUnlockedFolder("");

    const currentDate = new Date();
    const unlockDateObj = new Date(folder.unlockDate);

    // If folder is locked (current date < unlock date)
    if (currentDate < unlockDateObj) {
      setWobbleFolderId(folder._id);
      alert("The unlock date hasn't come yet!");
      return;
    }

    const inputPassword = prompt(`Enter password for folder "${folder.name}":`);
    if (!inputPassword) return;

    try {
      const response = await fetch("http://localhost:5000/access-folder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ name: folder.name, password: inputPassword }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to access folder.");
      }

      setUnlockedFolder(folder.name);
      // Change the message to "Access Granted" (capital G)
      setAccessSuccess("Access Granted");
      setFiles(data.files || []);
    } catch (err) {
      setAccessError(err.message);
    }
  };

  // Handle file selection -> immediate upload
  const handleFilesChange = async (folderId, e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);

      const formData = new FormData();
      formData.append("folderId", folderId);
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });

      try {
        const response = await fetch("http://localhost:5000/upload-files", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
          body: formData,
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to upload file(s)");
        }

        alert("Files uploaded successfully! 😊");

        setUploadMessages((prev) => ({
          ...prev,
          [folderId]: { error: "" },
        }));

        await refreshFolders();
      } catch (err) {
        setUploadMessages((prev) => ({
          ...prev,
          [folderId]: { error: err.message },
        }));
      }
    }
  };

  // Show the unlock date in an alert pop-up
  const handleUnlockDateClick = (unlockDate, e) => {
    e.stopPropagation();
    const unlockDateObj = new Date(unlockDate);
    alert(`Unlock Date: ${unlockDateObj.toLocaleString()}`);
  };

  // Delete folder with a final warning
  const handleDeleteFolder = async (folderId, e) => {
    e.stopPropagation();
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this folder? This action cannot be undone!"
    );
    if (!confirmDelete) return;

    try {
      const response = await fetch(`http://localhost:5000/delete-folder/${folderId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete folder.");
      }

      alert("Folder deleted successfully!");
      await refreshFolders();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Handle sharing of a folder (unlocked)
  const handleShareFolder = async (folderId, e) => {
    e.stopPropagation();
    try {
      const response = await fetch(`http://localhost:5000/share-folder/${folderId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate share link.");
      }
      // Build share URL (adjust host as needed)
      const shareUrl = `${window.location.origin}/share/${data.shareToken}`;
      // For demo, simply alert it. You may wish to copy to clipboard instead.
      alert(`Share this link: ${shareUrl}`);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="capsules-container">
      <div className="capsules-header">
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
        <button onClick={handleCreateFolderClick} className="create-folder-btn">
          Create Capsule
        </button>
      </div>

      <h2 className="your">Your Capsules</h2>
      {error && <p className="error-text">{error}</p>}

      {folders.length === 0 ? (
        <p className="no">No Capsules Created yet.</p>
      ) : (
        <div className="folder-list">
          {folders.map((folder) => {
            const currentDate = new Date();
            const unlockDateObj = new Date(folder.unlockDate);
            const isLocked = currentDate < unlockDateObj;
            const folderMessage = uploadMessages[folder._id] || {};

            return (
              <div
                key={folder._id}
                className={`folder-box ${wobbleFolderId === folder._id ? "wobble" : ""}`}
                onClick={() => handleFolderClick(folder)}
                onAnimationEnd={() => setWobbleFolderId(null)}
              >
                <div className="box-name">
                  <strong>{folder.name}</strong>
                  {isLocked && <div className="lock-icon">🔒</div>}
                </div>

                {isLocked ? (
                  <div className="folder-upload-section locked-folder">
                    {folderMessage.error && (
                      <p className="error-text">{folderMessage.error}</p>
                    )}
                    <input
                      type="file"
                      multiple
                      onChange={(e) => handleFilesChange(folder._id, e)}
                      className="form-input"
                      style={{ display: "none" }}
                      id={`file-input-${folder._id}`}
                    />
                    <div className="locked-row">
                      <p
                        className="upload-text"
                        onClick={(e) => {
                          e.stopPropagation();
                          document.getElementById(`file-input-${folder._id}`).click();
                        }}
                      >
                        Upload
                      </p>
                      <p
                        className="unlock-date-text"
                        onClick={(e) => handleUnlockDateClick(folder.unlockDate, e)}
                      >
                        Unlock Date
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="folder-upload-section unlocked-folder">
                    {folderMessage.error && (
                      <p className="error-text">{folderMessage.error}</p>
                    )}
                    <input
                      type="file"
                      multiple
                      onChange={(e) => handleFilesChange(folder._id, e)}
                      className="form-input"
                      style={{ display: "none" }}
                      id={`file-input-${folder._id}`}
                    />
                    <p
                      className="upload-text upload-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        document.getElementById(`file-input-${folder._id}`).click();
                      }}
                    >
                      Upload
                    </p>
                    <p
                      className="delete-text"
                      onClick={(e) => handleDeleteFolder(folder._id, e)}
                    >
                      Delete
                    </p>
                    <p
                      className="share-text"
                      onClick={(e) => handleShareFolder(folder._id, e)}
                    >
                      Share
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Show access granted and files below the folder list */}
      {accessSuccess && (
        <div className="success-text" style={{ marginTop: "20px" }}>
          <p>{accessSuccess}</p>
          {files.length > 0 && (
            <div className="files-section">
              <h3>Files in {unlockedFolder}:</h3>
              <ul className="oops">
                {files.map((file, index) => {
                    const imageUrl = `${SUPABASE_PROJECT_URL}/storage/v1/object/public/${BUCKET_NAME}/${file}`;
                    return (
                    <li key={index} className="file-item">
                        <a href={imageUrl} download target="_blank" rel="noreferrer">
                        <img src={imageUrl} alt={file} className="file-image" />
                        </a>
                    </li>
                    );
                })}
                </ul>

            </div>
          )}
        </div>
      )}

      {accessError && (
        <p className="error-text">
          <strong>Access Error: </strong> {accessError}
        </p>
      )}
    </div>
  );
};

export default Capsules;

import { useState } from "react";

const AccessFolder = () => {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [files, setFiles] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setFiles([]);

    if (!name || !password) {
      setError("Please fill out both fields.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/access-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to access folder.");
      }

      // data might have: { message: 'Access granted', files: [...] }
      setSuccess(data.message || "Access granted!");
      setFiles(data.files || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto bg-gray-100 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Access a Folder</h2>
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
        <button
          type="submit"
          disabled={loading}
          className="bg-green-500 text-white p-2 rounded w-full"
        >
          {loading ? "Accessing..." : "Access Folder"}
        </button>
      </form>
      {files.length > 0 && (
        <div className="mt-4">
          <h3 className="font-bold mb-2">Files:</h3>
          <ul className="list-disc list-inside">
            {files.map((file, index) => (
              <li key={index}>{file}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AccessFolder;

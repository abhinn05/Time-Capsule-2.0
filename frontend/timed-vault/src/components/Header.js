// src/components/Header.jsx
import { Link, useNavigate } from "react-router-dom";

function Header() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <header style={{ display: "flex", gap: "10px" }}>
      <button onClick={() => navigate("/create-folder")}>Create Folder</button>
      <button onClick={() => navigate("/capsules")}>Capsules</button>
      <button onClick={handleLogout}>Logout</button>
    </header>
  );
}

export default Header;

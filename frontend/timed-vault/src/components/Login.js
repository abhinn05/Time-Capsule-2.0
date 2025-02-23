import { useState } from "react";
import { useNavigate, Link } from "react-router-dom"; // Import Link from react-router-dom
import "./Login.css";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      localStorage.setItem("token", data.token);
      navigate("/Home"); // or wherever you want to send the user
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="okay">
      <div className="login-container">
        <h2 className="ok">Login</h2>
        {error && <p className="error-text">{error}</p>}

        <form onSubmit={handleLogin} className="login-form">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="form-input"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input"
          />
          <button type="submit" className="primary-btn">
            Login
          </button>
        </form>

        <div className="register-redirect">
          <p>Don’t have an account? <Link to="/register" className="register-link">
            Register Here
          </Link></p>
          {/* Use a <Link> to go to /register */}
          
        </div>
      </div>
    </div>
  );
};

export default Login;

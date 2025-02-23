// src/components/Register.js
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Register.css";

const Register = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const res = await fetch("http://localhost:5000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      setSuccess("User registered successfully!");
      // Optionally redirect to /login after successful registration:
      navigate("/login");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="okay">
      <div className="register-container">
        <h2 className="ok">Register</h2>
        {error && <p className="error-text">{error}</p>}
        {success && <p className="success-text">{success}</p>}

        <form onSubmit={handleRegister} className="register-form">
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
            Register
          </button>
        </form>

        <div className="login-redirect">
          <p>Already a user? <Link to="/login" className="login-link">
            Login
          </Link></p>
          {/* Use a <Link> to go to /login */}
          
        </div>
      </div>
    </div>
  );
};

export default Register;

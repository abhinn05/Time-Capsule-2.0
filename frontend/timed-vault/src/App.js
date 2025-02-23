import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Home from "./components/Home";
import Login from "./components/Login";
import Register from "./components/Register";
import Folder from "./components/Folder";
import Capsules from "./components/Capsules";
import About from "./components/About";
import Contact from "./components/Contact";

function App() {
  return (
    <Router>
      <Routes>
        {/* Default route: Redirect to home */}
        <Route path="/" element={<RequireAuthRedirect />} />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />

        {/* Protected routes */}
        <Route
          path="/home"
          element={
            <RequireAuth>
              <Home />
            </RequireAuth>
          }
        />
        <Route
          path="/folder"
          element={
            <RequireAuth>
              <Folder />
            </RequireAuth>
          }
        />
        <Route
          path="/capsules"
          element={
            <RequireAuth>
              <Capsules />
            </RequireAuth>
          }
        />

        {/* Catch-all route */}
        <Route path="*" element={<RequireAuthRedirect />} />
      </Routes>
    </Router>
  );
}

// HOC for authentication
function RequireAuth({ children }) {
  const token = localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Redirect users based on authentication status
function RequireAuthRedirect() {
  const token = localStorage.getItem("token");
  return token ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />;
}

export default App;

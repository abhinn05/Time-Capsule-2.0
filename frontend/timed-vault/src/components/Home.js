import React from "react";
import { useNavigate } from "react-router-dom";
import "../components/Home.css";

const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div className="landing-container">
            {/* ✅ Navigation Bar at the Top-Right */}
            <div className="navbar">
                <button className="nav-button" onClick={() => navigate("/About")}>About Us</button>
                <button className="nav-button" onClick={() => navigate("/Contact")}>Contact Us</button>
            </div>

            {/* ✅ Welcome Text & Dashboard Button */}
            <div className="landing-content">
                <h1 className="landing-heading">Welcome to TimeCapsule</h1>
                <p className ="about-website">  TimeCapsule lets you store, organize 
                    photos, videos, and notes in encrypted digital capsules which you can share and unlock them in the future together,
                    and relive your cherished memories. 
                </p>
                <button className="dashboard-button" onClick={() => navigate("/Capsules")}>
                    Your Capsules
                </button>
            </div>
        </div>
    );
};

export default LandingPage;

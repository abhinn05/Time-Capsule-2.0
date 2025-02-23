import React from 'react';
import './About.css';
import backgroundImage from "../components/backgrounds/login.jpg";

const About = () => {
  return (
    <div className="about-container"
    style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <h1 className="about-title">About Us</h1>
      <p className="about-text">
        TimeCapsule is a digital platform designed to store and preserve your 
        cherished memories. Whether it's photos, videos, or notes, our system ensures 
        your memories stay safe for years to come. Unlock the capsules in future and cherish them 
        together with your loved ones.
      </p>
    </div>
  );
};

export default About;

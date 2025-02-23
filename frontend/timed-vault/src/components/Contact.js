import React from 'react';
import './Contact.css';
import backgroundImage from "../components/backgrounds/login.jpg";


const Contact = () => {
  return (
    <div className="contact-container"
       style={{ backgroundImage: `url(${backgroundImage})` }}
       >
      <h1 className="contact-title">Contact Us</h1>
      <p className="contact-text">
        Got some questions?
        </p>
        <p>
             Get in touch with us at  
        <span className="text-blue-400"> Time@Capsules.mail </span> <br></br> or follow us on social media at @TimeCapsules
      </p>
    </div>
  );
};

export default Contact;

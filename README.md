# Time-Capsule-2.0

## Overview
Timed Vault is a web application that provides a secure and time-based access system. This project consists of a backend server and a frontend interface.

## Prerequisites
Ensure you have the following installed on your system:
- [Node.js](https://nodejs.org/)
- [npm](https://www.npmjs.com/)
- [VS Code](https://code.visualstudio.com/) or any preferred code editor

## Installation & Setup
Follow these steps to set up and run the project:

### 1. Clone the Repository
```sh
git clone https://github.com/your-username/timed-vault.git
cd timed-vault
```

### 2. Open the Folder in VS Code
```sh
code .
```

### 3. Open a Split Terminal

#### Terminal 1: Backend Setup
```sh
cd backend
npm install
node server.js
```

#### Terminal 2: Frontend Setup
```sh
cd frontend
npm install
cd timed-vault
npm install
npm start
```
## Environment Variables
Create a `.env` file in the root directory and configure the following:
```
MONGO_URI=your_mongodb_connection_string
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
JWT_SECRET=your_jwt_secret
```

## Running the Application
Once all steps are completed, the website will be running on `http://localhost:3000/` (or another port if specified).


## Features
- **Frontend (Client-Side)**
  - Built with React
  - Handles user interactions and displays data
  - Communicates with the backend via WebSockets

- **Backend (Server-Side)**
  - Developed using Node.js with Express
  - Uses MongoDB for data storage
  - Uses Supabase for media handling
  - Uses JWT for authentication

## Deployment
- Hosted locally for testing and development.



## Contributing
Feel free to fork this repository, submit issues, or open pull requests to contribute.

## License
This project is licensed under the MIT License.

---
Made with ❤️ by KrackHackers




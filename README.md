# Usama Javed - 3D Portfolio Website

This is a comprehensive 3D portfolio website highlighting Usama Javed's work as a filmmaker, visual storyteller, and cinematographer. It features an interactive 3D frontend using Three.js and a robust backend utilizing Node.js, Express, and MongoDB.

## Technology Stack

**Frontend:**
- HTML, CSS, JavaScript
- Three.js (for 3D rendering and animations)
- Vite (Frontend tooling and bundler)

**Backend:**
- Node.js & Express.js (RESTful API)
- MongoDB (Database)
- Mongoose (Object Data Modeling)
- CORS & Dotenv

## Installation & Local Setup

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed, as well as access to a local or cloud MongoDB instance (e.g., MongoDB Atlas).

### 1. Backend Setup
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Ensure the `.env` file in the `backend` directory contains:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/portfolio
   ```
   *(Update `MONGODB_URI` if you are using MongoDB Atlas).*
4. Start the backend server:
   ```bash
   npm run dev
   ```
   *The server will run on http://localhost:5000.*

### 2. Frontend Setup
1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npx vite
   ```
   *The frontend will run on the local port provided in the terminal (usually http://localhost:5173).*

## Deployment Guidelines

To make this site live, you should deploy the frontend and backend separately. 

### Backend Deployment (e.g., Heroku or Render)
1. Ensure your MongoDB instance is hosted on the cloud (like [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)).
2. Push your `backend` folder to a new GitHub repository.
3. Link the repository to a hosting provider like **Render** or **Heroku**.
4. Set the Environment Variables (`PORT` and `MONGODB_URI`) on the hosting provider's dashboard.
5. Deploy the application. You will get a live URL (e.g., `https://usama-backend.onrender.com`).
6. **Important:** Update the `API_URL` variable in `frontend/main.js` from `http://localhost:5000/api` to your new live backend URL.

### Frontend Deployment (e.g., Netlify or Vercel)
1. In the `frontend` folder, build the project:
   ```bash
   npm run build
   ```
2. This creates a `dist` folder. You can deploy this frontend by dragging and dropping the `dist` folder onto **Netlify** or **Vercel**, or by connecting your frontend GitHub repo to the platform.
3. If connecting to a repository via Vercel/Netlify, set the build command to `npm run build` and the output directory to `dist`.
4. Your website is now live!

## 3D Elements Overview
- The website uses **Three.js** to render an interactive 3D Torus Knot running in the background.
- It is tied to the window's scroll event; as the user scrolls, the 3D element rotates and translates, ensuring an engaging user experience without overwhelming the aesthetic reading design of the portfolio content.

## Features
- **3D Interactive Background**: Immersive design highlighting creativity.
- **RESTful Backend APIs**: API routes configured to fetch dynamic project listings and accept contact form submissions.
- **Responsive Layout**: Designed specifically for cross-device compatibility.

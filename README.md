<div> 
  <h1> SecureVote</h1>
  <p>A secure, modern, and user-friendly online voting system built with the MERN stack.</p>
</div>

<br />

## Live Demo
**Check out the live application:** [SecureVote Live](https://online-voting-system-live.vercel.app/)

---

## Features

- **Secure Authentication:** JWT-based user authentication and authorization.
- **Role-Based Access:** Distinct roles for Voters and Administrators.
- **Real-Time Results:** View election progress and results dynamically.
- **Tamper-Evident:** Vote receipts and security measures to ensure election integrity.
- **Responsive UI:** Modern, accessible, and responsive design powered by React and Tailwind CSS.

---

## Tech Stack

**Frontend:**
- React 19 (Vite)
- Tailwind CSS v4
- React Router DOM
- Axios
- Recharts (for data visualization)

**Backend:**
- Node.js & Express
- MongoDB (Mongoose)
- JSON Web Tokens (JWT)
- Bcryptjs for password hashing

---

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Ensure you have the following installed on your local machine:
- [Node.js](https://nodejs.org/)
- [npm](https://www.npmjs.com/) or yarn
- [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas cluster URI)

### 1. Clone the repository

```bash
git clone https://github.com/Sanyam2511/online-voting-system.git
cd online-voting-system
```

### 2. Setup the Backend

Open a new terminal window and navigate to the backend directory:

```bash
cd backend
```

Install the required dependencies:
```bash
npm install
```

Create a `.env` file in the `backend` directory and configure your environment variables:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
# Add any other required environment variables here
```

Start the backend development server:
```bash
npm run dev
```
*(The backend should now be running, typically on port 5000)*

### 3. Setup the Frontend

Open another terminal window and navigate to the frontend directory:

```bash
cd frontend
```

Install the required dependencies:
```bash
npm install
```

Start the frontend development server:
```bash
npm run dev
```

### 4. Open the Application

Once both servers are running, open your web browser and visit:
- **Frontend App:** [http://localhost:5173](http://localhost:5173) (Vite default port)

---

## Project Structure

```text
online-voting-system/
├── backend/          # Express REST API, Database Models, Controllers & Routes
└── frontend/         # React Application, UI Components, Context & Views
```

---

## License

This project is licensed under the MIT License.

# User Management System

A full-stack user management application with authentication, user analytics, and data visualization features.

## Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: SQLite (better-sqlite3)
- **Authentication**: bcrypt for password hashing
- **Serialization**: Protocol Buffers (protobufjs)
- **Security**: express-rate-limit, CORS
- **Environment**: dotenv

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Charts**: Recharts
- **Notifications**: react-hot-toast
- **Serialization**: Protocol Buffers (protobufjs)

## Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

## Setup & Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd QT_test_all
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory

```env
PORT=3000
NODE_ENV=development
DB_PATH=./data/database.sqlite

# Initial Admin Credentials
ADMIN_EMAIL=admin2025@gmail.com
ADMIN_PASSWORD=Admin@2025!

CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:5173
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

Create a `.env.local` file in the `frontend` directory

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## Running the Application

### Start the Backend Server

```bash
cd backend
npm run dev
```

The backend API will be available at `http://localhost:3000`

Alternative commands:
- `npm start` - Run in production mode
- `npm run seed` - Seed the database with initial data

### Start the Frontend Development Server

```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:3001` (or `http://localhost:3000` if port 3000 is not in use)

### Login Credentials

Use the admin credentials defined in the backend `.env` file:
- **Email**: `admin2025@gmail.com`
- **Password**: `Admin@2025!`


## API Endpoints

The backend provides the following API endpoints under the `/api` prefix. All requests require **Basic Authentication**. Include your credentials in the request header in the format:email@example.com:password123

### Available Endpoints

- `GET /api/users/export`  
  Exports all users in `.proto` format.
- `POST /api/users`  Creates a new user.
- Additional endpoints can be found in the `backend/src/routes/` directory.


2. **Database**: The SQLite database is automatically created when the backend starts for the first time. If you need to reset the database, delete the `backend/data/database.sqlite` file.

3. **Port Configuration**:
   - Backend runs on port 3000 by default
   - Frontend typically runs on port 3001 (Next.js auto-increments if 3000 is taken)
   - Ensure both ports are available or modify the configuration accordingly

4. **Admin User**: An admin user is created automatically on first run using the credentials from the `.env` file.

# QT_test_all

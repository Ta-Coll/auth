# Napkin Auth System

MEAN stack authentication. 
Features user registration, login, JWT authentication, and a super admin panel for user management.

## Project Structure

```
.
├── backend/          # Express + Node.js + MongoDB backend
│   ├── src/
│   │   ├── config/      # Database configuration
│   │   ├── middleware/  # Auth and validation middleware
│   │   ├── models/      # User model
│   │   ├── routes/      # API routes (auth, admin)
│   │   ├── types/       # TypeScript interfaces
│   │   ├── utils/       # JWT utilities
│   │   ├── scripts/     # Utility scripts (create-superadmin)
│   │   ├── app.ts       # Express app
│   │   ├── index.ts     # Server entry
│   │   └── lambda.ts    # Lambda handler
│   └── package.json
│
└── frontend/        # Angular frontend
    ├── src/
    │   ├── app/
    │   │   ├── components/  # Signup, Login, Dashboard, Superadmin
    │   │   ├── services/    # Auth and Admin services
    │   │   ├── guards/     # Route guards
    │   │   └── ...
    └── package.json
```

## Prerequisites

- Node.js 24.11.1
- npm
- MongoDB Atlas account (or local MongoDB)


## Setup Instructions

### 1. Backend Setup

Navigate to the backend directory:
```bash
cd backend
```

Install dependencies:
```bash
npm install
```

Create `.env` file in the `backend/` directory:
```env
MONGODB_URI=your-mongodb-connection-string
DB_NAME=napkinevents
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:4200
```

Create super admin user:
```bash
npm run create-superadmin
```

This will create a super admin with default credentials:
- Email: `admin@napkin.com`
- Username: `superadmin`
- Password: `Admin123!`

### 2. Frontend Setup

Navigate to the frontend directory:
```bash
cd frontend
```

Install dependencies:
```bash
npm install
```

## Running the Project

### Development Mode

**Backend:**
```bash
cd backend
npm run dev
```
Server will start on `http://localhost:3000`

**Frontend:**
```bash
cd frontend
npm start
```
Application will start on `http://localhost:4200`

## API Endpoints

### Authentication

#### POST /api/auth/signup
Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe",
  "timeZone": "America/New_York"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "token": "jwt-token-here",
    "user": {
      "uid": "user-uuid",
      "email": "user@example.com",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "emailVerified": false,
      "role": "registered"
    }
  }
}
```

#### POST /api/auth/login
Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

#### POST /api/auth/validate-email
Validate user email.

**Request:**
```json
{
  "email": "user@example.com",
  "verified": true
}
```

#### GET /api/auth/me
Get current authenticated user (requires Bearer token).

**Headers:**
```
Authorization: Bearer <token>
```

### Admin Endpoints (Super Admin Only)

#### GET /api/admin/users
Get paginated list of all users.

**Query Parameters:**
- `page` (optional, default: 1)
- `limit` (optional, default: 20)

**Headers:**
```
Authorization: Bearer <super-admin-token>
```

#### PATCH /api/admin/users/:uid/role
Update user role.

**Request:**
```json
{
  "role": "registered" | "anonymous" | "superadmin"
}
```

**Headers:**
```
Authorization: Bearer <super-admin-token>
```

## User Roles

- **anonymous**: Only has front-end token (Google OAuth)
- **registered**: Provided matching credentials (email validated: T/F)
- **superadmin**: Full system access, can manage all users and roles

## Features

- ✅ User registration with email, username, password
- ✅ User login with JWT bearer token
- ✅ Email validation endpoint
- ✅ Role-based authorization
- ✅ Super admin panel for user management
- ✅ MongoDB integration with automatic collection/index creation
- ✅ Lambda-ready structure
- ✅ TypeScript with well-structured codebase
- ✅ Route guards and navigation protection
- ✅ Clean browser history management

## Default Super Admin Credentials

After running `npm run create-superadmin`:

- **Email**: `admin@napkin.com`
- **Username**: `superadmin`
- **Password**: `Admin123!`

**Important**: Change the password after first login!

## Environment Variables

### Backend (.env)

```env
MONGODB_URI=your-mongodb-connection-string
DB_NAME=napkinevents
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:4200
```

## Scripts

### Backend

- `npm run dev` - Start development server with auto-reload
- `npm run create-superadmin` - Create super admin user

### Frontend

- `npm start` - Start Angular development server

## Troubleshooting

### MongoDB Connection Issues
- Verify your MongoDB URI in `.env` file
- Check network access in MongoDB Atlas
- Ensure IP whitelist includes your IP address

### Port Already in Use
- Change `PORT` in `.env` file
- Or stop the process using the port

### Frontend Build Errors
- Run `npm install` again in frontend directory
- Clear `node_modules` and reinstall if needed




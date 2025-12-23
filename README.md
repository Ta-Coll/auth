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
│   │   ├── models/      # User, Company, Invite models
│   │   ├── routes/      # API routes (auth, admin, company)
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
    │   │   ├── components/  # Signup, Login, Dashboard, Superadmin, Unverified
    │   │   ├── services/    # Auth, Admin, Company services
    │   │   ├── guards/     # Route guards (Auth, SuperAdmin, Guest)
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
MONGODB_URI=
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

**Step 1: Start Backend Server**

Open a terminal and navigate to the backend directory:
```bash
cd backend
npm run dev
```

The backend server will start on `http://localhost:3000`

**Step 2: Start Frontend Application**

Open a new terminal and navigate to the frontend directory:
```bash
cd frontend
npm start
```

The Angular application will start on `http://localhost:4200` and automatically open in your browser.

### Important Notes

1. **Backend must be running first** - The frontend makes API calls to `http://localhost:3000`, so ensure the backend is started before accessing the frontend.

2. **Database Connection** - Make sure your MongoDB connection string in `backend/.env` is correct and accessible.

3. **Super Admin Access** - To access the admin panel, you need to:
   - Run `npm run create-superadmin` in the backend directory (if not already done)
   - Login with the super admin credentials
   - You'll be automatically redirected to the admin panel

4. **User Flow**:
   - **New Users**: Sign up → Email unverified → Redirected to unverified page
   - **Verified Members**: Login → Dashboard → Can create companies
   - **Creators**: Login → Dashboard → See companies list → Can invite users
   - **Super Admins**: Login → Automatically redirected to admin panel

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
      "role": "Member"
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
Validate user email (currently placeholder - email verification flow implemented in frontend).

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

#### PATCH /api/admin/users/:uid
Update user role and email verification status.

**Request:**
```json
{
  "role": "Member" | "Creator" | "Super Admin",
  "emailVerified": true | false
}
```

**Headers:**
```
Authorization: Bearer <super-admin-token>
```

#### POST /api/admin/users
Create a new user (Super Admin only).

**Request:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe",
  "timeZone": "America/New_York",
  "role": "Member" | "Creator" | "Super Admin",
  "emailVerified": true | false
}
```

#### DELETE /api/admin/users/:uid
Delete a user (soft delete - permanently removes from database).

**Headers:**
```
Authorization: Bearer <super-admin-token>
```

### Company Endpoints (Authenticated Users)

#### POST /api/companies
Create a new company. User role automatically changes to "Creator".

**Request:**
```json
{
  "name": "My Company",
  "description": "Company description (optional)"
}
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Company created successfully. Your role has been updated to Creator.",
  "data": {
    "companyId": "uuid",
    "name": "My Company",
    "description": "Company description",
    "created": 1234567890,
    "createdBy": "user-uid",
    "members": [...]
  }
}
```

#### GET /api/companies/my-companies
Get all companies the user belongs to.

**Headers:**
```
Authorization: Bearer <token>
```

#### POST /api/companies/invite
Invite a user to a company by email (Creator/Admin only).

**Request:**
```json
{
  "email": "invitee@example.com",
  "companyId": "company-uuid"
}
```

**Headers:**
```
Authorization: Bearer <token>
```

#### POST /api/companies/invite/:inviteId/accept
Accept a pending invitation.

**Headers:**
```
Authorization: Bearer <token>
```

#### GET /api/companies/invites/pending
Get all pending invitations for the current user.

**Headers:**
```
Authorization: Bearer <token>
```

## User Roles

- **Member**: Default role for new signups. Can create companies to become a Creator.
- **Creator**: Users who have created a company. Can invite other users to their companies.
- **Super Admin**: Full system access, can manage all users, roles, and email verification status.

## Features

- ✅ User registration with email, username, password
- ✅ User login with JWT bearer token
- ✅ Email verification flow (unverified users redirected to verification page)
- ✅ Role-based authorization (Member, Creator, Super Admin)
- ✅ Super admin panel for user management
- ✅ Company creation system
- ✅ Automatic role upgrade: Members become Creators when creating a company
- ✅ Email invitation system for inviting users to companies
- ✅ Company membership management
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




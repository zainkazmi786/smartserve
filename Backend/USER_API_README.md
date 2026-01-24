# User Management API Documentation

## Overview
This module implements complete user management functionality including authentication, authorization (RBAC), profile management, and user administration for the Smart Cafe system.

## Project Structure

```
Backend/
├── models/
│   ├── User.js          # User model with role reference
│   ├── Role.js          # Role model with permissions
│   └── Cafe.js          # Cafe model
├── controllers/
│   └── userController.js  # All user-related business logic
├── middleware/
│   ├── auth.js          # JWT authentication middleware
│   └── rbac.js          # Role-based access control middleware
├── routes/
│   └── userRoutes.js    # User API routes
├── server.js            # Express server setup
└── Smart_Cafe_User_API.postman_collection.json  # Postman collection
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/smartcafe
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
```

3. Start the server:
```bash
node server.js
# or with nodemon
nodemon server.js
```

## API Endpoints

### Authentication

#### POST `/api/users/login`
Login with email/phone and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
or
```json
{
  "phone": "+1234567890",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "token": "jwt-token-here",
    "activeCafeId": "cafe-id"
  }
}
```

#### POST `/api/users/register`
Customer self sign-up.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "customer@example.com",
  "phone": "+1234567891",
  "password": "password123",
  "cafeId": "cafe-id"  // Optional if only one cafe exists
}
```

#### POST `/api/users/logout`
Logout user (client-side token removal).

**Headers:** `Authorization: Bearer <token>`

---

### Profile Management

#### GET `/api/users/profile`
Get logged-in user profile.

**Headers:** `Authorization: Bearer <token>`

#### PUT `/api/users/profile`
Update own profile.

**Request Body:**
```json
{
  "name": "Updated Name",
  "email": "newemail@example.com",
  "phone": "+1234567892"
}
```

---

### Cafe Association

#### GET `/api/users/cafes`
Get all cafes associated with logged-in user.

#### POST `/api/users/cafes/switch`
Switch active cafe context.

**Request Body:**
```json
{
  "cafeId": "cafe-id"
}
```

**Response includes new token with updated activeCafeId**

---

### User Management (Manager & Super Admin)

#### GET `/api/users`
List users with optional filters.

**Query Parameters (Super Admin only):**
- `role`: Filter by role name
- `cafe`: Filter by cafe ID

**Note:** Managers automatically see only users from their cafe.

#### POST `/api/users`
Create new user.

**Request Body:**
```json
{
  "name": "New Staff Member",
  "email": "staff@cafe.com",
  "phone": "+1234567893",
  "password": "tempPassword123",  // Optional - temp password generated if omitted
  "roleName": "receptionist",
  "cafes": ["cafe-id"]  // Manager can only assign their cafe
}
```

#### PUT `/api/users/:id/role`
Update user role (Super Admin only).

**Request Body:**
```json
{
  "roleName": "manager"
}
```

#### DELETE `/api/users/:id/cafe/:cafeId`
Remove user from cafe.

#### PATCH `/api/users/:id/status`
Activate/Deactivate user.

**Request Body:**
```json
{
  "status": "inactive"  // or "active"
}
```

#### DELETE `/api/users/:id`
Delete user permanently.

---

## Access Control Matrix

| Endpoint | Customer | Receptionist | Manager | Super Admin |
|----------|----------|--------------|---------|-------------|
| Login | ✅ | ✅ | ✅ | ✅ |
| Register | ✅ | ❌ | ❌ | ❌ |
| Profile (GET/PUT) | ✅ | ✅ | ✅ | ✅ |
| Get Cafes | ✅ | ✅ | ✅ | ✅ |
| Switch Cafe | ✅ | ✅ | ✅ | ✅ |
| List Users | ❌ | ❌ | ✅ | ✅ |
| Create User | ❌ | ❌ | ✅ | ✅ |
| Update Role | ❌ | ❌ | ❌ | ✅ |
| Remove from Cafe | ❌ | ❌ | ✅ | ✅ |
| Update Status | ❌ | ❌ | ✅ | ✅ |
| Delete User | ❌ | ❌ | ✅ | ✅ |

**Note:** Managers can only manage users associated with their cafe.

## Role-Based Access Control

### Roles
- **superadmin**: Platform-level administrator
- **manager**: Full control of assigned cafe(s)
- **receptionist**: Order approval & menu control
- **customer**: Mobile app end user
- **kitchen**: Order preparation interface

### Permissions
Each role has permissions defined in the Role model:
- Resources: users, cafes, menus, menuItems, orders, reviews, roles, settings
- Actions: create, read, update, delete, approve, manage

## Security Features

1. **Password Hashing**: All passwords are hashed using bcryptjs
2. **JWT Authentication**: Token-based authentication with expiration
3. **Role-Based Access**: Middleware enforces role-based access control
4. **Cafe Scoping**: Managers can only access their cafe's data
5. **Input Validation**: Email/phone uniqueness checks
6. **Account Status**: Inactive users cannot login

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error message here"
}
```

**HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error

## Postman Collection

Import `Smart_Cafe_User_API.postman_collection.json` into Postman to test all endpoints.

**Collection Variables:**
- `base_url`: http://localhost:3000
- `token`: JWT token (auto-set after login)
- `cafe_id`: Cafe ID for testing
- `user_id`: User ID for testing

## Usage Example

```javascript
// Login
const response = await fetch('http://localhost:3000/api/users/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'manager@cafe.com',
    password: 'password123'
  })
});

const { data } = await response.json();
const token = data.token;

// Get Profile
const profileResponse = await fetch('http://localhost:3000/api/users/profile', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## Next Steps

1. Set up MongoDB database
2. Create initial roles in the database
3. Create super admin user manually or via seed script
4. Test endpoints using Postman collection
5. Integrate with frontend application

## Notes

- Token expiration can be configured via `JWT_EXPIRES_IN` environment variable
- Password reset functionality is out of scope for this version
- Audit logging is mentioned but not implemented (as per requirements)
- Rate limiting should be added for production use

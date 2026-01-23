# Authentication System Implementation Plan

## 📋 Current State Analysis

### ✅ What We Have
- Basic `AuthContext` with mock login/logout
- User structure defined (needs expansion)
- React Router setup
- TanStack Query for data fetching
- shadcn/ui components for forms

### ❌ What's Missing

1. **API Client Service**
   - HTTP client (axios recommended)
   - Base URL configuration
   - Request/response interceptors
   - Token injection in headers
   - Error handling

2. **Token Management**
   - localStorage for token persistence
   - Token retrieval on app init
   - Token removal on logout
   - Active cafe ID storage

3. **Login Page**
   - Login form component
   - Email/phone + password input
   - Form validation (react-hook-form + zod)
   - Error handling & display
   - Loading states

4. **Protected Routes**
   - Route guard component
   - Redirect to login if not authenticated
   - Preserve intended destination after login

5. **RBAC Permission System**
   - `hasPermission` utility function
   - Check role permissions for resources/actions
   - Helper for UI component conditional rendering

6. **Environment Configuration**
   - API base URL env variable
   - Environment files (.env.development, .env.production)

7. **User State Persistence**
   - Load user from token on app start
   - Verify token validity
   - Handle token expiration

---

## 🏗️ Implementation Steps

### Step 1: Environment Configuration
**File**: `.env.development`, `.env.production`

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

### Step 2: API Client Service
**File**: `src/lib/api.ts`

- Create axios instance with base URL
- Request interceptor: Add `Authorization: Bearer {token}` header
- Response interceptor: Handle 401 (unauthorized) → logout
- Export API functions: `api.get()`, `api.post()`, etc.

### Step 3: Token Storage Utility
**File**: `src/lib/tokenStorage.ts`

- `getToken()` - Retrieve from localStorage
- `setToken(token: string)` - Save to localStorage
- `removeToken()` - Clear from localStorage
- `getActiveCafeId()` - Get active cafe ID
- `setActiveCafeId(cafeId: string)` - Save active cafe ID

### Step 4: Auth Service (API Calls)
**File**: `src/services/authService.ts`

- `login(email: string, password: string)` - POST `/users/login`
- `logout()` - Client-side only (clear token)
- `getProfile()` - GET `/users/profile` (verify token)
- Handle API response format from backend

### Step 5: RBAC Permission Utility
**File**: `src/lib/permissions.ts`

- `hasPermission(role, resource, action)` - Check permission matrix
- `hasAnyPermission(role, permissions[])` - Check multiple permissions
- Role types: `'superadmin' | 'manager' | 'receptionist' | 'customer'`
- Resources: `'users' | 'cafes' | 'menus' | 'menuItems' | 'orders' | 'reviews' | 'roles' | 'settings'`
- Actions: `'create' | 'read' | 'update' | 'delete' | 'approve' | 'manage'`

### Step 6: Updated AuthContext
**File**: `src/contexts/AuthContext.tsx`

- Replace mock with real API calls
- Token storage integration
- User persistence on reload
- Active cafe management
- Loading states
- Error handling

### Step 7: Login Page
**File**: `src/pages/Login.tsx`

- Email/phone input (single field, accepts both)
- Password input
- Submit button with loading state
- Error message display
- Form validation (zod schema)
- Redirect to intended route after login

### Step 8: Protected Route Component
**File**: `src/components/auth/ProtectedRoute.tsx`

- Check authentication status
- Redirect to `/login` if not authenticated
- Pass through if authenticated
- Preserve redirect URL in query params

### Step 9: Update App.tsx
**File**: `src/App.tsx`

- Add `/login` route
- Wrap protected routes with `<ProtectedRoute>`
- Handle redirect after login

### Step 10: Update User Type
**File**: `src/contexts/AuthContext.tsx`

- Match backend User structure:
  - `_id`, `name`, `email`, `phone`
  - `role: { name, permissions[] }`
  - `cafes[]`, `status`

---

## 📝 Backend API Reference

### POST `/api/users/login`
**Request:**
```json
{
  "email": "user@example.com",  // OR "phone": "+1234567890"
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "user_id",
      "name": "John Doe",
      "email": "user@example.com",
      "phone": "+1234567890",
      "role": {
        "_id": "role_id",
        "name": "manager",
        "permissions": [
          {
            "resource": "orders",
            "actions": ["create", "read", "update", "approve"]
          }
        ]
      },
      "cafes": [/* cafe objects */],
      "status": "active"
    },
    "token": "jwt_token_string",
    "activeCafeId": "cafe_id"
  }
}
```

### GET `/api/users/profile`
**Headers:** `Authorization: Bearer {token}`
**Response:** Same user structure as login

---

## 🔐 Permission Matrix (Based on Backend)

| Resource | Action | Manager | Receptionist | Super Admin |
|----------|--------|---------|--------------|-------------|
| users | read | ✅ (own cafe) | ❌ | ✅ |
| users | create | ✅ (own cafe) | ❌ | ✅ |
| users | update | ✅ (own cafe) | ❌ | ✅ |
| cafes | read | ✅ (own) | ✅ (own) | ✅ |
| cafes | update | ✅ (own) | ❌ | ✅ |
| menus | manage | ✅ | ✅ | ✅ |
| menuItems | manage | ✅ | ✅ | ✅ |
| orders | read | ✅ | ✅ | ✅ |
| orders | approve | ✅ | ✅ | ✅ |

---

## 🎯 Testing Checklist

- [ ] Login with valid credentials → stores token, redirects
- [ ] Login with invalid credentials → shows error
- [ ] Access protected route without auth → redirects to login
- [ ] Access protected route with auth → allows access
- [ ] Logout → clears token, redirects to login
- [ ] Page refresh → maintains auth state (token persistence)
- [ ] Token expiration → auto logout on 401
- [ ] hasPermission function → correctly checks permissions
- [ ] Role-based UI rendering → shows/hides based on permissions

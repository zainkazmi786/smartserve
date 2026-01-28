# Backend API Specifications

## 1. Change Password API

### Endpoint
```
PUT /api/users/profile/password
```

### Authentication
- **Required**: Yes
- **Header**: `Authorization: Bearer <token>`
- **Token Source**: JWT token from login/register response

### Request

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

**Body:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword456"
}
```

**Validation Rules:**
- `currentPassword`: Required, must match user's current password
- `newPassword`: Required, minimum 6 characters (or your app's password policy)

### Success Response

**Status Code:** `200 OK`

**Response Body:**
```json
{
  "success": true,
  "message": "Password updated successfully",
  "data": {
    "user": {
      "_id": "6975f99df5adaf64cc55c24e",
      "name": "User Name",
      "email": "user@example.com",
      "phone": "+1234567890",
      "status": "active",
      "role": { ... },
      "cafes": [ ... ],
      "createdAt": "2026-01-25T11:08:14.005Z",
      "updatedAt": "2026-01-25T13:07:05.074Z"
    }
  }
}
```

### Error Responses

**1. Missing Current Password**
- **Status:** `400 Bad Request`
```json
{
  "success": false,
  "message": "Current password is required"
}
```

**2. Missing New Password**
- **Status:** `400 Bad Request`
```json
{
  "success": false,
  "message": "New password is required"
}
```

**3. Invalid Current Password**
- **Status:** `401 Unauthorized`
```json
{
  "success": false,
  "message": "Current password is incorrect"
}
```

**4. New Password Too Short**
- **Status:** `400 Bad Request`
```json
{
  "success": false,
  "message": "New password must be at least 6 characters long"
}
```

**5. Same Password**
- **Status:** `400 Bad Request`
```json
{
  "success": false,
  "message": "New password must be different from current password"
}
```

**6. Unauthorized (Invalid/Expired Token)**
- **Status:** `401 Unauthorized`
```json
{
  "success": false,
  "message": "Unauthorized. Please login again."
}
```

---

## 2. Upload Profile Picture API

### Endpoint
```
POST /api/users/profile/picture
```
OR
```
PUT /api/users/profile/picture
```

### Authentication
- **Required**: Yes
- **Header**: `Authorization: Bearer <token>`
- **Token Source**: JWT token from login/register response

### Request

**Headers:**
```
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**Body (FormData):**
- **Field Name**: `profilePicture` (or `image` or `file` - specify which you prefer)
- **Type**: File (Image)
- **Accepted Formats**: `image/jpeg`, `image/png`, `image/jpg`
- **Max File Size**: 5MB (recommended)

**Example FormData:**
```
profilePicture: [File object]
```

### File Validation
- **Required**: Yes
- **File Types**: JPEG, PNG, JPG
- **Max Size**: 5MB
- **Dimensions**: Optional - you can enforce square (1:1) or specific dimensions

### Success Response

**Status Code:** `200 OK`

**Response Body:**
```json
{
  "success": true,
  "message": "Profile picture updated successfully",
  "data": {
    "user": {
      "_id": "6975f99df5adaf64cc55c24e",
      "name": "User Name",
      "email": "user@example.com",
      "phone": "+1234567890",
      "profilePicture": "https://your-cdn.com/uploads/profile/6975f99df5adaf64cc55c24e.jpg",
      "status": "active",
      "role": { ... },
      "cafes": [ ... ],
      "updatedAt": "2026-01-25T13:07:05.074Z"
    },
    "imageUrl": "https://your-cdn.com/uploads/profile/6975f99df5adaf64cc55c24e.jpg"
  }
}
```

**OR (if you return just the URL):**
```json
{
  "success": true,
  "message": "Profile picture updated successfully",
  "data": {
    "imageUrl": "https://your-cdn.com/uploads/profile/6975f99df5adaf64cc55c24e.jpg",
    "user": {
      "_id": "6975f99df5adaf64cc55c24e",
      "profilePicture": "https://your-cdn.com/uploads/profile/6975f99df5adaf64cc55c24e.jpg",
      "updatedAt": "2026-01-25T13:07:05.074Z"
    }
  }
}
```

**Important:** Return the full URL (not relative path) so the mobile app can display it directly.

### Error Responses

**1. Missing File**
- **Status:** `400 Bad Request`
```json
{
  "success": false,
  "message": "Profile picture is required"
}
```

**2. Invalid File Type**
- **Status:** `400 Bad Request`
```json
{
  "success": false,
  "message": "Invalid file type. Only JPEG, PNG, and JPG images are allowed"
}
```

**3. File Too Large**
- **Status:** `400 Bad Request`
```json
{
  "success": false,
  "message": "File size exceeds maximum limit of 5MB"
}
```

**4. Upload Failed**
- **Status:** `500 Internal Server Error`
```json
{
  "success": false,
  "message": "Failed to upload profile picture. Please try again."
}
```

**5. Unauthorized (Invalid/Expired Token)**
- **Status:** `401 Unauthorized`
```json
{
  "success": false,
  "message": "Unauthorized. Please login again."
}
```

---

## Implementation Notes

### For Change Password API:

1. **Password Hashing:**
   - Verify `currentPassword` against stored hash
   - Hash `newPassword` before storing
   - Use same hashing algorithm as registration (likely bcrypt)

2. **Security:**
   - Rate limiting recommended (prevent brute force)
   - Log password change events for security audit
   - Consider requiring re-authentication for sensitive operations

3. **Response:**
   - Return updated user object (same format as GET /api/users/profile)
   - Include all user fields, not just password-related

### For Upload Profile Picture API:

1. **File Storage:**
   - Store files in cloud storage (AWS S3, Cloudinary, etc.) or local storage
   - Generate unique filename: `{userId}_{timestamp}.{ext}` or `{userId}.{ext}`
   - Delete old profile picture when new one is uploaded

2. **Image Processing (Recommended):**
   - Resize to standard dimensions (e.g., 300x300 or 500x500)
   - Compress image to reduce storage
   - Generate thumbnail if needed
   - Maintain aspect ratio (square recommended)

3. **File Naming:**
   - Use user ID in filename for easy lookup
   - Include timestamp to prevent caching issues
   - Example: `profile_6975f99df5adaf64cc55c24e_1737817625074.jpg`

4. **URL Format:**
   - Return absolute URL (full URL, not relative path)
   - Example: `https://api.yourdomain.com/uploads/profile/user123.jpg`
   - Or CDN URL: `https://cdn.yourdomain.com/profile/user123.jpg`

5. **Database Update:**
   - Update user document with `profilePicture` field containing the URL
   - Update `updatedAt` timestamp

6. **Error Handling:**
   - Handle file system errors
   - Handle storage service errors (if using cloud storage)
   - Provide meaningful error messages

---

## Testing Checklist for Backend Developer

### Change Password API:
- [ ] Test with valid current password and new password
- [ ] Test with incorrect current password
- [ ] Test with missing current password
- [ ] Test with missing new password
- [ ] Test with new password shorter than minimum length
- [ ] Test with same password for current and new
- [ ] Test with invalid/expired token
- [ ] Test with no token
- [ ] Verify password is hashed before storing
- [ ] Verify old password no longer works after change

### Upload Profile Picture API:
- [ ] Test with valid image file (JPEG)
- [ ] Test with valid image file (PNG)
- [ ] Test with invalid file type (e.g., PDF, text file)
- [ ] Test with file larger than 5MB
- [ ] Test with missing file
- [ ] Test with invalid/expired token
- [ ] Test with no token
- [ ] Verify old picture is deleted when new one is uploaded
- [ ] Verify image URL is returned in response
- [ ] Verify user document is updated with new picture URL
- [ ] Test image is accessible via returned URL

---

## Example cURL Commands

### Change Password:
```bash
curl -X PUT https://api.yourdomain.com/api/users/profile/password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "currentPassword": "oldpassword123",
    "newPassword": "newpassword456"
  }'
```

### Upload Profile Picture:
```bash
curl -X POST https://api.yourdomain.com/api/users/profile/picture \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "profilePicture=@/path/to/image.jpg"
```

---

## Field Name for File Upload

**Please specify which field name you'll use for the file upload:**
- `profilePicture` (recommended)
- `image`
- `file`
- `picture`

**The mobile app will use whatever field name you specify.**

---

## Additional Requirements

1. **CORS:** Ensure CORS is configured to allow requests from your mobile app domains
2. **Rate Limiting:** Implement rate limiting to prevent abuse
3. **File Validation:** Validate file type by MIME type, not just extension
4. **Security:** Scan uploaded images for malicious content if possible
5. **Backup:** Consider keeping old profile pictures for a grace period before deletion

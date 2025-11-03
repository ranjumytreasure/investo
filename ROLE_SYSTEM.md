# Role-Based Access Control System

## Overview
This document describes the role-based access control (RBAC) system implemented in the Investo application.

## Implementation Approach

### 1. User Model Enhancement
- Added `role` field to the `User` model as an ENUM with values: `'user'`, `'admin'`, `'productowner'`
- Default role is `'user'`
- The role is stored directly in the users table for simplicity and performance

**Alternative Considered**: Separate roles table with many-to-many relationship
- **Why Not Used**: Simpler requirements (only 3 roles), better query performance, easier to implement
- **Future Consideration**: If roles need to be dynamically created/managed, we can migrate to a roles table later

### 2. Database Schema

```sql
-- Role is added as an ENUM column in users table
role ENUM('user', 'admin', 'productowner') DEFAULT 'user' NOT NULL
```

### 3. Seeded Users

The following users are automatically created when running the seed script:

| Phone Number | Role | PIN | Description |
|-------------|------|-----|-------------|
| 9942393231 | admin | 1234 | System Administrator |
| 9942393232 | productowner | 1234 | Product Owner |

### 4. Authentication Middleware

#### `authenticateToken`
- Verifies JWT token from Authorization header
- Loads user into `req.user`
- Required for protected routes

#### `requireAdmin`
- Checks if user has `admin` or `productowner` role
- Returns 403 if user doesn't have required permissions
- Used to protect admin-only routes

### 5. Usage

#### Protecting Routes

```typescript
import { authenticateToken, requireAdmin } from '../middleware/auth';

// Protect route - requires authentication
app.post('/admin/features', authenticateToken, requireAdmin, async (req, res) => {
    // Only admin or productowner can access
});

// Check user role in route handler
app.get('/profile', authenticateToken, async (req: AuthRequest, res) => {
    if (req.user?.role === 'admin') {
        // Admin-specific logic
    }
});
```

### 6. Scripts

```bash
# Initialize database (creates all tables)
npm run db:init

# Seed users (creates admin and productowner)
npm run db:seed

# Run both in sequence
npm run db:init && npm run db:seed
```

## Role Permissions

| Role | Permissions |
|------|-------------|
| `user` | Standard user permissions (default) |
| `admin` | Can manage features, full admin access |
| `productowner` | Can manage features, same as admin currently |

## Future Enhancements

1. **Role-Specific Permissions**: Add granular permissions per role
2. **Role Management UI**: Allow admins to assign roles via UI
3. **Separate Roles Table**: If dynamic role creation is needed
4. **Role Inheritance**: Support role hierarchies
5. **Audit Logging**: Track role changes and admin actions

## Migration Notes

- Existing users will have `role = 'user'` by default
- Run `npm run db:seed` to create admin users after deployment
- The seed script uses `findOrCreate`, so it's safe to run multiple times (updates existing users)


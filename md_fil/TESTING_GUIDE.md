# 📋 Testing Guide - Auto-Logout Fix

## Quick Test Steps

### Test 1: Verify Back Button Doesn't Logout
**Expected**: Clicking browser back button keeps you logged in

1. **Login** as a student with valid credentials
2. **Navigate** to `/student/library` (Documents/Pages)
3. **Navigate** to `/student/editor` (Code Editor) 
4. **Navigate** to `/student/upload` (Upload Page)
5. **Click browser back button** ← Back
6. ✅ **Should see** previous page (Upload Page still logged in)
7. **Click back again** ← Back
8. ✅ **Should see** Code Editor page (still logged in)
9. **Continue clicking back** multiple times
10. ✅ **Should maintain login** until reaching Home page

### Test 2: Logout Button Works Correctly
**Expected**: Clicking logout button redirects to login page

1. **Login** as a student
2. **Navigate** to any student page
3. **Click logout button** (top-right, LogOut icon)
4. ✅ **Should redirect** to `/auth/login` page immediately
5. ✅ **Should not be able** to go back with browser back button
   - Clicking back should stay on login, not take you to previous page

### Test 3: Inactive Student Account
**Expected**: Inactive students cannot stay logged in

1. **Have an inactive student account** (ask admin to deactivate)
2. **Try to login** with inactive account credentials
3. ✅ **Should see error**: "Tài khoản chưa được kích hoạt"
4. **Admin activates account**
5. **Try login again**
6. ✅ **Should login successfully**

### Test 4: Role-Based Access Control
**Expected**: Only users with correct role can access student pages

1. **Login as TEACHER**
2. **Try to access** `/student/library` directly
3. ✅ **Should redirect** to `/teacher` page
4. **Try to access** `/student/editor` directly  
5. ✅ **Should redirect** to `/teacher` page

1. **Login as STUDENT**
2. **Try to access** `/teacher` directly
3. ✅ **Should redirect** to `/student/library` or dashboard

### Test 5: Session Persistence
**Expected**: User stays logged in after page navigation

1. **Login** as student
2. **Close DevTools** (if open)
3. **Refresh page** with `F5`
4. ✅ **Should remain logged in** (no redirect to login)
5. **Navigate** between different student pages
6. ✅ **User info** should display correctly on each page

### Test 6: All Student Components
Test that all components work with new auth hook:

- ✅ StudentMainDashboard - shows all menu items
- ✅ StudentDashboard - displays courses
- ✅ StudentPagesViewer - loads teacher pages
- ✅ StudentLibrary - loads documents and pages
- ✅ StudentCodeEditor - loads code and saves code
- ✅ StudentUploadPage - allows file upload

Each should:
- Display user name correctly
- Have working logout button
- Not logout on back button click

## Test Checklist

```
[ ] Back button doesn't cause logout
[ ] Logout button works and redirects to login
[ ] Inactive students get proper error message
[ ] Role-based access control works
[ ] Page refresh maintains login session
[ ] All student components load correctly
[ ] User information displays on all pages
[ ] No console errors during navigation
[ ] No TypeScript errors in build
```

## Expected Console Output

**During normal operation:**
- No auth-related errors
- No "user is possibly null" warnings
- Clean navigation between pages

**During logout:**
- User data cleared from localStorage
- Redirect to /auth/login initiated

## Troubleshooting

### Still getting auto-logout on back button?
- [ ] Clear browser cache/localStorage manually
- [ ] Check browser DevTools Console for errors
- [ ] Verify `useAuth` hook is imported correctly
- [ ] Ensure dependency array is `[]` not `[router]` or `[user]`

### Logout button not working?
- [ ] Verify `logout` function is called (not `handleLogout`)
- [ ] Check localStorage is cleared: `localStorage.getItem('user')` should return `null`
- [ ] Verify redirect to login is working

### User stays logged in everywhere?
- [ ] Check browser DevTools: Storage > LocalStorage > user
- [ ] Manual clear: Open DevTools Console, run: `localStorage.clear()`
- [ ] Verify useAuth has `requiredRole` parameter set correctly

## Performance Notes

- **First load**: Initial auth check happens once on mount
- **Navigation**: No additional auth checks (improved performance)
- **Logout**: Immediate localStorage cleanup + redirect
- **API calls**: Still need to pass user ID, but auth hook ensures user exists

## Security Considerations

Current implementation uses localStorage (use for demo/testing only):

For production, implement:
1. **HTTP-only cookies** for session tokens
2. **CSRF protection** for state-changing operations
3. **Token refresh** mechanism if using JWTs
4. **Session timeout** with warning before expiry
5. **Secure logout** that also clears server-side sessions

---

**Questions?** Refer to [AUTO_LOGOUT_FIX.md](AUTO_LOGOUT_FIX.md) for technical details.

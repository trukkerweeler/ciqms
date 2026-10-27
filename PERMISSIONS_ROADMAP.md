# Permissions Roadmap

## Summary

This project already has a working identity model based on the current request context:

- If a user is logged in via session, that user is used.
- Otherwise, the server attempts to resolve the user from the client IP using the static `ipUserMapping` in [server.js](C:/Users/TimK/Documents/CIQMS1/server.js).
- If still unresolved, it falls back to a best-effort hostname/IP identity.

That gives us a solid foundation for page-level permissions without requiring full login enforcement yet.

## What has been done

### 1. Identity resolution foundation

The server now resolves a request identity in a consistent way before routes run, using the existing session/IP pattern already present in [server.js](C:/Users/TimK/Documents/CIQMS1/server.js).

This is the key concept:

- `req.user` is populated from session or IP resolution.
- `req.session.user_id` is also populated when an IP-based user is recognized.
- This lets routes and permission checks work against a single identity source.

### 2. Permission middleware added

A permission system was added in [middleware/permissions.js](C:/Users/TimK/Documents/CIQMS1/middleware/permissions.js).

This module provides:

- `attachPermissions(req, res, next)` to attach permission data to every request
- `authorizeRequest(req, page, action)` to evaluate a decision
- `requirePermission(page, action)` middleware to protect routes
- `buildPermissionState(req)` to return the current user’s effective permission view
- `getIdentityCandidates(req)` to support IP-based and session-based identity matching

### 3. Permission config added

A default config block was added to [qms.config.json](C:/Users/TimK/Documents/CIQMS1/qms.config.json) under `permissions`.

Current defaults:

- `enabled: false`
- `defaultDeny: true`
- sample page rules for `home`, `people`, and `suppliers`

This is intentionally off so the app continues to function while the permission model is being rolled out.

### 4. User endpoint exposes permission context

The existing user endpoints in [routes/user.js](C:/Users/TimK/Documents/CIQMS1/routes/user.js) now include:

- `GET /user/me/permissions`

This returns the current user and the relevant permission snapshot for the current request. This is useful for UI gating and validation.

## Recommended permission model

The project should use a page + action permission model, for example:

- Page: `people`, `suppliers`, `ncm`, `corrective`, etc.
- Action: `view`, `add`, `edit`, `delete`, `other`

This is a good fit for CIQMS because it aligns with standard business access patterns and will remain useful even after real login is introduced.

### Example rule structure

```json
{
  "permissions": {
    "enabled": true,
    "defaultDeny": true,
    "pages": {
      "people": {
        "view": ["*"],
        "add": ["TKENT", "AMIDDLETON"],
        "edit": ["TKENT", "AMIDDLETON"],
        "delete": ["TKENT"],
        "other": ["TKENT"]
      }
    }
  }
}
```

This works well with the current IP-based identity model because the identity is already resolved before permission checks happen.

## Best-practice guidance

### 1. Keep route checks centralized

Do not hard-code permission logic in each individual route if it can be avoided. Prefer:

```js
const { requirePermission } = require("../middleware/permissions");

router.post("/people", requirePermission("people", "add"), async (req, res) => {
  // route logic
});
```

### 2. Use action-based rules instead of route-based only

This gives better control over:

- read-only access
- create access
- update access
- destructive access
- admin/custom access

### 3. Default deny when enforcement is on

This is the safest default for a QMS system. If a user is not explicitly allowed, they are denied.

### 4. Do not mix IP logic into route handlers

Permission decision logic should sit in a single middleware layer, not be repeated across routes. This keeps the model easier to audit and extend.

## What still needs to be done next

### 1. Decide the permission source of truth

Current setup is config-driven. That is good for the first phase, but the project should decide whether the system will remain static config or eventually move to a database-backed role table.

Recommended path:

- Phase 1: JSON config with IP/user allowlists
- Phase 2: DB-backed roles and permission tables
- Phase 3: optional login flow with real user accounts and role assignment

### 2. Apply permission checks to the highest-risk routes first

The first routes to protect should be the ones where edit/delete/admin actions are most sensitive, such as:

- people
- suppliers
- corrective action flows
- nonconformance / quality records
- admin or configuration endpoints

### 3. Add a UI permission indicator

The frontend should not show controls that a user cannot use, based on the current permission state.

Examples:

- hide Add buttons when `add` is denied
- disable Edit/Delete buttons when the user lacks those actions
- suppress admin sections with `other` or `delete` permission checks

### 4. Define a canonical page naming system

The permission matrix should use a stable page key naming convention such as:

- `people`
- `suppliers`
- `ncm`
- `corrective`
- `training`
- `certification`

This prevents drift between front-end route names and backend permission names.

### 5. Extend to object-level or record-level permissions where needed

Some areas may require more than simple page-level access. For example:

- only certain users can edit records assigned to their area
- only supervisors can approve actions
- some records may be restricted by department or site

That can be layered on after the page-level foundation is complete.

### 6. Create a permission administration model

Once the system is ready, add a way to manage permissions without editing JSON directly.

This will likely require:

- `PERMISSIONS` table or role table
- `USER_ROLE` / `ROLE_PERMISSION` mappings
- admin UI to assign page + action permissions

### 7. Revisit the login strategy later

You said you are not forcing users to log in yet, which is sensible. The permission layer is already designed to support future login without requiring a rewrite.

When login is added, the system can simply prefer the authenticated session user over the IP mapping.

## Recommended next milestone

A good next milestone is:

- enable permissions for a small number of critical pages
- leave the system in config mode
- verify behavior using IP-based users
- document the permission matrix for each page

Then, once the access model is stable, move to database-backed roles and optionally add login.

## Current state

The project is in a safe state for groundwork because:

- no enforcement is active yet
- identity resolution is already in place
- permission middleware is in a reusable central location
- page/action permission design is ready to use

## Suggested next actions

1. Identify the top 5 pages to protect first.
2. Define the allowlist for each page and action.
3. Turn `permissions.enabled` on for those pages only.
4. Add frontend gating for Add/Edit/Delete controls.
5. Expand the permission map as the app grows.

This gives you a practical, low-risk rollout path while keeping the system flexible for future login and role-based access control.

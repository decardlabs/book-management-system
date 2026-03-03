# Project Guidelines

## Code Style
- Use CommonJS (`require`/`module.exports`) for backend files, matching [server.js](../server.js) and [models/User.js](../models/User.js).
- Keep model classes in PascalCase filenames (`User`, `Book`, `BorrowRecord`) with static async methods for DB operations.
- Preserve current API error shape: `res.status(...).json({ error: '...' })` as used across [routes/auth.js](../routes/auth.js) and [routes/books.js](../routes/books.js).
- Keep DB column naming in `snake_case` and JS variables in `camelCase`.

## Architecture
- Entry point is [server.js](../server.js): middleware setup, static hosting, API mounting, and DB init (`initDB()`).
- Route layer in `routes/` handles request/response and delegates SQL work to model classes in `models/`.
- DB bootstrap and pool lifecycle are centralized in [config/db.js](../config/db.js); avoid duplicating connection logic elsewhere.
- Frontend is static pages in `public/` with vanilla JS API clients in [public/js/login.js](../public/js/login.js) and [public/js/app.js](../public/js/app.js).

## Build and Test
- Install deps: `npm install`
- Start prod-like server: `npm start`
- Start dev server with reload: `npm run dev`
- No automated tests are configured in [package.json](../package.json); validate changes by running the server and exercising affected endpoints/pages.

## Project Conventions
- API base paths are domain-scoped: `/api/auth`, `/api/books`, `/api/users`, `/api/borrows`.
- Protect routes with `verifyToken`; chain `isAdmin` for admin-only operations (see [middleware/auth.js](../middleware/auth.js)).
- Keep SQL parameterized with placeholders (`?`) as in model methods; do not interpolate untrusted input into SQL strings.
- Frontend expects login response shape `{ token, user }` and most error responses to contain `{ error }`.
- Reuse the frontend `apiRequest` pattern in [public/js/app.js](../public/js/app.js) so `Authorization: Bearer <token>` remains consistent.

## Integration Points
- MySQL via `mysql2/promise` connection pool from [config/db.js](../config/db.js).
- Authentication via `jsonwebtoken` + `bcryptjs` across [routes/auth.js](../routes/auth.js), [models/User.js](../models/User.js), [middleware/auth.js](../middleware/auth.js).
- Static UI is served by Express from `public/`; `/` maps to `index.html` and `/dashboard` to `dashboard.html`.

## Security
- Prefer env vars for secrets and DB credentials; current defaults in [middleware/auth.js](../middleware/auth.js) and [config/db.js](../config/db.js) are development-oriented.
- Keep role checks server-side (`isAdmin`) even if UI hides admin actions.
- Startup seeds a default admin account in [config/db.js](../config/db.js); do not remove this behavior silently—document any change.
- Be careful with multi-step borrow/return operations in [routes/borrows.js](../routes/borrows.js); consider transaction safety when modifying related logic.

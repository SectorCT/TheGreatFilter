# Authentication Entry — User Stories + Page Contract

## User Stories
- As a user, I want to sign up and log in so that my filters and measurements are kept separate from other users.
- As an authenticated user, I want to land directly on the dashboard so that I can continue my work without extra steps.

## Page: `Auth` (`/auth`)
### What the page must show
- `Login` form (email + password)
- `Sign Up` form (email + password)
- Clear error feedback (invalid credentials, network failure, etc.)

### What the page must do (high-level)
- After successful login/signup, the app navigates to `Dashboard` (`/dashboard`).
- If the user is already authenticated, the page is not shown (or is redirected immediately).

## Page-to-Page Contract (Navigation)
- `Auth` -> `Dashboard` after successful authentication.

## Required Backend Contract (Minimal)
See `docs/contracts/page-api-contract.md`:
- `POST /auth/login`
- `POST /auth/signup`


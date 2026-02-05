# SoftJobs Server

Backend server for the Soft Jobs challenge (authentication with JWT).

## Prerequisites
- Node.js >= 16
- PostgreSQL installed

## Setup
1. Create the database and table by running the SQL script:
   - psql -f database/DDL.sql
   (or run the SQL statements in your psql shell)

2. Copy and edit `.env.example` to `.env` and fill in your DB credentials and `JWT_SECRET`.

3. Install dependencies and start server:
   - cd server
   - npm install
   - npm run dev

## Endpoints
- POST /usuarios
  - Body: { email, password, rol, lenguage }
  - Registers a new user (password is hashed)

- POST /login
  - Body: { email, password }
  - Returns: { token }

- GET /usuarios
  - Headers: { Authorization: "Bearer <token>" }
  - Returns: [ user ] (array with the matched user)

- GET /seed
  - Description: Creates a test user from env variables if it does not exist (development helper)
  - Returns: { created: true|false, user }

## Notes
- You can run both client and server concurrently from the project root with `npm run dev:all` (requires the `concurrently` dev dependency).
- The server logs each request to the terminal.
- Errors are returned as JSON: { message }
- Passwords are encrypted (using `bcryptjs` to avoid native build requirements on Windows).
- JWT payload includes the `email` field and is signed with `JWT_SECRET`.

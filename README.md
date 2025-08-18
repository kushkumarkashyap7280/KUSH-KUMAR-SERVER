# Portfolio Server (Node + Express)

Express-based REST API serving the portfolio client with public admin profile, experiences, qualifications, and contact submission endpoints. Uses MongoDB via Mongoose.

## Quick Start

- Prerequisites: Node.js 18+, MongoDB (local or Atlas)
- Install: `npm install`
- Development: `npm run dev`
- Start: `npm start`

## Environment Variables

Create a `.env` in `server/`:

```
PORT=8000
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority
JWT_SECRET=replace_with_strong_secret
CLIENT_ORIGIN=http://localhost:5173
```

Optional (for uploads/email, only if used):
```
EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASS=
```

## Project Structure

- `server.js` – App bootstrap and route mounting
- `config/db.config.js` – Mongo connection
- `models/` – Mongoose schemas (`Admin.model.js`, `Experience.model.js`, `Qualification.model.js`, etc.)
- `controllers/` – Route handlers (`Admin.controllers.js`, `Experience.controllers.js`, `Contact.controllers.js`, ...)
- `middlewares/` – Auth, Multer upload, etc.
- `routes/` – Express routers (admin, experiences, qualifications, contact)

## Endpoints (Overview)

Public:
- `GET /api/admin/status` – Public profile: `Fname`, `Lname`, `avatar`, `resume`, `description`, published `qualification`.
- `GET /api/experiences/public` – Published experiences for the front-end.
- `POST /api/contact` – Submit contact message.

Admin (auth required):
- `POST /api/admin/login`
- `PUT /api/admin/profile` – Update profile (name, description, resume, avatar).
- `POST /api/experiences` / `PUT /api/experiences/:id` / `DELETE /api/experiences/:id`
- Similar CRUD for qualifications.

Note: Actual routes may vary slightly by implementation; see `controllers/` and `routes/` for exact signatures.

## CORS

Set `CLIENT_ORIGIN` to your client URL (e.g., `http://localhost:5173`) to allow the front-end to call this API in dev.

## About Me

- X: https://x.com/CallOfCoders
- LeetCode: https://leetcode.com/kushkumarkashyap7280

If you fork this backend, replace the above with your own links and update the seeded admin profile.

# Portfolio Backend API Guide

Base URL: http://localhost:8000

- Admin routes are generally under `/api/admin`.
- Experience routes are under `/api/experiences`.
- Project routes are under `/api/projects`.

Auth: Admin-protected routes require a valid JWT cookie (`token`) set by the login endpoint. Use Postman or a browser/axios that preserves cookies.

Env (server/.env):
- CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
- JWT_SECRET, JWT_EXPIRES_IN
- BCRYPT_SALT_ROUNDS, BCRYPT_PEPPER

File uploads: use multipart/form-data and the exact field names shown below. Do NOT manually set the Content-Type header; let your client do it.

---

## Admin

### POST /api/admin/signup
- Auth: Public
- Content-Type: multipart/form-data
- Files (required on signup):
  - `avatar`: File (image)
  - `resume`: File (pdf or doc)
- Body fields (text):
  - `Fname` (required)
  - `Lname` (optional)
  - `email` (required)
  - `password` (required)
- Result: Creates admin, uploads files to Cloudinary, sets auth cookie.

### POST /api/admin/login
- Auth: Public
- Content-Type: application/json
- Body:
```json
{ "email": "you@example.com", "password": "secret" }
```
- Result: Sets JWT cookie. Returns admin info including `resumeUrl`.

### POST /api/admin/logout
- Auth: Cookie required
- Clears auth cookie.

### PATCH /api/admin/update
- Auth: Cookie required
- Content-Type:
  - application/json for profile-only updates, or
  - multipart/form-data when updating files
- Files (optional):
  - `avatar` (image)
  - `resume` (pdf/doc)
- Any profile fields can be partially updated. Replaced files will delete old Cloudinary assets automatically.

---

## Experiences

Public read endpoint for frontend and admin CRUD with optional file uploads.

### GET /api/experiences/public
- Auth: Public
- Returns experiences formatted for the frontend `expCards` shape:
  - `review`, `imgPath`, `logoPath`, `title`, `date`, `responsibilities`

### GET /api/experiences
- Auth: Cookie required
- Returns all experiences with full fields.

### GET /api/experiences/:id
- Auth: Cookie required

### POST /api/experiences
- Auth: Cookie required
- Content-Type:
  - application/json (no files), or
  - multipart/form-data (with files)
- File fields (optional):
  - `image`: File (image)
  - `logo`: File (image)
- Body fields (text):
  - `role` (required)
  - `company` (required)
  - `location` (optional)
  - `startDate` (ISO date string required)
  - `endDate` (optional)
  - `current` (true/false)
  - `responsibilities` (JSON array or comma-separated)
  - `tags` (JSON array or comma-separated)
  - `review` (optional)
  - `order` (number)
  - `published` (true/false)
- Behavior: Uploads `image` and `logo` to Cloudinary, stores URLs + public_ids.

### PATCH /api/experiences/:id
- Auth: Cookie required
- Same body rules as create.
- Files (optional): `image`, `logo` – if sent, old Cloudinary assets are deleted after successful replacement.

### DELETE /api/experiences/:id
- Auth: Cookie required
- Deletes doc and associated Cloudinary assets (if any).

---

## Projects

Public read endpoint and admin CRUD. Supports links, arrays, and file uploads.

### GET /api/projects/public
- Auth: Public
- Returns published projects sorted by `order`, then `createdAt`.

### GET /api/projects
- Auth: Cookie required

### GET /api/projects/:id
- Auth: Cookie required

### POST /api/projects
- Auth: Cookie required
- Content-Type:
  - application/json (no files), or
  - multipart/form-data (with files)
- File fields (optional):
  - `thumbnail`: File (image, max 1)
  - `images`: File[] (image, up to 10)
- Body fields (text):
  - `title` (required)
  - `slug` (required, unique)
  - `description`
  - `techStack` (JSON array or comma-separated)
  - `features` (JSON array or comma-separated)
  - `outcome`
  - `repoUrl` (link)
  - `demoUrl` (link)
  - `featured` (true/false)
  - `status` (planned | in_progress | completed | archived)
  - `order` (number)
  - `published` (true/false)
- Behavior: Uploads files to Cloudinary, stores URLs + public_ids (`thumbnailPublicId`, `imagesPublicIds`).

### PATCH /api/projects/:id
- Auth: Cookie required
- Same body rules as create.
- If `thumbnail` is provided, replaces old `thumbnail` and deletes old Cloudinary asset.
- If `images` are provided, replaces all existing images and deletes their old Cloudinary assets.

### DELETE /api/projects/:id
- Auth: Cookie required
- Deletes project and all associated Cloudinary assets.

---

## Frontend Integration

- Experiences:
  - Fetch from `GET /api/experiences/public`.
  - Data already shaped for cards: `review`, `imgPath`, `logoPath`, `title`, `date`, `responsibilities`.
- Projects:
  - Fetch from `GET /api/projects/public`.
  - Use fields: `title`, `slug`, `description`, `techStack`, `features`, `outcome`, `repoUrl`, `demoUrl`, `thumbnail`, `images`, `featured`, `status`.
- Admin dashboard (if applicable):
  - Use admin-protected endpoints with cookie-based auth.
  - For file uploads, ensure field names match exactly:
    - Experiences: `image`, `logo`
    - Projects: `thumbnail`, `images`
    - Admin: `avatar`, `resume`

---

## Posts

Lightweight social/content posts you can show as cards on the frontend.

Suggested schema fields (implemented similarly to Experiences/Projects):
- `platform` (string, required): e.g., "LinkedIn", "Twitter", "Dev.to"
- `title` (string, required)
- `link` (string, required): external post URL
- `tags` (string[])
- `image` (string): Cloudinary URL
- `imagePublicId` (string): Cloudinary public_id for cleanup
- `excerpt` (string)
- `published` (boolean)
- `order` (number)
- `createdAt`/`updatedAt` (timestamps)

Retention & performance
- Only the latest 10 posts are kept. When a new post is created and there are already 10, the oldest posts beyond the top 10 are deleted automatically along with their Cloudinary images.
- Indexed for fast queries: `createdAt` and `{ published, order, createdAt }`.
- Public lists return lean, projected fields for better performance.

Endpoints

### GET /api/posts/public
- Auth: Public
- Returns published posts sorted by `order`, then `createdAt`.
- Frontend card fields to use: `platform`, `title`, `link`, `image`, `tags`, `excerpt`.

### GET /api/posts
- Auth: Cookie required

### GET /api/posts/:id
- Auth: Cookie required

### POST /api/posts
- Auth: Cookie required
- Content-Type:
  - application/json (no files), or
  - multipart/form-data (with file)
- File fields (optional):
  - `image`: File (image)
- Body fields (text):
  - `platform` (required)
  - `title` (required)
  - `link` (required)
  - `tags` (JSON array or comma-separated)
  - `excerpt`
  - `order` (number)
  - `published` (true/false)
- Behavior: If `image` provided, uploads to Cloudinary (e.g., `portfolio/posts/image`), stores URL + public_id.
  - Retention: After creation, the API prunes older posts to keep only the latest 10 by `createdAt` (old images are also deleted from Cloudinary).

### PATCH /api/posts/:id
- Auth: Cookie required
- Same body rules as create.
- If `image` provided, replaces old image and deletes old Cloudinary asset.

### DELETE /api/posts/:id
- Auth: Cookie required
- Deletes post and associated Cloudinary image (if any).

---

## Contacts (Public Form)

Public endpoint to receive contact messages (no auth). Saves to DB and notifies you via one of several providers (no Nodemailer).

### POST /api/contacts
- Auth: Public
- Content-Type: application/json
- Body:
```json
{
  "name": "John Doe",
  "email": "john@company.com",   // required
  "topic": "Job opportunity",
  "message": "We'd like to discuss a role...",
  "type": "professional",        // professional | help | other
  "meta": { "company": "ACME" }
}
```
- Behavior:
  - Saves the message to DB.
  - Tries notification providers in order until one succeeds:
    1. EmailJS (REST API)
    2. Resend
    3. SendGrid
    4. Mailgun
  - Failures are logged but do not block the response.

Example (curl):
```bash
curl -X POST "$BASE_URL/api/contacts" \
  -H 'Content-Type: application/json' \
  -d '{
    "name":"John Doe",
    "email":"john@company.com",
    "topic":"Job opportunity",
    "message":"We\'d like to discuss a role...",
    "type":"professional"
  }'
```

Frontend example (fetch):
```js
await fetch("/api/contacts", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name, email, topic, message, type: "professional",
  }),
});
```

Frontend example (axios):
```js
await axios.post("/api/contacts", { name, email, topic, message, type: "help" });
```

Notification env vars (set the ones for the provider you use):
- EmailJS: `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `EMAILJS_PUBLIC_KEY`, `EMAILJS_ORIGIN`
- Resend: `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_TO` (or `CONTACT_TO_EMAIL`)
- SendGrid: `SENDGRID_API_KEY`, `SENDGRID_FROM`, `SENDGRID_TO` (or `CONTACT_TO_EMAIL`)
- Mailgun: `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_FROM`, `MAILGUN_TO` (or `CONTACT_TO_EMAIL`)

Sample .env (pick at least one provider):
```env
# EmailJS
EMAILJS_SERVICE_ID=your_service
EMAILJS_TEMPLATE_ID=your_template
EMAILJS_PUBLIC_KEY=your_public_key
EMAILJS_ORIGIN=http://localhost:5173

# Resend
# RESEND_API_KEY=...
# RESEND_FROM=Portfolio <noreply@yourdomain.com>
# RESEND_TO=you@yourdomain.com

# SendGrid
# SENDGRID_API_KEY=...
# SENDGRID_FROM=noreply@yourdomain.com
# SENDGRID_TO=you@yourdomain.com

# Mailgun
# MAILGUN_API_KEY=...
# MAILGUN_DOMAIN=mg.yourdomain.com
# MAILGUN_FROM=Portfolio <noreply@yourdomain.com>
# MAILGUN_TO=you@yourdomain.com

# Optional shared
# CONTACT_TO_EMAIL=you@yourdomain.com
```

Validation:
- `email` is required. Basic format is validated.
- `type` allowed values: `professional`, `help`, `other`.

### GET /api/contacts
- Auth: Cookie required (admin)
- Returns recent contacts (newest first).

---

## Quick Postman Tips
- Login first via `POST /api/admin/login`. Postman will store cookies automatically.
- For multipart requests, use Body → form-data and attach files. Do not set Content-Type manually.
- For arrays in form-data, send JSON strings like `[
  "React",
  "Node"
]`.

## Example create requests

Experience (form-data with files):
- image: File
- logo: File
- role: Frontend Developer
- company: Hostinger
- startDate: 2023-01-01
- current: true
- responsibilities: ["Build UI","Optimize"]
- tags: ["react","javascript"]
- review: Great collaboration
- published: true

Project (form-data with files):
- thumbnail: File
- images: File (add multiple rows to upload more images)
- title: Portfolio v2
- slug: portfolio-v2
- description: Next-gen portfolio
- techStack: ["React","Node","Cloudinary"]
- features: ["Dark mode","Blog"]
- outcome: Better UX
- repoUrl: https://github.com/user/portfolio-v2
- demoUrl: https://user.dev
- featured: true
- status: completed
- order: 1
- published: true

Admin update (form-data, optional files):
- avatar: File (optional)
- resume: File (optional)
- Fname: Kush
- Lname: K

---

## Errors & Troubleshooting
- 404 Cannot POST /api//api/... → Remove duplicate `/api/` in URL.
- MulterError: Unexpected field → Ensure file field names are exactly as documented.
- 401 Unauthorized → Login first; cookie must be sent with the request.
- Cloudinary upload failure → Check `.env` Cloudinary credentials and internet connectivity.

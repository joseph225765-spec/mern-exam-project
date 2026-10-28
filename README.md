# mern-exam-project
MERN Stack Coding Examination Projec
# Job Application Tracker

A MERN application for recording and tracking job applications.

## Run locally

1. Create `backend/.env` with `MONGODB_URI` set to a MongoDB connection string.
2. In `backend`, run `npm install` and `npm run dev`.
3. In `frontend`, run `npm install` and `npm run dev`.
4. Open the frontend address shown by Vite.

## API endpoints

- `GET /api/health` — check the database connection.
- `GET /api/applications` — list applications.
  - Optional query parameters: `company` and `status`.
- `POST /api/applications` — create an application.
- `PUT /api/applications/:id` — edit an application.
- `PATCH /api/applications/:id/status` — change status.
- `DELETE /api/applications/:id` — delete an eligible application.

## Screenshots

Add two screenshots of the working application here before submission.
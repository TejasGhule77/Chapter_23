# Chapter 23 — Setup & Operating Guide

This document outlines the architecture, configuration, and operation of **Chapter 23 – The Memory House (C23)** following the completed migration to Express and MongoDB.

---

## 1. Credentials for Administrator

The designated administrative account is pre-configured and automatically seeded into MongoDB on server startup:

- **Admin Email**: `prachimohite1711@gmail.com`
- **Admin Password**: `Prachimohite@2309`
- **Role**: `admin`

Sign in using the **Account ↗** button on the website. Once logged in as an administrator, the private **Admin ↗** button activates in the navigation header.

---

## 2. Configuration & Environment Variables

All sensitive values reside in `backend/.env`. A template is provided at `backend/.env.example`.

| Variable | Description | Default |
|---|---|---|
| `PORT` | Express server port | `5000` |
| `NODE_ENV` | Application environment | `development` / `production` |
| `MONGODB_URI` | MongoDB Atlas or local connection URI | `mongodb://127.0.0.1:27017/chapter23_db` |
| `JWT_SECRET` | Signing secret for authentication tokens | Secure random key |
| `INITIAL_ADMIN_EMAIL` | Auto-seeded admin email | `prachimohite1711@gmail.com` |
| `INITIAL_ADMIN_PASSWORD` | Auto-seeded admin password | `Prachimohite@2309` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name (optional) | Fallback to local storage |
| `CLOUDINARY_API_KEY` | Cloudinary API key (optional) | Fallback to local storage |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret (optional) | Fallback to local storage |
| `EMAIL_USER` / `EMAIL_PASS` | SMTP credentials for email alerts | Logs cleanly in dev mode |

---

## 3. How to Run Locally

1. **Start MongoDB**:
   Ensure MongoDB is running locally on port 27017, or specify a MongoDB Atlas URI in `backend/.env`.
2. **Start Backend**:
   ```bash
   cd backend
   npm install
   npm start
   ```
3. **Open the Website**:
   Navigate to [http://localhost:5000](http://localhost:5000). The Express server serves both the backend API and the frontend website with all original visual assets, typography, and cover art intact.

---

## 4. Supabase Migration

- The previous Supabase client library and anon key references have been replaced with the Express REST API.
- If you have an existing export from Supabase (e.g., `supabase-export.json`), run the included migration script to import historical customer profiles and orders into MongoDB:
  ```bash
  cd backend
  npm run migrate supabase-export.json
  ```
- The original Supabase setup file `supabase-setup.sql` is retained in the root directory for historical reference.

# Chapter 23 — GitHub & Vercel Deployment Guide

This guide provides step-by-step instructions to push your Chapter 23 project to **GitHub** and deploy it live to **Vercel**.

---

## Part 1: Push Project to Your GitHub Account

### Step 1: Create a New Repository on GitHub
1. Open your web browser and navigate to [github.com/new](https://github.com/new).
2. Set **Repository name** (e.g., `chapter23` or `chapter23-memory-house`).
3. Set the visibility to **Public** or **Private**.
4. **Important**: Leave "Initialize this repository with: Add a README, .gitignore, license" **UNCHECKED** (our project already contains these files).
5. Click **Create repository**.
6. Copy your repository's URL (e.g., `https://github.com/YOUR_USERNAME/chapter23.git`).

### Step 2: Link and Push from Your Terminal
Open PowerShell or Command Prompt at `d:\C23`:

```powershell
cd d:\C23

# Rename the default branch to main
git branch -M main

# Add your GitHub repository as the remote origin
# (Replace YOUR_USERNAME and YOUR_REPO with your actual GitHub username and repository name)
git remote add origin https://github.com/YOUR_USERNAME/chapter23.git

# Push your code to GitHub
git push -u origin main
```

*(If prompted, sign in to your GitHub account in the browser or enter your GitHub Personal Access Token).*

Your complete project—with history, tests, frontend, and backend—is now safely stored on GitHub!

---

## Part 2: Set Up MongoDB Atlas (Cloud Database)

Because Vercel is a serverless cloud platform, it requires a cloud database (MongoDB Atlas) rather than your local computer's `localhost`:

1. Sign up or log in at [cloud.mongodb.com](https://cloud.mongodb.com/).
2. Create a **Shared Cluster (Free M0)**:
   - Provider: AWS (or any of your choice).
   - Region: Select a region closest to your users (e.g. Mumbai, Frankfurt, Virginia).
3. Under **Security → Quickstart**:
   - **Username**: Enter a username (e.g. `c23_admin`).
   - **Password**: Create a secure password (save this!).
   - Click **Create Database User**.
4. Under **Network Access**:
   - Click **Add IP Address**.
   - Choose **Allow Access from Anywhere** (`0.0.0.0/0`). *(Required so Vercel's serverless functions can connect).*
   - Click **Confirm**.
5. Under **Deployment → Database**:
   - Click **Connect** → **Drivers** → Driver: **Node.js**.
   - Copy your connection string:
     ```
     mongodb+srv://<username>:<password>@cluster0.mongodb.net/chapter23_db?retryWrites=true&w=majority
     ```
   - Replace `<username>` and `<password>` with the credentials you just created.

---

## Part 3: Deploy to Vercel

### Method A: Deploy via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com/) and sign in with your GitHub account.
2. Click **"Add New…"** → **"Project"**.
3. Under **"Import Git Repository"**, find your `chapter23` repository and click **Import**.
4. In the **Configure Project** screen:
   - **Project Name**: `chapter23` (or any custom name).
   - **Framework Preset**: Leave as **Other**.
   - **Root Directory**: Leave as `./` (the root).
5. Expand **Environment Variables** and add the following keys:

| Key | Value | Notes |
|---|---|---|
| `MONGODB_URI` | `mongodb+srv://...` | Your MongoDB Atlas connection string from Part 2 |
| `JWT_SECRET` | `chapter23_secure_jwt_secret_memory_house_2026` | Or any long random string |
| `NODE_ENV` | `production` | Production mode |
| `INITIAL_ADMIN_EMAIL` | `prachimohite1711@gmail.com` | Your administrator login email |
| `INITIAL_ADMIN_PASSWORD` | `Prachimohite@2309` | Your administrator password |
| `INITIAL_ADMIN_NAME` | `Prachi Mohite` | Administrator name |
| `CLOUDINARY_CLOUD_NAME` | *(Optional)* | For cloud image uploads |
| `CLOUDINARY_API_KEY` | *(Optional)* | For cloud image uploads |
| `CLOUDINARY_API_SECRET` | *(Optional)* | For cloud image uploads |

6. Click **Deploy**.

Vercel will build and deploy your application in under 60 seconds!

---

### Method B: Deploy via Vercel CLI (Alternative)

If you prefer deploying directly from your terminal:

```powershell
cd d:\C23

# Deploy using Vercel CLI
npx vercel
```
Follow the terminal prompts:
- Set up and deploy `d:\C23`? **Y**
- Which scope? Select your personal Vercel account.
- Link to existing project? **N**
- What's your project's name? `chapter23`
- In which directory is your code located? `./`
- Want to modify these settings? **N**

To set the production environment variables via CLI:
```powershell
npx vercel env add MONGODB_URI production
# (Paste your MongoDB Atlas URI when prompted)

npx vercel env add JWT_SECRET production
npx vercel env add INITIAL_ADMIN_EMAIL production
npx vercel env add INITIAL_ADMIN_PASSWORD production

# Deploy to production
npx vercel --prod
```

---

## Part 4: Verify Your Live Vercel Deployment

Once deployed, Vercel gives you a live HTTPS domain (e.g. `https://chapter23.vercel.app`):

1. **Visit your website**: Open `https://your-domain.vercel.app`.
   - The original website design, DM Sans & Caslon typography, and 48 magazine covers load instantly.
2. **Test Admin Sign-in**:
   - Click **Account ↗** in the header.
   - Email: `prachimohite1711@gmail.com`
   - Password: `Prachimohite@2309`
   - **Admin ↗** appears in the top navigation.
3. **Open the Admin Studio**:
   - Verify the top operational statistics.
   - Publish video interview slots.
   - Review customer orders, questionnaire answers, and photo submissions.
4. **Place a Customer Order**:
   - Sign out or open an Incognito tab.
   - Create a test customer account, commission an edition, and book a video interview slot.

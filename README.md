# Chapter 23 — The Memory House (C23)

> **Independent Memory Publishing House** — Every life deserves an edition.  
> Bespoke printed memory books and editorial magazines celebrating birthdays, weddings, anniversaries, and family legacies.

---

## Architecture Overview

- **Frontend**: Pure HTML5, CSS3, DM Sans / DM Mono / Instrument Serif typography, preserved custom editorial covers and animations.
- **Backend**: Node.js & Express.js REST API with Helmet security headers, CORS with credentials, express-rate-limit, and cookie-parser.
- **Database**: MongoDB (Atlas or Local) via Mongoose schemas with ObjectId relations, audit trails, and indexes.
- **Authentication**: JWT stored in secure HTTP-only cookies and Bearer tokens; password hashing with bcryptjs (10 salt rounds).
- **Personalized Video Interviews**: Integrated slot creation and booking, timezone handling, Google Meet and Zoom support, structured 8-question narrative collection.
- **Photo & Memory Collection**: Multi-photo upload (JPEG, PNG, WebP up to 15MB) with captions, individuals featured, dates/years, and story notes. Supports Cloudinary and local disk storage fallback.
- **Notifications**: MongoDB in-app notifications feed with unread count badges and transactional email notifications via Nodemailer.

---

## Default Admin Credentials

The initial administrator account is automatically verified and seeded on server startup:

- **Email**: `prachimohite1711@gmail.com`
- **Password**: `Prachimohite@2309`
- **Role**: `admin`

*(Administrators access the private **Admin ↗** console in the website header, which provides top-level metrics, customer archives, order management, interview slot publishing, questionnaire notes, and photo curation).*

---

## Quick Start (Local Development)

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [MongoDB](https://www.mongodb.com/try/download/community) installed locally, OR a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster URI.

### 2. Install Dependencies
```bash
cd backend
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(The defaults connect to `mongodb://127.0.0.1:27017/chapter23_db` and initialize the designated admin account).*

### 4. Start the Application
Run the backend server:
```bash
cd backend
npm start
```

The Express server serves both the backend API (`http://localhost:5000/api`) and the frontend website:
- **Website & Portal**: [http://localhost:5000](http://localhost:5000)
- **API Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

*(Alternatively, if running the frontend via Live Server on port 5500, `chapter23-config.js` automatically directs API calls to `http://localhost:5000/api`).*

### 5. Run the Automated Test Suite
To verify all 22 end-to-end integration and security test scenarios:
```bash
cd backend
npm test
```

---

## MongoDB Atlas Connection Instructions

To connect to a cloud MongoDB Atlas database:

1. Sign in to [MongoDB Atlas](https://cloud.mongodb.com/).
2. Create a free M0 cluster (e.g. `chapter23-cluster`).
3. Under **Database Access**, create a database user with read and write privileges.
4. Under **Network Access**, add `0.0.0.0/0` (or your host server's IP address).
5. Click **Connect** → **Connect your application** → Driver: **Node.js**.
6. Copy the connection string and paste it into `backend/.env`:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/chapter23_db?retryWrites=true&w=majority
   ```

---

## Customer & Editorial Workflow

1. **Order Submission**:
   Customer signs in and submits an enquiry for an edition (e.g., *The Legacy Collection*, *The It Girl Issue*). Status: `Requested`, Payment: `Pending`.
2. **Order Confirmation**:
   Admin opens **Admin ↗** → Orders, verifies the request, and changes status to `Confirmed`. An `Interview` record is automatically created and the customer receives an email and in-app notification.
3. **Interview Scheduling**:
   - Admin goes to **Admin ↗** → Video Interviews and creates available slots (Date, time, duration, Google Meet or Zoom URL).
   - Customer opens **My Account ↗** → Manage Edition & Media, views available times, and selects a slot. Double booking is atomically prevented.
4. **Editorial Story Interview**:
   Both parties join via the meeting link. The admin records narrative answers to the 8 core story questions:
   - What makes this occasion special?
   - Key people in the story?
   - Most memorable moments?
   - Emotions the magazine should communicate?
   - Memories that should never be forgotten?
   - Important dates and milestones?
   - Final message or dedication?
5. **Photo & Memory Collection**:
   Admin marks the interview as `Completed`, which automatically advances order status to `Photos Pending` and prompts the customer.
   The customer uploads photographs (JPEG, PNG, WebP) with captions, individuals featured, dates, and memory stories.
6. **Photo Review & Curation**:
   Admin reviews submitted photographs, marks them as `Approved` or `Replacement Requested` with specific feedback, or requests additional photos.
   Once complete, admin clicks **Mark Collection As Received ↗**; status advances to `Photos Received`.
7. **Production & Fulfillment**:
   Admin verifies payment (`Paid`), moves order to `In Production`, then `Shipped`, and finally `Completed`.

---

## API Reference

### Authentication
- `POST /api/auth/register` — Register a new customer (`name`, `email`, `password`, `confirmPassword`).
- `POST /api/auth/login` — Sign in with email and password. Sets HTTP-only cookie and returns JWT.
- `POST /api/auth/logout` — Clears authentication cookie.
- `GET /api/auth/me` — Fetches current authenticated user session.

### Customer
- `GET /api/users/profile` — View current customer profile.
- `PATCH /api/users/profile` — Update name or phone number.
- `GET /api/users/orders` — View customer's orders.

### Orders
- `POST /api/orders` — Submit a new order request (`occasion`, `edition`, `notes`, `customerName`).
- `GET /api/orders/my-orders` — List current customer's orders.
- `GET /api/orders/:id` — View specific order (protected by customer ownership or admin role).
- `GET /api/orders/:id/history` — Audit trail of status and payment changes.
- `GET /api/orders` *(Admin)* — Filter, search, and list all orders.
- `PATCH /api/orders/:id/status` *(Admin)* — Update order status (triggers interview / photo notifications).
- `PATCH /api/orders/:id/payment` *(Admin)* — Update payment verification status.
- `PATCH /api/orders/:id/internal-notes` *(Admin)* — Save internal notes.

### Interviews
- `GET /api/interviews/available-slots` — View unbooked future slots.
- `POST /api/interviews/book` — Customer books slot for their order (prevents double-booking).
- `GET /api/interviews/my-interviews` — List customer's interviews.
- `POST /api/interviews/:id/reschedule-request` — Request reschedule.
- `POST /api/interviews/admin/slots` *(Admin)* — Publish new available slot.
- `GET /api/interviews/admin/slots` *(Admin)* — List all slots.
- `DELETE /api/interviews/admin/slots/:id` *(Admin)* — Delete unbooked slot.
- `PATCH /api/interviews/admin/:id` *(Admin)* — Update meeting link or mark Completed.
- `GET /api/interviews/admin/:id/notes` *(Admin)* — Fetch questionnaire answers.
- `POST /api/interviews/admin/notes` *(Admin)* — Save questionnaire answers.

### Photographs & Memories
- `POST /api/orders/:id/photos` — Upload multiple images (multipart/form-data) with metadata.
- `GET /api/orders/:id/photos` — Retrieve photos for an order.
- `DELETE /api/photos/:id` — Delete a submitted photo before approval.
- `PATCH /api/photos/admin/photos/:id/status` *(Admin)* — Mark photo as `Approved` or `Replacement Requested`.
- `POST /api/photos/admin/orders/:id/request-photos` *(Admin)* — Request additional photos.
- `POST /api/photos/admin/orders/:id/mark-photos-received` *(Admin)* — Mark entire collection received.

### Notifications
- `GET /api/notifications` — Fetch in-app notifications.
- `PATCH /api/notifications/:id/read` — Mark notification read.
- `POST /api/notifications/read-all` — Mark all notifications read.

### Admin Operations
- `GET /api/admin/dashboard` — Top-level metrics overview.
- `GET /api/admin/customers` — Search registered customers and order progress.
- `GET /api/admin/customers/:id` — Customer dossier with sign-in history.
- `GET /api/admin/logins` — Sign-in audit log.

---

## Production Deployment (e.g. Render / Railway)

1. **Repository**: Push the repository to GitHub.
2. **Web Service**: Create a new Web Service on Render / Railway pointing to the repo.
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
3. **Environment Variables**:
   Add the variables from `.env.example`:
   - `NODE_ENV=production`
   - `PORT=5000`
   - `MONGODB_URI=<your MongoDB Atlas connection string>`
   - `JWT_SECRET=<strong random secret>`
   - `INITIAL_ADMIN_EMAIL=prachimohite1711@gmail.com`
   - `INITIAL_ADMIN_PASSWORD=Prachimohite@2309`
   - `CLIENT_URL=https://your-custom-domain.com`
   - *(Optional)* Cloudinary and email SMTP variables.
4. **Deploy**: Deploy the service. The frontend and backend run seamlessly together.

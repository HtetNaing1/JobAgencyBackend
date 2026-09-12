# Job Agency System - Backend API

REST API for the Job Agency System, a platform that connects job seekers, employers, and training centers. Built with Node.js, Express, and MongoDB.

Frontend repository: https://github.com/HtetNaing1/JobAgencyFrontend

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running the Server](#running-the-server)
- [Seeding the Database](#seeding-the-database)
- [API Reference](#api-reference)
- [Data Models](#data-models)
- [Authentication and Authorization](#authentication-and-authorization)
- [File Uploads](#file-uploads)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Deployment Notes](#deployment-notes)

---

## Overview

The API serves four user roles, each with its own permissions and endpoints:

| Role | Capabilities |
| --- | --- |
| `jobseeker` | Build a profile, upload a resume, search and apply for jobs, bookmark jobs and courses, receive job recommendations, submit course inquiries |
| `employer` | Manage a company profile, post and manage jobs, review applications, shortlist candidates, schedule interviews, provide feedback |
| `training_center` | Manage a center profile, publish training courses, manage incoming course inquiries |
| `admin` | Platform dashboard, user management, job moderation, training center verification, analytics |

All responses follow a consistent JSON envelope:

```json
{ "success": true, "data": { } }
```

```json
{ "success": false, "message": "Description of the error" }
```

---

## Tech Stack

| Concern | Technology |
| --- | --- |
| Runtime | Node.js |
| Framework | Express 4 |
| Database | MongoDB with Mongoose 8 |
| Authentication | JSON Web Tokens (`jsonwebtoken`) |
| Password hashing | `bcryptjs` |
| Validation | `express-validator` |
| File uploads | `multer` (memory storage) with `streamifier` |
| Media storage | Cloudinary |
| Email | SendGrid or Brevo transactional API over HTTPS (`axios`) |
| Rate limiting | `express-rate-limit` |
| CORS | `cors` |
| Config | `dotenv` |
| Dev tooling | `nodemon` |

---

## Features

**Authentication and accounts**
- Registration with role selection and terms acceptance
- Login issuing a signed JWT
- Email verification with hashed, time-limited tokens (24 hour expiry)
- Forgot password and reset password with hashed tokens (1 hour expiry)
- Change password for authenticated users
- Account deletion
- Optional enforcement of email verification through `REQUIRE_EMAIL_VERIFICATION`

**Job seekers**
- Profile with skills, experience entries, education entries, and location
- Resume upload and deletion (PDF, stored on Cloudinary)
- Profile photo upload
- Application submission with resume and cover letter attachments
- Application tracking and withdrawal
- Bookmarks for jobs and courses

**Employers**
- Company profile with logo and cover image
- Full job lifecycle: create, update, pause, close, delete
- Applicant pipeline with per-application and bulk status updates
- Interview scheduling and structured candidate feedback
- Job view and application counters

**Training centers**
- Center profile with logo and contact details
- Course catalogue across categories, levels, delivery modes, and statuses
- Course inquiry inbox with status tracking
- Dashboard statistics

**Recommendations**
- Weighted match scoring between a job seeker profile and open jobs: skills 40 percent, experience 20 percent, education 15 percent, location 15 percent, with the remainder from additional signals
- Personalized recommended jobs for signed-in job seekers
- Public similar jobs lookup for any job

**Notifications**
- In-app notifications covering application receipt, status changes, shortlisting, rejection, interview scheduling and reminders, feedback, job recommendations, expired jobs, profile views, welcome messages, and course inquiries
- Unread counts, mark one or all as read, delete one or all

**Administration**
- Aggregate dashboard counts across users, jobs, applications, and courses
- Recent user and job activity feeds
- Application breakdown by status and a seven day registration trend
- User activation and deactivation, user deletion
- Job status moderation and removal
- Training center verification
- Analytics endpoint

---

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── cloudinary.js          Cloudinary SDK configuration
│   │   └── database.js            MongoDB connection
│   ├── controllers/
│   │   ├── adminController.js
│   │   ├── applicationController.js
│   │   ├── authController.js
│   │   ├── bookmarkController.js
│   │   ├── courseController.js
│   │   ├── employerController.js
│   │   ├── jobController.js
│   │   ├── jobSeekerController.js
│   │   ├── notificationController.js
│   │   ├── recommendationController.js
│   │   └── trainingCenterController.js
│   ├── middleware/
│   │   ├── auth.js                JWT verification and role authorization
│   │   ├── checkRole.js           Role guard used by profile routes
│   │   ├── rateLimiter.js         API, auth, registration, and reset limiters
│   │   └── upload.js              Multer configurations per upload type
│   ├── models/
│   │   ├── Application.js
│   │   ├── Bookmark.js
│   │   ├── CourseInquiry.js
│   │   ├── EmployerProfile.js
│   │   ├── Job.js
│   │   ├── JobSeekerProfile.js
│   │   ├── Notification.js
│   │   ├── TrainingCenterProfile.js
│   │   ├── TrainingCourse.js
│   │   └── User.js
│   ├── routes/
│   │   ├── adminRoutes.js
│   │   ├── applicationRoutes.js
│   │   ├── authRoutes.js
│   │   ├── bookmarkRoutes.js
│   │   ├── courseRoutes.js
│   │   ├── employerRoutes.js
│   │   ├── jobRoutes.js
│   │   ├── jobSeekerRoutes.js
│   │   ├── notificationRoutes.js
│   │   ├── recommendationRoutes.js
│   │   └── trainingCenterRoutes.js
│   ├── scripts/
│   │   └── seedData.js            Demo data seeder
│   ├── utils/
│   │   ├── createNotification.js  Notification helpers
│   │   ├── jobRecommendation.js   Match scoring algorithm
│   │   ├── jwt.js                 Token signing and verification
│   │   └── sendEmail.js           SendGrid and Brevo delivery
│   └── server.js                  Application entry point
├── .env.example
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18 or later
- A MongoDB database (MongoDB Atlas free tier is sufficient)
- A Cloudinary account for resume and image storage
- A SendGrid or Brevo account if you want outbound email

### Installation

```bash
git clone https://github.com/HtetNaing1/JobAgencyBackend.git
cd JobAgencyBackend
npm install
cp .env.example .env
```

Then fill in `.env` as described below. At minimum the server needs `MONGODB_URI` and `JWT_SECRET`; it exits on startup without the first and cannot issue tokens without the second.

---

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `NODE_ENV` | No | `development` or `production`. Controls whether error details are returned. |
| `PORT` | No | Port to listen on. Defaults to `5001`. Port `5000` is avoided because macOS uses it for the AirPlay Receiver service. |
| `MONGODB_URI` | Yes | MongoDB connection string. |
| `JWT_SECRET` | Yes | Secret used to sign access tokens. |
| `JWT_EXPIRE` | No | Token lifetime, for example `24h`. |
| `FRONTEND_URL` | Yes | Allowed CORS origin. Defaults to `http://localhost:3000`. |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud name. |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret. |
| `SENDGRID_API_KEY` | No | If set, email is sent through SendGrid. Takes priority over Brevo. |
| `BREVO_API_KEY` | No | Used when SendGrid is not configured. |
| `EMAIL_FROM_ADDRESS` | No | Sender address. Defaults to `noreply@jobagency.com`. |
| `EMAIL_FROM_NAME` | No | Sender display name. Defaults to `JobAgency`. |
| `REQUIRE_EMAIL_VERIFICATION` | No | Set to `true` to block login until the address is verified. |

Email is delivered over the SendGrid or Brevo HTTP API rather than SMTP, so no SMTP host, port, or credential settings are needed. If neither API key is set, the server still starts and logs a warning, but email-dependent flows such as password reset return an `EMAIL_NOT_CONFIGURED` error. The rest of the API continues to work.

The frontend reads the API base URL from its own `NEXT_PUBLIC_API_URL`, which defaults to `http://localhost:5001/api`. If you change `PORT` here, update that value to match.

---

## Running the Server

```bash
npm run dev     # development with nodemon auto-reload
npm start       # production
```

The server logs the active mode and port on startup. Confirm it is healthy with:

```bash
curl http://localhost:5001/api/health
# { "status": "ok", "message": "Server is running" }
```

---

## Seeding the Database

```bash
npm run seed
```

The seeder clears all existing collections and inserts a demo dataset: one admin, three employers with company profiles and job postings, ten job seekers with full profiles, two training centers with published courses, and a set of applications across different pipeline stages.

Every seeded account uses the password `Test1234!`.

| Role | Example account |
| --- | --- |
| Admin | `admin@jobagency.com` |
| Employer | `hr@techcorp.com`, `hiring@innovate.io`, `careers@globalfinance.com` |
| Job seeker | `john.doe@email.com`, `jane.smith@email.com`, and eight more |
| Training center | `info@techacademy.com`, `contact@skillsboost.com` |

The seeder is destructive. Do not run it against a database that holds data you want to keep.

---

## API Reference

Base URL: `http://localhost:5001/api`

Protected routes expect an `Authorization: Bearer <token>` header. A few file-viewing routes also accept the token as a `?token=` query parameter so that documents can be opened in a new browser tab.

### Health

| Method | Endpoint | Access |
| --- | --- | --- |
| GET | `/health` | Public |

### Authentication `/api/auth`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/register` | Public | Create an account. Rate limited to 5 per hour per IP. |
| POST | `/login` | Public | Authenticate and receive a JWT. Rate limited to 10 per 15 minutes per IP. |
| GET | `/me` | Authenticated | Current user and profile. |
| POST | `/logout` | Authenticated | Invalidate the client session. |
| POST | `/forgot-password` | Public | Send a reset link. Rate limited to 3 per hour per IP. |
| POST | `/reset-password` | Public | Complete a reset with a token. |
| PUT | `/change-password` | Authenticated | Change password with the current one. |
| POST | `/verify-email` | Public | Verify an address with a token. |
| POST | `/resend-verification` | Public | Resend the verification email. |
| DELETE | `/delete-account` | Authenticated | Permanently delete the account. |

Registration validates that the email is well formed, the password is at least 8 characters, the role is one of `jobseeker`, `employer`, or `training_center`, and that terms were accepted.

### Job seekers `/api/jobseekers`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/profile` | Job seeker | Own profile. |
| POST | `/profile` | Job seeker | Create or update own profile. |
| GET | `/profile/:userId` | Employer, admin | View an applicant profile. |
| POST | `/resume` | Job seeker | Upload a resume. Field `resume`, PDF, max 5 MB. |
| DELETE | `/resume` | Job seeker | Remove the stored resume. |
| POST | `/photo` | Job seeker | Upload a profile photo. Field `photo`, max 10 MB. |
| POST | `/experience` | Job seeker | Add a work experience entry. |
| DELETE | `/experience/:expId` | Job seeker | Remove a work experience entry. |
| POST | `/education` | Job seeker | Add an education entry. |
| DELETE | `/education/:eduId` | Job seeker | Remove an education entry. |

### Employers `/api/employers`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/` | Public | List employers. |
| GET | `/profile/:userId` | Public | Public company profile. |
| GET | `/:userId/jobs` | Public | Jobs posted by an employer. |
| GET | `/profile` | Employer | Own company profile. |
| POST | `/profile` | Employer | Create or update own company profile. |
| POST | `/logo` | Employer | Upload a company logo. Field `logo`, max 5 MB. |
| POST | `/cover` | Employer | Upload a cover image. Field `cover`, max 10 MB. |

### Jobs `/api/jobs`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/` | Public | Search and filter jobs. |
| GET | `/recommended` | Job seeker | Personalized job matches. |
| GET | `/:id` | Public | Job detail. |
| POST | `/:id/view` | Public | Increment the view counter. |
| POST | `/` | Employer | Create a job posting. |
| GET | `/employer/me` | Employer | Own job postings. |
| PUT | `/:id` | Employer | Update a job. |
| PUT | `/:id/status` | Employer | Change status between draft, active, paused, and closed. |
| DELETE | `/:id` | Employer | Delete a job. |

### Applications `/api/applications`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/` | Job seeker | Apply to a job. Multipart fields `resume` and `coverLetter`, PDF or Word, max 5 MB each. |
| GET | `/` | Job seeker | Own applications. |
| GET | `/check/:jobId` | Job seeker | Whether the job has already been applied to. |
| PUT | `/:id/withdraw` | Job seeker | Withdraw an application. |
| GET | `/employer` | Employer | All applications across own jobs. |
| GET | `/job/:jobId` | Employer | Applications for a single job. |
| PUT | `/bulk-status` | Employer | Update several applications at once. |
| PUT | `/:id/status` | Employer | Update one application status. |
| POST | `/:id/feedback` | Employer | Send structured feedback. |
| POST | `/:id/interview` | Employer | Schedule an interview. |
| GET | `/:id` | Authenticated | Application detail, visible to both parties. |

Application status values: `pending`, `reviewed`, `shortlisted`, `interview`, `rejected`, `hired`, `withdrawn`. Every status change is appended to a `statusHistory` array with a timestamp.

A unique compound index on `job` and `jobSeeker` prevents duplicate applications.

### Training centers `/api/training-centers`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/` | Public | List training centers. |
| GET | `/user/:userId` | Public | Center profile by user id. |
| GET | `/:id` | Public | Center profile by profile id. |
| GET | `/me/profile` | Training center | Own profile. |
| GET | `/me/dashboard` | Training center | Dashboard statistics. |
| POST | `/profile` | Training center | Create or update own profile. |
| PUT | `/profile` | Training center | Create or update own profile. |
| POST | `/logo` | Training center | Upload a logo. Field `logo`, max 5 MB. |

### Courses `/api/courses`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/categories` | Public | Available course categories. |
| GET | `/` | Public | Browse and filter courses. |
| GET | `/center/:centerId` | Public | Courses for one center. |
| GET | `/:id` | Public | Course detail. |
| POST | `/:id/view` | Public | Increment the view counter. |
| POST | `/` | Training center | Create a course. |
| PUT | `/:id` | Training center | Update a course. |
| DELETE | `/:id` | Training center | Delete a course. |
| GET | `/me/courses` | Training center | Own courses. |
| GET | `/me/inquiries` | Training center | Incoming inquiries. |
| PUT | `/inquiries/:inquiryId` | Training center | Update inquiry status. |
| POST | `/:id/inquiry` | Job seeker | Submit an inquiry. |
| GET | `/:id/my-inquiry` | Job seeker | Own inquiry for a course. |
| GET | `/user/inquiries` | Job seeker | All own inquiries. |

Course categories include Programming and Development, Data Science and Analytics, Cloud Computing, Cybersecurity, Project Management, Business and Management, Design and Creative, Marketing and Sales, and Finance and Accounting. Levels are `beginner`, `intermediate`, `advanced`, and `all-levels`. Delivery modes are `online`, `in-person`, and `hybrid`. Course statuses are `draft`, `published`, `archived`, and `full`. Inquiry statuses are `pending`, `contacted`, `enrolled`, and `closed`.

### Bookmarks `/api/bookmarks`

All routes require the `jobseeker` role.

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/` | All bookmarks. |
| GET | `/ids` | Bookmarked ids only, for fast client-side lookups. |
| GET | `/check/:itemType/:itemId` | Whether an item is bookmarked. |
| POST | `/` | Add a bookmark. |
| POST | `/toggle` | Toggle a bookmark. |
| DELETE | `/:itemType/:itemId` | Remove a bookmark. |

`itemType` is either `job` or `course`.

### Notifications `/api/notifications`

All routes require authentication.

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/` | List notifications. |
| GET | `/unread-count` | Unread count for the navigation badge. |
| PUT | `/:id/read` | Mark one as read. |
| PUT | `/read-all` | Mark all as read. |
| DELETE | `/:id` | Delete one. |
| DELETE | `/all` | Delete all. |

### Recommendations `/api/recommendations`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/` | Job seeker | Personalized recommendations with match scores. |
| GET | `/similar/:jobId` | Public | Jobs similar to a given job. |

### Admin `/api/admin`

All routes require the `admin` role.

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/dashboard` | Platform counts, recent activity, application breakdown, registration trend. |
| GET | `/users` | List users. |
| PUT | `/users/:id/status` | Activate or deactivate a user. |
| DELETE | `/users/:id` | Delete a user. |
| GET | `/jobs` | List all jobs for moderation. |
| PUT | `/jobs/:id/status` | Change a job status. |
| DELETE | `/jobs/:id` | Delete a job. |
| GET | `/training-centers` | List centers for verification. |
| PUT | `/training-centers/:id/verify` | Set verification state. |
| GET | `/analytics` | Aggregated platform analytics. |

---

## Data Models

| Model | Purpose |
| --- | --- |
| `User` | Credentials, role, verification and activation flags, reset and verification tokens. Passwords are hashed with bcrypt in a pre-save hook. |
| `JobSeekerProfile` | Personal details, skills, experience, education, location, resume and photo URLs. |
| `EmployerProfile` | Company details, contact person, logo, cover image. |
| `TrainingCenterProfile` | Center details, contact information, logo, verification state. |
| `Job` | Title, description, requirements, job type, location, salary range, benefits, status, deadline, view and application counters. |
| `Application` | Job, applicant, employer, status, resume and cover letter, feedback, interview details, status history, profile snapshot at submission time. |
| `TrainingCourse` | Title, category, level, duration, delivery mode, pricing, status. |
| `CourseInquiry` | Inquirer, course, message, status. |
| `Bookmark` | Saved job or course for a job seeker. |
| `Notification` | Typed in-app notification with read state. |

Indexes are defined for the queries the application actually performs, including a text index on job title and description, compound indexes on status and posted date, indexes on employer, skills, job type, and location, and the unique application index described above.

`Job` validates that the minimum salary does not exceed the maximum before saving. `Application` appends to `statusHistory` whenever the status changes.

---

## Authentication and Authorization

Tokens are signed with `JWT_SECRET` and carry the user id. The `protect` middleware reads the token from the `Authorization: Bearer` header, falling back to a `token` query parameter, verifies it, loads the user, and attaches it to `req.user`. Requests without a valid token receive `401`.

Role checks are applied with `authorize('employer')` or the equivalent `checkRole` helper. A mismatch returns `403` with the offending role named in the message.

---

## File Uploads

Uploads use `multer` memory storage and are streamed to Cloudinary with `streamifier`, so no files are written to local disk.

| Upload | Field | Accepted types | Limit |
| --- | --- | --- | --- |
| Resume | `resume` | PDF | 5 MB |
| Application attachments | `resume`, `coverLetter` | PDF, DOC, DOCX | 5 MB each |
| Profile or cover image | `photo`, `cover` | JPG, JPEG, PNG, WEBP | 10 MB |
| Logo | `logo` | JPG, JPEG, PNG, WEBP, SVG | 5 MB |

Rejected file types produce a descriptive error listing what is allowed.

---

## Rate Limiting

| Limiter | Window | Maximum | Applied to |
| --- | --- | --- | --- |
| General API | 15 minutes | 100 requests | Available for general use |
| Authentication | 15 minutes | 10 requests | `POST /auth/login`. Successful logins are not counted. |
| Registration | 1 hour | 5 requests | `POST /auth/register` |
| Password reset | 1 hour | 3 requests | `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/resend-verification` |

Limits are per IP and return standard `RateLimit-*` headers.

---

## Error Handling

A global error handler catches unhandled errors, logs the stack, and returns `500` with a generic message. The underlying error text is included only when `NODE_ENV` is `development`. Unmatched routes fall through to a `404` handler returning `Route not found`.

---

## Deployment Notes

- `app.set('trust proxy', 1)` is enabled so that rate limiting sees the real client IP behind a reverse proxy such as Render or Railway.
- CORS is restricted to `FRONTEND_URL` with credentials enabled. Set this to the deployed frontend origin.
- Set `NODE_ENV=production` so that internal error details are not exposed.
- Use a long random `JWT_SECRET` in production. Do not reuse the development value.
- `.env` is excluded from version control. Use `.env.example` as the reference for required keys.

---

## Author

Htet Naing

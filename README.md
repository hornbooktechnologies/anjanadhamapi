# Vishw Anjanadham Backend API

A production-ready Express.js, Node.js, and MySQL backend for the Vishw Anjanadham admin panel, with token-based JWT authentication and a custom RBAC (Role-Based Access Control) system.

## Features

- **No ORM**: Uses raw SQL queries with parameters via `mysql2/promise` to prevent SQL Injection.
- **Connection Pooling & Transactions**: Standard, reusable database helpers supporting connections, raw execution, and transaction execution.
- **Dynamic RBAC**: Dynamically validates incoming requests against permissions stored in the database.
- **Security Protocols**: Built-in protection via Helmet, CORS, and Express rate-limiting.
- **SMTP Mail Integration**: Uses Nodemailer to send emails, falling back to simulated mail outputs during development.
- **Validation**: Request payloads verified at the router level using Joi schemas.

---

## Folder Structure

```
src
 ├── config             # System configurations (DB, Mail, Env)
 ├── database           # Database SQL scripts and migrations
 ├── middlewares        # Core Express middlewares (Auth, Roles, Errors)
 ├── modules            # Self-contained feature modules (Auth, Roles, etc.)
 ├── routes             # Centralized routing definitions
 ├── utils              # Shared helper functions
 ├── app.js             # Express app setup and middleware configuration
 └── server.js          # HTTP Server bootstrapping
```

---

## Setup & Installation

### 1. Configure Environment Variables
Create a `.env` file in the root directory:

```env
PORT=5000
NODE_ENV=development
UPLOAD_DIR=/absolute/path/outside/api-repo/uploads

# Database Configs
DB_HOST=localhost
DB_USER=vishwlt9_anjanadham
DB_PASSWORD=Sukrit123$%
DB_NAME=vishwlt9_anjanadham
DB_PORT=3306

# JWT Configuration
JWT_SECRET=super_secret_jwt_access_token_key_123!
JWT_EXPIRY=15m
JWT_REFRESH_SECRET=super_secret_jwt_refresh_token_key_987!
JWT_REFRESH_EXPIRY=7d

# SMTP Configuration
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=dummy_user
SMTP_PASSWORD=dummy_password
SMTP_FROM="Vishwa Anjanadham <contact@hornbooktechnologies.com>"
SMTP_REPLY_TO=contact@hornbooktechnologies.com
SMTP_ADMIN_EMAIL=info@anjanadham.org

# Razorpay Standard Checkout (server only; both values are required)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Login OTP Delivery
LOGIN_OTP_RECIPIENT_EMAIL=panchal.mehul6015@gmail.com
```

The contact, membership, and volunteer forms send a simple thank-you email to
the applicant and a separate HTML table containing all submitted fields to
`SMTP_ADMIN_EMAIL`. Each delivery is attempted independently after the inquiry
is saved.

When both Razorpay keys are configured, donations use Standard Checkout with
server-created orders, signature verification, amount checks, and payment
capture before showing the thank-you modal. Payment failures and cancellations
show separate modals; an uncertain result shows a pending confirmation message.
Without these keys, the site retains its existing hosted Razorpay Payment Button.
That button reports success through its trusted iframe callback, while bank
declines remain inside Razorpay's hosted checkout.

### 2. Install Dependencies
```bash
npm install
```

### Upload Storage

Uploaded files should be stored outside the API repository so they survive code pushes and redeploys.

- Set `UPLOAD_DIR` to an absolute server path such as `/home/your-user/aanjnadham-uploads`.
- For local development, `UPLOAD_DIR=./uploads` uses the project's local upload folders.
- Old files in the legacy `uploads/` folder are still served for backward compatibility, but new uploads should use the external path.

### 3. Run Migrations & Seeding
This command sets up the tables and inserts default Super Admin role, permissions, and a default admin user.
```bash
npm run db:migrate
```

**Default Credentials Created:**
- **Email:** `admin@anjanadham.com`
- **Password:** `admin@123`

### 4. Start Server
```bash
# Production Mode
npm start

# Development Mode
npm run dev
```

---

## API Documentation

### Authentication (`/api/v1/auth`)

| Method | Endpoint | Description | Auth Required | Payload |
|--------|----------|-------------|---------------|---------|
| POST | `/register` | Register a new user | No | `{ name, email, password }` |
| POST | `/login` | Log in user, returns JWTs | No | `{ email, password }` |
| POST | `/logout` | Invalidates current session | Yes | - |
| GET | `/profile` | Fetch logged-in user profile | Yes | - |
| POST | `/change-password` | Update user password | Yes | `{ currentPassword, newPassword }` |
| POST | `/forgot-password` | Generate reset token & send email | No | `{ email }` |
| POST | `/reset-password` | Reset password using token | No | `{ token, password }` |

### Roles (`/api/v1/roles`)

| Method | Endpoint | Description | Permission | Payload |
|--------|----------|-------------|------------|---------|
| POST | `/` | Create a new role | `role.create` | `{ name, description }` |
| GET | `/` | Retrieve all roles | `dashboard.view` | - |
| PUT | `/:id` | Update an existing role | `role.update` | `{ name, description }` |
| DELETE| `/:id` | Delete a role | `role.delete` | - |
| POST | `/:id/permissions` | Map permissions to a role | `permission.manage` | `{ permissionIds: [id1, id2] }` |

### Permissions (`/api/v1/permissions`)

| Method | Endpoint | Description | Permission | Payload |
|--------|----------|-------------|------------|---------|
| POST | `/` | Create a permission | `permission.manage` | `{ name, module }` |
| GET | `/` | List all permissions | `permission.manage` | - |
| PUT | `/:id` | Update a permission | `permission.manage` | `{ name, module }` |
| DELETE| `/:id` | Delete a permission | `permission.manage` | - |

### User Roles (`/api/v1/users`)

| Method | Endpoint | Description | Permission | Payload |
|--------|----------|-------------|------------|---------|
| POST | `/:id/roles` | Assign roles to a user | `role.update` | `{ roleIds: [id1, id2] }` |

---

## Flows

### Extra local OTP console logging

For local development, set these values in the API's ignored `.env` file:

```env
NODE_ENV=development
LOGIN_OTP_LOG_TO_CONSOLE=true
```

Run `npm run dev`, enter your existing email and password in the admin login,
then read the six-digit OTP from the API server terminal and enter it in the
OTP form. The same OTP is also sent through the normal email delivery. The OTP still
expires in ten minutes and must pass the existing verification checks.
Its value is never included in the login API response.

Set `LOGIN_OTP_LOG_TO_CONSOLE=false` to disable the extra logging. Email delivery
always runs. Production and Vercel deployments do not add these console logs.

### 1. Authentication Flow
1. User logs in with email and password.
2. Server validates credentials against user table.
3. Server returns JWT Access Token (short-lived) and Refresh Token (long-lived).
4. Clients append the access token as `Bearer <token>` inside the `Authorization` header for protected endpoints.

### 2. Permission Verification Flow
1. Decoding the access token resolves the user ID.
2. `auth.middleware.js` queries `users` and assigns user details to `req.user`.
3. `permission.middleware.js` intercepts requests and fetches all role-permission definitions mapping to the logged-in user's assigned roles.
4. If the user's role contains `Super Admin`, authorization is bypassed.
5. If the required permission matches, request execution continues; otherwise, a `403 Forbidden` response is returned.

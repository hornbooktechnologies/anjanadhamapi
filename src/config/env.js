const dotenv = require("dotenv");
const path = require("path");

// Load env variables
dotenv.config({ path: path.join(__dirname, "../../.env") });
dotenv.config({ path: path.join(__dirname, "../../.env.local") });

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  uploadDir: process.env.UPLOAD_DIR,
  db: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || "3306", 10),
    connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT_MS || "10000", 10),
    queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT_MS || "15000", 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET || "jwt_secret",
    expiry: process.env.JWT_EXPIRY || "15m",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "refresh_secret",
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || "7d",
  },
  mail: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    replyTo: process.env.SMTP_REPLY_TO || process.env.SMTP_USER,
    adminEmail: process.env.SMTP_ADMIN_EMAIL || "info@anjanadham.org",
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
  },
  otp: {
    logToConsole: process.env.LOGIN_OTP_LOG_TO_CONSOLE === "true",
    recipientEmail:
      process.env.LOGIN_OTP_RECIPIENT_EMAIL || "panchal.mehul6015@gmail.com",
  },
};

const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const apiRouter = require("./routes");
const errorMiddleware = require("./middlewares/error.middleware");
const AppError = require("./utils/AppError");

const path = require("path");

const app = express();
const uploadDirectory = path.resolve(process.env.UPLOAD_DIR || "./uploads");

// Enable open CORS and answer preflight requests explicitly for production browsers/proxies.
app.use((req, res, next) => {
  const requestOrigin = req.headers.origin || "*";

  res.header("Access-Control-Allow-Origin", requestOrigin);
  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    req.headers["access-control-request-headers"] ||
      "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Expose-Headers", "Content-Length, Content-Type, Authorization");
  res.header("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  next();
});

// Set security HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);


// Body parser (reading data from body into req.body)
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

// Serve uploaded static files
app.use("/uploads", express.static(uploadDirectory));

// Root and health routes for Render/browser checks
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Vishw Anjanadham API is live",
    health: "/api/health",
  });
});

// API routing endpoint mounting
app.use("/api", apiRouter);

// Handle undefined routes
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handling middleware
app.use(errorMiddleware);

module.exports = app;

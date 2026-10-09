const app = require("./app");
const env = require("./config/env");

// Handle uncaughtException
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION! Shutting down...");
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

// Start server
const server = app.listen(env.port, () => {
  console.log(`Server running in ${env.nodeEnv} mode on port ${env.port}`);
  if (env.nodeEnv === 'development' && !process.env.VERCEL && env.otp.logToConsole) {
    console.log('Login OTP: email delivery is enabled; codes also appear in this API terminal.');
  }
});

// Vercel runs its authenticated daily cron; persistent local servers retry too.
if (!process.env.VERCEL) {
  const { processProfileCleanup } = require('./utils/profileCleanup');
  setInterval(() => processProfileCleanup().catch(error => {
    console.error('Scheduled profile cleanup will retry:', error.message);
  }), 5 * 60 * 1000).unref();
}

// Handle unhandledRejection
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION! Shutting down...");
  console.error(err.name, err.message, err.stack);
  server.close(() => {
    process.exit(1);
  });
});

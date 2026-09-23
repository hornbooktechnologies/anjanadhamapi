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
});

// Handle unhandledRejection
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION! Shutting down...");
  console.error(err.name, err.message, err.stack);
  server.close(() => {
    process.exit(1);
  });
});

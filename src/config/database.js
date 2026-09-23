const mysql = require("mysql2/promise");
const env = require("./env");
const AppError = require("../utils/AppError");

const DB_CONNECTIVITY_ERROR_CODES = new Set([
  "ETIMEDOUT",
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "EAI_AGAIN",
  "PROTOCOL_CONNECTION_LOST",
  "PROTOCOL_SEQUENCE_TIMEOUT",
]);

// Create MySQL connection pool
const pool = mysql.createPool({
  host: env.db.host,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  port: env.db.port,
  connectTimeout: env.db.connectTimeout,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

function getDatabaseErrorDetails(error) {
  return {
    message: error.message,
    code: error.code,
    errno: error.errno,
    sqlState: error.sqlState,
    fatal: error.fatal,
  };
}

function isDatabaseConnectivityError(error) {
  return DB_CONNECTIVITY_ERROR_CODES.has(error.code) || /timeout/i.test(error.message || "");
}

function toOperationalDatabaseError(error) {
  if (!isDatabaseConnectivityError(error)) {
    return error;
  }

  const appError = new AppError(
    "Database connection unavailable. Please verify live server access to the database host and port.",
    503
  );
  appError.code = error.code;
  appError.cause = error;
  return appError;
}

/**
 * Reusable DB helper for parameterized queries (prevent SQL injection).
 * @param {string} sql Raw SQL query string with placeholders (?)
 * @param {Array} params Parameter values mapping to placeholders
 * @returns {Promise<Array>} Results from query execution
 */
async function query(sql, params = []) {
  try {
    const [results] = await pool.query({ sql, timeout: env.db.queryTimeout }, params);
    return results;
  } catch (error) {
    console.error("Database query error:", {
      sql,
      dbHost: env.db.host,
      dbName: env.db.database,
      error: getDatabaseErrorDetails(error),
    });
    throw toOperationalDatabaseError(error);
  }
}

/**
 * Execute multiple database operations within a transaction.
 * @param {Function} callback Async callback function receiving connection object
 */
async function transaction(callback) {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Database rollback error:", {
          dbHost: env.db.host,
          dbName: env.db.database,
          error: getDatabaseErrorDetails(rollbackError),
        });
      }
    }
    console.error("Database transaction error:", {
      dbHost: env.db.host,
      dbName: env.db.database,
      error: getDatabaseErrorDetails(error),
    });
    throw toOperationalDatabaseError(error);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

module.exports = {
  pool,
  query,
  transaction,
};

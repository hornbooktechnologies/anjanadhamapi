const nodemailer = require("nodemailer");
const env = require("../config/env");

// Create transport
const transporter = nodemailer.createTransport({
  host: env.mail.host,
  port: env.mail.port,
  secure: env.mail.port === 465,
  auth: {
    user: env.mail.user,
    pass: env.mail.password,
  },
});

/**
 * Send an email
 * @param {object} options { to, subject, text, html }
 */
const sendMail = async ({ to, subject, text, html }) => {
  const mailOptions = {
    from: env.mail.from,
    to,
    subject,
    text,
    html,
  };

  // If using dummy/default credentials, fallback to console logging
  if (!env.mail.host || env.mail.user === "dummy_user") {
    console.log("---------------- MAIL SIMULATION ----------------");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log("Content:", text || html);
    console.log("-------------------------------------------------");
    return { messageId: "simulated-id-" + Date.now() };
  }

  return await transporter.sendMail(mailOptions);
};

module.exports = {
  sendMail,
};

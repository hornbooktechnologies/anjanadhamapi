const env = require('../config/env');
const { sendMail } = require('./mailer');

async function deliverLoginOtp({ otp, loginEmail, mailOptions }) {
  const logToConsole = env.nodeEnv === 'development' && !process.env.VERCEL && env.otp.logToConsole;
  if (logToConsole) {
    console.log('---------------- LOCAL LOGIN OTP ----------------');
    console.log('Login email:', loginEmail);
    console.log('OTP:', otp);
    console.log('Expires in 10 minutes.');
    console.log('-------------------------------------------------');
  }
  await sendMail(mailOptions);
}

module.exports = { deliverLoginOtp };

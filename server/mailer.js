
import nodemailer from "nodemailer";
import crypto from 'crypto';

// MOST BASIC: Console-only OTP logger
// This is a fallback that guarantees OTPs are always accessible
const consoleLogger = (to, otp) => {
  console.log("\n========================================");
  console.log(`🚨 VERIFICATION CODE: ${otp} 🚨`);
  console.log(`📧 EMAIL: ${to}`);
  console.log(`⏱️ EXPIRES: 3 minutes from now`);
  console.log("========================================\n");
  return { success: true };
};

// Create a reusable transporter object using SMTP transport
let transporter = null;

// Setup transporter only if credentials are available
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  try {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    console.log(`Email configured with: ${process.env.EMAIL_USER}`);
  } catch (err) {
    console.error("Failed to create email transporter:", err.message);
  }
} else {
  console.log("No email credentials found - will use console logging for OTPs");
}

// Export the mailer object with guaranteed fallback
export const mailer = {
  async sendOtp(to, otp) {
    // Always log to console first for guaranteed access to OTP
    consoleLogger(to, otp);
    
    // Skip email sending if no transporter
    if (!transporter) {
      console.log("Email transport not available - OTP displayed in console only");
      return { success: false, error: "Email transport not configured" };
    }
    
    try {
      // Format email with OTP code
      const mailOptions = {
        from: `"ADA University Voting" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: "Your ADA University Voting Verification Code",
        text: `Your verification code is: ${otp}. This code will expire in 3 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
            <h2 style="color: #005A9C; text-align: center;">ADA University Voting System</h2>
            <p>Your verification code is:</p>
            <div style="background-color: #f5f5f5; padding: 15px; text-align: center; margin: 20px 0; border-radius: 5px;">
              <p style="font-size: 24px; font-weight: bold; margin: 0; letter-spacing: 5px;">${otp}</p>
            </div>
            <p>This code will expire in <strong>3 minutes</strong>.</p>
          </div>
        `
      };
      
      // Send mail with defined transport object
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully to ${to} (${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`⚠️ Email delivery error: ${error.message}`);
      
      if (error.code === 'EAUTH') {
        console.error("🔑 Authentication failed - check EMAIL_USER and EMAIL_PASS");
      }
      
      // Already logged OTP to console, so we're covered
      return { success: false, error: error.message };
    }
  }
};

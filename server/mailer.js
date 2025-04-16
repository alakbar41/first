
import nodemailer from "nodemailer";
import crypto from 'crypto';

// Create a testAccount for development when real credentials aren't available
let testAccount;
let realTransport;
let testTransport;

// Create real transport if credentials are available
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  realTransport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  
  console.log(`Email configured with: ${process.env.EMAIL_USER}`);
}

// Export the mailer object
export const mailer = {
  async sendOtp(to, otp) {
    console.log(`Preparing to send OTP code to: ${to}`);
    
    try {
      // Use the real transport if available
      if (realTransport) {
        const mailOptions = {
          from: `"ADA University Voting" <${process.env.EMAIL_USER}>`,
          to,
          subject: "Your Verification Code",
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
        
        const info = await realTransport.sendMail(mailOptions);
        console.log(`✅ Email sent successfully to ${to}`);
        return info;
      } else {
        // If no real transport is available, log the OTP for testing
        console.log(`⚠️ No email credentials available - OTP for ${to}: ${otp}`);
        return { messageId: crypto.randomUUID() };
      }
    } catch (error) {
      // Enhanced error logging
      console.error(`❌ Email sending failed:`, error.message);
      
      if (error.code === 'EAUTH') {
        console.error('Authentication failed. Check EMAIL_USER and EMAIL_PASS environment variables.');
      } else if (error.code === 'ESOCKET') {
        console.error('Connection error. Check your network connectivity and SMTP settings.');
      }
      
      // Always log the OTP for testing purposes
      console.log(`FOR TESTING - OTP for ${to}: ${otp}`);
      
      // Return mock info instead of throwing
      return { messageId: `error-${crypto.randomUUID()}`, error: error.message };
    }
  }
};

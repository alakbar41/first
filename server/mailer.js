
import nodemailer from "nodemailer";
import crypto from 'crypto';

// Simple Gmail transport configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Log configuration when started
console.log(`Email configured with: ${process.env.EMAIL_USER}`);

// Export the mailer object with a simplified implementation
export const mailer = {
  async sendOtp(to, otp) {
    console.log(`Sending OTP ${otp} to ${to}...`);
    
    try {
      // Create mail options
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
      
      // Send the email
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully to ${to}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      // Log error details
      console.error(`❌ Email sending failed: ${error.message}`);
      
      // Log authentication errors clearly
      if (error.code === 'EAUTH') {
        console.error('AUTHENTICATION ERROR: Check EMAIL_USER and EMAIL_PASS environment variables.');
      }
      
      // Always log the OTP for testing
      console.log(`OTP for ${to}: ${otp} (Email delivery failed, use this code for testing)`);
      
      // Return error info but don't throw
      return { success: false, error: error.message };
    }
  }
};

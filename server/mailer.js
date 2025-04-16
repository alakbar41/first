
import nodemailer from "nodemailer";

// Create reusable transporter with more robust configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verify connection configuration
transporter.verify(function(error, success) {
  if (error) {
    console.error('SMTP connection error:', error);
  } else {
    console.log("SMTP server is ready to send emails");
  }
});

export const mailer = {
  async sendOtp(to, otp) {
    console.log(`Preparing to send OTP email to: ${to}`);
    
    try {
      // Define email content with improved styling
      const mailOptions = {
        from: `"ADA University Voting" <${process.env.EMAIL_USER}>`,
        to,
        subject: "Your Verification Code",
        text: `Your verification code is: ${otp}. This code will expire in 3 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
            <div style="text-align: center; padding: 20px;">
              <h2 style="color: #005A9C; margin: 0;">Verification Code</h2>
            </div>
            <p style="color: #666; font-size: 16px;">Thank you for registering with the ADA University Voting System.</p>
            <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
              <p style="font-size: 32px; font-weight: bold; margin: 0; color: #005A9C; letter-spacing: 5px;">${otp}</p>
            </div>
            <p style="color: #666; font-size: 14px;">This code will expire in <strong>3 minutes</strong>.</p>
            <p style="color: #888; font-size: 12px; text-align: center; margin-top: 20px;">If you didn't request this code, please ignore this email.</p>
          </div>
        `
      };
      
      // Send the email with better error handling
      const info = await transporter.sendMail(mailOptions);
      console.log(`Email sent successfully! Message ID: ${info.messageId}`);
      return info;
      
    } catch (error) {
      console.error('Email sending failed:', error);
      
      if (error.code === 'EAUTH') {
        console.error('Gmail authentication failed. Make sure to:');
        console.error('1. Use an App Password if 2FA is enabled');
        console.error('2. Enable "Less secure app access" if not using 2FA');
        console.error('3. Check EMAIL_USER and EMAIL_PASS environment variables');
      }
      
      throw error;
    }
  }
};

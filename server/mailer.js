
import nodemailer from "nodemailer";

// Create simple SMTP transporter - nothing fancy
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify SMTP connection on startup
transporter.verify(function(error, success) {
  if (error) {
    console.error('SMTP connection error:', error);
  } else {
    console.log("SMTP server is ready to send emails");
  }
});

export const mailer = {
  async sendOtp(to, otp) {
    // Validate that recipient email ends with @ada.edu.az
    if (!to.toLowerCase().endsWith('@ada.edu.az')) {
      console.error(`Email ${to} is not a valid ADA University email`);
      throw new Error("Registration requires an ADA University email address.");
    }
    
    console.log(`Preparing to send OTP email to: ${to}`);
    
    try {
      // Define email content with improved styling
      const mailOptions = {
        from: `"ADA University Voting" <${process.env.EMAIL_USER}>`,
        to,
        subject: "Your ADA University Voting Verification Code",
        text: `Your verification code is: ${otp}. This code will expire in 3 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
            <div style="text-align: center; padding: 20px;">
              <h2 style="color: #005A9C; margin: 0;">ADA University Voting</h2>
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
      
      // Send the email
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully to ${to}! Message ID: ${info.messageId}`);
      return info;
      
    } catch (error) {
      console.error('❌ Email sending failed:', error.message);
      
      // Log detailed error information for troubleshooting
      if (error.code === 'EAUTH') {
        console.error('SMTP Authentication failed - check your EMAIL_USER and EMAIL_PASS environment variables');
      } else if (error.code === 'ESOCKET') {
        console.error('SMTP Connection error - check network settings');
      }
      
      // Always log the OTP for testing purposes
      console.log(`FOR TESTING ONLY - OTP for ${to}: ${otp}`);
      
      throw error;
    }
  }
};

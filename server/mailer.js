
import nodemailer from "nodemailer";

// Create a very basic nodemailer transporter with minimal configuration
// Just using the provided EMAIL_USER and EMAIL_PASS environment variables
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Export the mailer object
export const mailer = {
  async sendOtp(to, otp) {
    // Log the email sending attempt
    console.log(`Preparing to send OTP to: ${to}`);
    
    try {
      // Simple email configuration
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: to,
        subject: "ADA University Voting - Verification Code",
        text: `Your verification code is: ${otp}. This code will expire in 3 minutes.`,
        html: `
          <div>
            <h2>ADA University Voting System</h2>
            <p>Your verification code is:</p>
            <h1>${otp}</h1>
            <p>This code will expire in 3 minutes.</p>
          </div>
        `
      };
      
      // Send the email
      const info = await transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${to}`);
      return info;
      
    } catch (error) {
      // Log the error for debugging
      console.error('Email sending failed:', error);
      
      // Log the OTP for testing purposes
      console.log(`OTP for ${to}: ${otp}`);
      
      // Re-throw so it can be handled by the caller
      throw error;
    }
  }
};

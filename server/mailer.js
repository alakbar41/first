import nodemailer from "nodemailer";

// Create a direct nodemailer transport with the simplest configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',  // Using 'gmail' as the service identifier
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS  // This should be an App Password for Gmail with 2FA
  }
});

console.log(`Nodemailer configured with email: ${process.env.EMAIL_USER}`);

// Export the mailer object with a sendOtp method
export const mailer = {
  async sendOtp(to, otp) {
    console.log(`Preparing to send OTP email to: ${to}`);
    
    try {
      // Define email content
      const mailOptions = {
        from: `ADA University Voting <${process.env.EMAIL_USER}>`,
        to,
        subject: "Your Verification Code",
        text: `Your verification code is: ${otp}. This code will expire in 3 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
            <h2 style="color: #005A9C; text-align: center;">Verification Code</h2>
            <p>Thank you for registering with the ADA University Voting System.</p>
            <div style="background-color: #f5f5f5; padding: 15px; text-align: center; margin: 20px 0;">
              <p style="font-size: 24px; font-weight: bold; margin: 0;">${otp}</p>
            </div>
            <p>This code will expire in <strong>3 minutes</strong>.</p>
          </div>
        `
      };
      
      // Send the email
      const info = await transporter.sendMail(mailOptions);
      console.log(`Email sent successfully! Message ID: ${info.messageId}`);
      return info;
      
    } catch (error) {
      console.error(`FAILED to send email: ${error.message}`);
      
      // Show detailed error info for debugging
      if (error.code === 'EAUTH') {
        console.error("Gmail authentication failed - check EMAIL_USER and EMAIL_PASS");
        console.error("For Gmail with 2FA, you MUST use an App Password");
      }
      
      // Log the OTP (just for testing)
      console.log(`The OTP that would have been sent to ${to} is: ${otp}`);
      
      // Re-throw to be handled by caller
      throw error;
    }
  }
};
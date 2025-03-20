import nodemailer from "nodemailer";

// Create reusable transporter with Gmail credentials
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Log successful initialization
console.log("Email service initialized with account:", process.env.EMAIL_USER);

export const mailer = {
  async sendOtp(to, otp) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || '"ADA University Voting System" <no-reply@ada.edu.az>',
        to,
        subject: "Your Verification Code for ADA University Voting System",
        text: `Your verification code is: ${otp}. This code will expire in 3 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9e9e9; border-radius: 5px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="https://ada.edu.az/wp-content/uploads/2021/02/ADA_ED_LOGO_E_H1.png" alt="ADA University Logo" style="max-width: 150px;">
            </div>
            <h2 style="color: #005A9C; text-align: center;">Verify Your Email Address</h2>
            <p style="margin-bottom: 20px; color: #666;">Thank you for registering with the ADA University Voting System. Please use the verification code below to complete your registration:</p>
            <div style="background-color: #f7f7f7; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
              <p style="font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 0; color: #333;">${otp}</p>
            </div>
            <p style="color: #666; margin-bottom: 10px;">This code will expire in <strong>3 minutes</strong>.</p>
            <p style="color: #666; margin-bottom: 20px;">If you did not request this code, please ignore this email.</p>
            <div style="border-top: 1px solid #e9e9e9; padding-top: 20px; margin-top: 20px; color: #999; font-size: 12px; text-align: center;">
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} ADA University Voting System</p>
            </div>
          </div>
        `
      };

      const info = await transporter.sendMail(mailOptions);
      console.log("Email sent:", info.messageId);
      
      // If using Ethereal, log preview URL
      if (process.env.NODE_ENV !== "production") {
        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
      }
      
      return info;
    } catch (error) {
      console.error("Error sending email:", error);
      throw new Error("Failed to send verification email");
    }
  }
};

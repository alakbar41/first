import nodemailer from "nodemailer";

// For production and real email sending
let transporter;

// Create our transporter based on configuration
function createTransporter() {
  // Check for required email credentials
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error("Missing required environment variables: EMAIL_USER and EMAIL_PASS");
    console.log("Creating fallback console logger for development...");
    // Create fallback logger transporter
    transporter = {
      sendMail: async (mailOptions) => {
        console.log("\n=== DEVELOPMENT MODE - EMAIL WOULD BE SENT ===");
        console.log(`To: ${mailOptions.to}`);
        console.log(`Subject: ${mailOptions.subject}`);
        console.log(`OTP Code: ${mailOptions.text.split(': ')[1]?.split('.')[0]}`);
        console.log("============================================\n");
        return { messageId: 'dev-mode-no-transport' };
      }
    };
    return;
  }

  try {
    // Create Gmail transporter with OAuth2 options for better security
    // For Gmail, you need to use an app password, not your regular account password
    // See: https://support.google.com/accounts/answer/185833
    console.log("Setting up Gmail transporter with authentication...");
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false // Accept self-signed certificates
      }
    });

    console.log("Email service initialized with Gmail account:", process.env.EMAIL_USER);

    // Verify connection with more detailed error handling
    transporter.verify(function(error, success) {
      if (error) {
        console.error("Email verification error. Details:", error);
        console.error("This may be due to incorrect credentials or security settings in Gmail.");
        console.error("Make sure you're using an App Password if 2FA is enabled on the Gmail account.");
        createFallbackLogger();
      } else {
        console.log("Email server is ready to send messages");
      }
    });
  } catch (error) {
    console.error("Error setting up Gmail transporter:", error);
    console.error("Detailed error:", error.message);
    console.error("Stack trace:", error.stack);
    createFallbackLogger();
  }
}

function createFallbackLogger() {
  console.log("Creating fallback console logger...");
  transporter = {
    sendMail: async (mailOptions) => {
      console.log("\n=== DEVELOPMENT MODE - EMAIL WOULD BE SENT ===");
      console.log(`To: ${mailOptions.to}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log(`OTP Code: ${mailOptions.text.split(': ')[1]?.split('.')[0]}`);
      console.log("============================================\n");
      return { messageId: 'dev-mode-no-transport' };
    }
  };
}

// Initialize transporter
createTransporter();

export const mailer = {
  async sendOtp(to, otp) {
    if (!transporter) {
      console.log("Transporter not initialized, logging OTP for development");
      console.log(`DEVELOPMENT MODE - OTP for ${to} is: ${otp}`);
      return { messageId: 'dev-mode-no-transport' };
    }

    try {
      console.log(`Attempting to send OTP email to: ${to}`);
      
      // Validate the email address format
      if (!to || !to.includes('@') || !to.includes('.')) {
        console.error(`Invalid email format: ${to}`);
        throw new Error('Invalid email format');
      }
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || `"ADA University Voting System" <${process.env.EMAIL_USER}>`,
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

      console.log('Sending email with the following options:');
      console.log(`From: ${mailOptions.from}`);
      console.log(`To: ${mailOptions.to}`);
      console.log(`Subject: ${mailOptions.subject}`);
      
      const info = await transporter.sendMail(mailOptions);
      console.log("Email sent successfully:", info.messageId);
      console.log("Additional info:", JSON.stringify(info));
      return info;
    } catch (error) {
      console.error("Error sending email. Details:", error);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      
      if (error.code === 'EAUTH') {
        console.error("Authentication error. Check your EMAIL_USER and EMAIL_PASS environment variables.");
      } else if (error.code === 'ESOCKET') {
        console.error("Socket error. This could be due to network issues or server connection problems.");
      } else if (error.code === 'EENVELOPE') {
        console.error("Envelope error. There might be an issue with the email addresses.");
      }
      
      // Log the OTP to console for troubleshooting
      console.log(`Failed to send email. OTP for ${to} is: ${otp}`);
      return { messageId: 'error-fallback', error: error.message };
    }
  }
};
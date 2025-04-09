import nodemailer from "nodemailer";

// For production and real email sending
let transporter;

// Create our transporter based on configuration
function createTransporter() {
  // Check for required email credentials
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      // Create Gmail transporter
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        // Required for better compatibility with Gmail
        tls: {
          rejectUnauthorized: false
        }
      });
      
      console.log("Email service initialized with Gmail account:", process.env.EMAIL_USER);
      
      // Verify connection
      transporter.verify(function(error, success) {
        if (error) {
          console.error("Email verification error:", error);
          console.log("Falling back to Ethereal for development...");
          createTestAccount();
        } else {
          console.log("Email server is ready to send messages");
        }
      });
    } catch (error) {
      console.error("Error setting up Gmail transporter:", error);
      createTestAccount();
    }
  } else {
    console.log("EMAIL_USER and EMAIL_PASS environment variables not found");
    createTestAccount();
  }
}

// Fallback to Ethereal for development
async function createTestAccount() {
  try {
    // Generate Ethereal test account
    const testAccount = await nodemailer.createTestAccount();
    
    console.log("Created Ethereal test account:", testAccount.user);
    
    // Create reusable transporter with test account
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    
    console.log("Email service initialized with Ethereal test account");
  } catch (error) {
    console.error("Failed to create any email transport:", error);
    // Last resort fallback to console logging
    transporter = {
      sendMail: async (mailOptions) => {
        console.log("DEVELOPMENT MODE - EMAIL WOULD BE SENT:");
        console.log(`To: ${mailOptions.to}`);
        console.log(`Subject: ${mailOptions.subject}`);
        console.log(`OTP Code: ${mailOptions.text.split(': ')[1].split('.')[0]}`);
        return { messageId: 'test-message-id' };
      }
    };
  }
}

// Initialize transporter
createTransporter();

export const mailer = {
  async sendOtp(to, otp) {
    // Ensure transporter is available before attempting to send
    if (!transporter) {
      console.log("Transporter not initialized yet, creating a temporary one for logging OTP");
      console.log(`DEVELOPMENT MODE - OTP for ${to} is: ${otp}`);
      return { messageId: 'dev-mode-no-transport' };
    }

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
      if (transporter.options && transporter.options.host === "smtp.ethereal.email") {
        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
      }
      
      return info;
    } catch (error) {
      console.error("Error sending email:", error);
      console.log(`ERROR, but OTP for ${to} is: ${otp}`);
      // In development, don't fail the registration flow even if email sending fails
      return { messageId: 'error-fallback' };
    }
  }
};

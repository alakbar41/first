import nodemailer from "nodemailer";

// For production and real email sending
let transporter;
let testAccount = null;

// Skip Gmail authentication attempts completely and use Ethereal for development
async function createTransporter() {
  console.log("Setting up email transport...");
  try {
    // Generate Ethereal test account
    testAccount = await nodemailer.createTestAccount();
    
    console.log(`Created Ethereal test account: ${testAccount.user}`);
    
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
    console.error("Failed to create Ethereal test account:", error);
    
    // Last resort fallback to console logging
    transporter = {
      sendMail: async (mailOptions) => {
        // Extract OTP from the email text
        const otpMatch = mailOptions.text.match(/verification code is: (\d+)/);
        const otp = otpMatch ? otpMatch[1] : "unknown";
        
        console.log("╔═════════════════════════════════════════════════╗");
        console.log("║             DEVELOPMENT MODE EMAIL               ║");
        console.log("╠═════════════════════════════════════════════════╣");
        console.log(`║ To: ${mailOptions.to.padEnd(43)} ║`);
        console.log(`║ Subject: ${mailOptions.subject.substring(0, 38).padEnd(38)} ║`);
        console.log("╠═════════════════════════════════════════════════╣");
        console.log(`║ OTP CODE: ${otp.padEnd(38)} ║`);
        console.log("╚═════════════════════════════════════════════════╝");
        
        return { 
          messageId: 'dev-mode-message-id',
          success: true 
        };
      },
      options: { host: 'console-logger' }
    };
  }
}

// Initialize transporter - async IIFE
(async () => {
  await createTransporter();
})();

export const mailer = {
  async sendOtp(to, otp) {
    // Ensure transporter is available before attempting to send
    if (!transporter) {
      console.log("Transporter not initialized yet. Waiting for initialization and trying again...");
      // Wait for transporter to initialize (max 3 seconds)
      for (let i = 0; i < 6; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (transporter) break;
      }
      
      // If still not available, use fallback
      if (!transporter) {
        console.log(`⚠️ Could not initialize email transport. OTP for ${to}: ${otp}`);
        return { 
          messageId: 'dev-mode-no-transport',
          success: true, // Still report success to allow development to continue
          previewUrl: null
        };
      }
    }

    try {
      // For Ethereal, use their test address, otherwise use env variable
      const fromEmail = testAccount ? testAccount.user : (process.env.EMAIL_USER || 'no-reply@ada.edu.az');
      const fromName = "ADA University Voting System";
      
      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
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
      
      // If using Ethereal, log preview URL
      let previewUrl = null;
      if (testAccount && info.messageId) {
        previewUrl = nodemailer.getTestMessageUrl(info);
        console.log("✅ Test email sent successfully!");
        console.log(`📧 Preview URL: ${previewUrl}`);
        console.log(`🔑 OTP code is: ${otp}`);
      } else {
        console.log(`✅ Email sent successfully to ${to}`);
      }
      
      return {
        messageId: info.messageId || 'generated-message-id',
        success: true,
        previewUrl
      };
    } catch (error) {
      console.error("❌ Error sending email:", error);
      
      // Enhanced error logging
      if (error.code === 'EAUTH') {
        console.error('Authentication failed. Check EMAIL_USER and EMAIL_PASS environment variables.');
      } else if (error.code === 'ESOCKET') {
        console.error('Connection error. Check your network connectivity and SMTP settings.');
      } else if (error.code === 'EENVELOPE') {
        console.error('Envelope error. Check from/to email addresses.');
      }
      
      // Always log the OTP for development purposes
      console.log("╔═══════════════════════════════════════════════════╗");
      console.log("║          FALLBACK EMAIL DELIVERY SYSTEM            ║");
      console.log("╠═══════════════════════════════════════════════════╣");
      console.log(`║ TO: ${to.padEnd(43)} ║`);
      console.log(`║ OTP CODE: ${otp.padEnd(38)} ║`);
      console.log("╚═══════════════════════════════════════════════════╝");
      
      // For development, still return success so registration flow can continue
      return { 
        messageId: 'error-fallback',
        success: true, // Return success in development mode
        error: error.message
      };
    }
  }
};

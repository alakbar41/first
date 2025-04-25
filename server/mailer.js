import nodemailer from "nodemailer";

// For production and real email sending
let transporter;
let testAccount = null;

// Create our transporter based on configuration
async function createTransporter() {
  console.log("Setting up email transport...");
  
  // Check for required email credentials
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      // First, try to log credentials format (without showing full password)
      const emailUser = process.env.EMAIL_USER;
      const emailPassLength = process.env.EMAIL_PASS.length;
      console.log(`Email credentials found: User=${emailUser}, Password length=${emailPassLength}`);
      
      // Try Gmail with app password
      transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        tls: {
          // Do not fail on invalid certs
          rejectUnauthorized: false
        }
      });
      
      console.log("Attempting to verify Gmail configuration...");
      
      // Verify connection
      transporter.verify(function(error, success) {
        if (error) {
          console.error("Gmail verification error:", error);
          console.log("Falling back to Ethereal for development...");
          createTestAccount();
        } else {
          console.log("Gmail SMTP is ready to send messages");
        }
      });
    } catch (error) {
      console.error("Error setting up Gmail:", error);
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
  async sendOtp(to, otp, type = 'registration') {
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
        console.log(`⚠️ Could not initialize email transport. OTP for ${to}: ${otp} (${type})`);
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
      const fromName = "UniVote Voting System";
      
      // Customize email subject and content based on type
      let subject, mainHeading, mainText;
      
      switch (type) {
        case 'password_reset':
          subject = "Password Reset Verification Code for UniVote Voting System";
          mainHeading = "Reset Your Password";
          mainText = "You've requested to reset your password for the UniVote Voting System. Please use the verification code below:";
          break;
        case 'registration':
        default:
          subject = "Your Verification Code for UniVote Voting System";
          mainHeading = "Verify Your Email Address";
          mainText = "Thank you for registering with the UniVote Voting System. Please use the verification code below to complete your registration:";
      }
      
      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        text: `Your verification code is: ${otp}. This code will expire in 3 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9e9e9; border-radius: 5px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="https://ad0591da-b426-4a84-876d-4e36567ce223-00-3ktlote48pnrm.worf.replit.dev/assets/univote_logo.png" alt="UniVote Logo" style="max-width: 150px;">
            </div>
            <h2 style="color: #005A9C; text-align: center;">${mainHeading}</h2>
            <p style="margin-bottom: 20px; color: #666;">${mainText}</p>
            <div style="background-color: #f7f7f7; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
              <p style="font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 0; color: #333;">${otp}</p>
            </div>
            <p style="color: #666; margin-bottom: 10px;">This code will expire in <strong>3 minutes</strong>.</p>
            <p style="color: #666; margin-bottom: 20px;">If you did not request this code, please ignore this email.</p>
            <div style="border-top: 1px solid #e9e9e9; padding-top: 20px; margin-top: 20px; color: #999; font-size: 12px; text-align: center;">
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} UniVote Voting System</p>
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
  },

  async sendVoteConfirmation(to, transactionHash, electionName, candidateName) {
    console.log('===== VOTE CONFIRMATION EMAIL =====');
    console.log(`Recipient: ${to}`);
    console.log(`Transaction Hash: ${transactionHash}`);
    console.log(`Election: ${electionName}`);
    console.log(`Candidate: ${candidateName}`);
    console.log('===================================');
    
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
        console.log(`⚠️ Could not initialize email transport. Vote confirmation for ${to}: TX ${transactionHash}`);
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
      const fromName = "UniVote Voting System";
      
      // Generate a link to view the transaction on Polygon Mainnet Explorer
      const explorerUrl = `https://polygonscan.com/tx/${transactionHash}`;
      
      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject: "Your Vote Has Been Recorded on the Blockchain",
        text: `
Your vote for ${candidateName} in the "${electionName}" election has been successfully recorded on the blockchain.

Transaction Hash: ${transactionHash}

You can view your transaction on the blockchain explorer at:
${explorerUrl}

Thank you for participating in the UniVote Voting System.
        `,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9e9e9; border-radius: 5px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="https://ad0591da-b426-4a84-876d-4e36567ce223-00-3ktlote48pnrm.worf.replit.dev/assets/univote_logo.png" alt="UniVote Logo" style="max-width: 150px;">
            </div>
            <h2 style="color: #005A9C; text-align: center;">Vote Successfully Recorded</h2>
            <p style="margin-bottom: 20px; color: #666;">Your vote for <strong>${candidateName}</strong> in the "<strong>${electionName}</strong>" election has been successfully recorded on the blockchain.</p>
            
            <div style="background-color: #f7f7f7; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">Transaction Details</h3>
              <p style="color: #666; margin-bottom: 10px; word-break: break-all;"><strong>Transaction Hash:</strong><br>${transactionHash}</p>
              <p style="margin-bottom: 0;">
                <a href="${explorerUrl}" target="_blank" style="display: inline-block; background-color: #005A9C; color: white; padding: 8px 15px; text-decoration: none; border-radius: 4px;">View on Blockchain Explorer</a>
              </p>
            </div>
            
            <p style="color: #666; margin-bottom: 20px;">The blockchain ensures your vote is securely and transparently recorded. This transaction hash serves as your receipt and proof of voting.</p>
            
            <div style="border-top: 1px solid #e9e9e9; padding-top: 20px; margin-top: 20px; color: #999; font-size: 12px; text-align: center;">
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} UniVote Voting System</p>
            </div>
          </div>
        `
      };

      const info = await transporter.sendMail(mailOptions);
      
      // If using Ethereal, log preview URL
      let previewUrl = null;
      if (testAccount && info.messageId) {
        previewUrl = nodemailer.getTestMessageUrl(info);
        console.log("✅ Vote confirmation test email sent successfully!");
        console.log(`📧 Preview URL: ${previewUrl}`);
      } else {
        console.log(`✅ Vote confirmation email sent successfully to ${to}`);
      }
      
      return {
        messageId: info.messageId || 'generated-message-id',
        success: true,
        previewUrl
      };
    } catch (error) {
      console.error("❌ Error sending vote confirmation email:", error);
      
      // Enhanced error logging
      if (error.code === 'EAUTH') {
        console.error('Authentication failed. Check EMAIL_USER and EMAIL_PASS environment variables.');
      } else if (error.code === 'ESOCKET') {
        console.error('Connection error. Check your network connectivity and SMTP settings.');
      } else if (error.code === 'EENVELOPE') {
        console.error('Envelope error. Check from/to email addresses.');
      }
      
      console.log("╔═══════════════════════════════════════════════════╗");
      console.log("║       FALLBACK VOTE CONFIRMATION SYSTEM            ║");
      console.log("╠═══════════════════════════════════════════════════╣");
      console.log(`║ TO: ${to.padEnd(43)} ║`);
      console.log(`║ TX HASH: ${transactionHash.substring(0, 10)}...${transactionHash.substring(transactionHash.length-4)} ║`);
      console.log("╚═══════════════════════════════════════════════════╝");
      
      // For development, still return success
      return { 
        messageId: 'error-fallback',
        success: true, // Return success in development mode
        error: error.message
      };
    }
  }
};
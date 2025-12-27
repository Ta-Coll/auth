import axios from 'axios';

// Lambda URL for sending emails via AWS SES
const LAMBDA_URL = process.env.LAMBDA_EMAIL_URL || 'https://cqp43e2wqanux3ck2ew6lresoa0qeufa.lambda-url.us-east-1.on.aws/';

export class EmailService {
  /**
   * Send email using deployed Lambda function
   */
  static async sendEmail(to: string, subject: string, htmlBody: string): Promise<void> {
    try {
      const response = await axios.post(LAMBDA_URL, {
        to,
        subject,
        message: htmlBody
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        console.log(`✅ Email sent successfully to ${to}`);
      } else {
        throw new Error(response.data.message || 'Failed to send email');
      }
    } catch (error) {
      console.error('❌ Error sending email:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.data?.message) {
          throw new Error(error.response.data.message);
        }
      }
      throw new Error('Failed to send email');
    }
  }

  /**
   * Send validation code email (first email after signup) - code only, no password
   */
  static async sendValidationCode(email: string, firstName: string, code: string): Promise<void> {
    const subject = 'Email Validation';
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f0f0f0; padding: 20px; text-align: center; }
          .content { background: #ffffff; padding: 30px; }
          .code-box { background: #90EE90; border: 2px solid #4CAF50; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
          .code { font-size: 32px; font-weight: bold; color: #000; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="content">
            <p>Hi ${firstName},</p>
            <p>Thanks for registering. Use the code below to validate email.</p>
            <div class="code-box">
              <div class="code">Validation Code: ${code}</div>
            </div>
            <p>Cheers,</p>
            <p>napkin apps</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(email, subject, htmlBody);
  }

  /**
   * Send welcome email with password (after verification)
   */
  static async sendWelcomeEmail(email: string, firstName: string, password: string): Promise<void> {
    const subject = 'Welcome to Napkin Apps';
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .content { background: #ffffff; padding: 30px; }
          .password-box { background: #f9f9f9; border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin: 20px 0; }
          .perk-box { background: #e8e8ff; border-left: 4px solid #9c27b0; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .perk-text { color: #9c27b0; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="content">
            <p>Hi ${firstName},</p>
            <p>Welcome to napkin apps.</p>
            <div class="password-box">
              <p>Your auto-generated password is: <strong>${password}</strong></p>
            </div>
            <div class="perk-box">
              <p>Napkin Perk Activated: <span class="perk-text">Daily Quotes</span></p>
            </div>
            <p>Cheers,</p>
            <p>Napkin Apps</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(email, subject, htmlBody);
  }

  /**
   * Send password reset code email
   */
  static async sendPasswordResetCode(email: string, firstName: string, code: string): Promise<void> {
    const subject = 'Password Reset Code';
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .content { background: #ffffff; padding: 30px; }
          .code-box { background: #e3f2fd; border: 2px solid #2196F3; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
          .code { font-size: 32px; font-weight: bold; color: #1976D2; }
          .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="content">
            <p>Hi ${firstName},</p>
            <p>You requested to reset your password. Use the code below to reset your password:</p>
            <div class="code-box">
              <div class="code">Reset Code: ${code}</div>
            </div>
            <div class="warning-box">
              <p><strong>This code will expire in 30 minutes.</strong></p>
              <p>If you didn't request this password reset, please ignore this email.</p>
            </div>
            <p>Cheers,</p>
            <p>Napkin Apps</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(email, subject, htmlBody);
  }
}


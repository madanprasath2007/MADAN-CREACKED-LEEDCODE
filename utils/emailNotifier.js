import nodemailer from 'nodemailer';
import Logger from './Logger.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Sends execution summary notification email
 * @param {Object} details 
 * @param {boolean} details.success Whether overall execution succeeded
 * @param {string|null} details.dailyChallenge Title slug or status of daily challenge
 * @param {boolean} details.dailyChallengeSuccess Whether daily challenge was accepted
 * @param {Array<string>} details.solvedProblems List of solved problems in this run
 * @param {Array<string>} details.failedProblems List of failed problems in this run
 * @param {string} [details.errorMessage] Error message if failed completely
 */
export async function sendEmailNotification(details) {
  const NOTIFICATION_EMAIL = (process.env.NOTIFICATION_EMAIL || '').trim();
  const SMTP_HOST = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const SMTP_PORT = (process.env.SMTP_PORT || '465').trim();
  const SMTP_USER = (process.env.SMTP_USER || '').trim();
  const SMTP_PASS = (process.env.SMTP_PASS || '').trim();

  const recipient = NOTIFICATION_EMAIL || SMTP_USER;
  if (!recipient || !SMTP_USER || !SMTP_PASS) {
    Logger.warn('[EMAIL_NOTIFIER] SMTP credentials (SMTP_USER, SMTP_PASS, NOTIFICATION_EMAIL) not set in .env. Skipping email notification.');
    return false;
  }

  const {
    success,
    dailyChallenge,
    dailyChallengeSuccess,
    solvedProblems = [],
    failedProblems = [],
    errorMessage = ''
  } = details;

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const totalSolvedCount = (dailyChallengeSuccess && dailyChallenge ? 1 : 0) + solvedProblems.length;

  const subject = success && dailyChallengeSuccess
    ? `✅ LeetCode Bot Daily Report - [${todayStr}] All Tasks Solved (${totalSolvedCount} Problems: 1 Daily Challenge + ${solvedProblems.length} Extra)`
    : `⚠️ LeetCode Bot Daily Alert - [${todayStr}] Issues Detected (${failedProblems.length} Failed)`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; background-color: #f7f9fa; padding: 20px; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e1e4e8;">
        <div style="background-color: ${dailyChallengeSuccess ? '#10b981' : '#ef4444'}; padding: 18px 24px; color: white;">
          <h2 style="margin: 0; font-size: 20px;">LeetCoder Daily Automation Report</h2>
          <p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px;">${todayStr}</p>
        </div>
        
        <div style="padding: 24px;">
          <h3 style="margin-top: 0; color: #1f2937;">1. Daily Challenge</h3>
          <div style="padding: 12px; border-radius: 6px; background-color: ${dailyChallengeSuccess ? '#ecfdf5' : '#fef2f2'}; border-left: 4px solid ${dailyChallengeSuccess ? '#10b981' : '#ef4444'}; margin-bottom: 20px;">
            <strong>Problem:</strong> <code>${dailyChallenge || 'N/A'}</code><br/>
            <strong>Status:</strong> ${dailyChallengeSuccess ? '✅ Solved & Accepted' : '❌ Failed or Not Solved'}
          </div>

          <h3 style="color: #1f2937;">2. Extra Unsolved Problems Solved Today (${solvedProblems.length})</h3>
          ${solvedProblems.length > 0 ? `
            <ol style="padding-left: 20px; color: #374151; line-height: 1.8;">
              ${solvedProblems.map(p => `<li><code>${p}</code> - <strong style="color: #10b981;">Accepted</strong></li>`).join('')}
            </ol>
          ` : `<p style="color: #6b7280; font-style: italic;">No extra problems solved today.</p>`}

          <div style="margin-top: 15px; padding: 10px 14px; background: #f3f4f6; border-radius: 6px; font-weight: bold; color: #374151;">
            📊 Total Problems Solved Today: ${totalSolvedCount} (1 Daily Challenge + ${solvedProblems.length} Extra Problems)
          </div>

          ${failedProblems.length > 0 ? `
            <h3 style="color: #b91c1c;">3. Failed Problems (${failedProblems.length})</h3>
            <ul style="padding-left: 20px; color: #dc2626; line-height: 1.6;">
              ${failedProblems.map(p => `<li><code>${p}</code></li>`).join('')}
            </ul>
          ` : ''}

          ${errorMessage ? `
            <div style="margin-top: 20px; padding: 12px; background: #fff1f2; border-left: 4px solid #e11d48; border-radius: 4px;">
              <strong>System Notice / Error:</strong><br/>
              <pre style="white-space: pre-wrap; font-size: 12px; color: #9f1239;">${errorMessage}</pre>
            </div>
          ` : ''}

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="font-size: 12px; color: #9ca3af; margin-bottom: 0;">Automated notification sent by LeetCoder Suite.</p>
        </div>
      </div>
    </div>
  `;

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const isGmail = SMTP_HOST.toLowerCase().includes('gmail');
      let transporterConfig;

      if (isGmail) {
        // Attempt 1 uses direct Gmail transport; retries fall back to port 587 (STARTTLS)
        if (attempt === 1) {
          transporterConfig = {
            service: 'gmail',
            auth: { user: SMTP_USER, pass: SMTP_PASS },
            connectionTimeout: 15000,
            greetingTimeout: 15000,
            socketTimeout: 20000,
          };
        } else {
          transporterConfig = {
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: { user: SMTP_USER, pass: SMTP_PASS },
            connectionTimeout: 15000,
            greetingTimeout: 15000,
            socketTimeout: 20000,
          };
        }
      } else {
        const isPort465 = parseInt(SMTP_PORT, 10) === 465;
        transporterConfig = {
          host: SMTP_HOST,
          port: parseInt(SMTP_PORT, 10),
          secure: isPort465,
          auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
          },
          connectionTimeout: 15000,
          greetingTimeout: 15000,
          socketTimeout: 20000,
        };
      }

      const transporter = nodemailer.createTransport(transporterConfig);

      await transporter.sendMail({
        from: `"LeetCoder Bot" <${SMTP_USER}>`,
        to: recipient,
        subject,
        html: htmlContent,
      });

      Logger.success(`[EMAIL_NOTIFIER] Notification email sent successfully to ${recipient}`);
      return true;
    } catch (err) {
      if (attempt < maxAttempts) {
        Logger.warn(`[EMAIL_NOTIFIER] Attempt ${attempt} failed: ${err.message}. Retrying in 3 seconds...`);
        await new Promise((res) => setTimeout(res, 3000));
      } else {
        Logger.error(`[EMAIL_NOTIFIER] Failed to send email after ${maxAttempts} attempts: ${err.message}`);
        return false;
      }
    }
  }
}


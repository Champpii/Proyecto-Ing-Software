import fs from 'fs';
import path from 'path';

const LOG_FILE = path.resolve('src/db/sent_emails.json');

export const notificationService = {
  /**
   * Mock sending an email and log it to a JSON file for inspection in the demo
   * @param {object} params
   * @param {string} params.to - Recipient email
   * @param {string} params.subject - Email subject
   * @param {string} params.body - Email HTML body or text
   * @param {object} params.metadata - Metadata (marbete details, pricing, etc.)
   * @returns {Promise<boolean>}
   */
  sendEmail: async ({ to, subject, body, metadata = {} }) => {
    try {
      console.log(`[NotificationService] Sending email to ${to}...`);
      console.log(`[NotificationService] Subject: ${subject}`);
      
      const emailRecord = {
        id: 'EMAIL-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        timestamp: new Date().toISOString(),
        to,
        subject,
        body,
        metadata
      };

      // Read existing logs
      let existingLogs = [];
      if (fs.existsSync(LOG_FILE)) {
        try {
          const raw = fs.readFileSync(LOG_FILE, 'utf8');
          existingLogs = JSON.parse(raw);
        } catch (e) {
          console.error('Error reading email logs, overwriting', e);
        }
      }

      existingLogs.unshift(emailRecord); // Keep newest on top
      
      // Ensure db dir exists
      fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
      fs.writeFileSync(LOG_FILE, JSON.stringify(existingLogs, null, 2), 'utf8');
      
      console.log(`[NotificationService] Email simulated successfully. Saved to: ${LOG_FILE}`);
      return true;
    } catch (err) {
      console.error('[NotificationService] Failed to send email mock:', err);
      return false;
    }
  },

  /**
   * Get all sent email logs
   * @returns {Array}
   */
  getSentEmails: () => {
    if (!fs.existsSync(LOG_FILE)) return [];
    try {
      return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
    } catch (e) {
      return [];
    }
  }
};

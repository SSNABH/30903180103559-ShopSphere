import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

function createTransport() {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    ...(env.SMTP_USER ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } } : {}),
  });
}

export function createEmailService(transporter = createTransport()) {
  return {
    async sendWelcomeEmail(user) {
      const safeName = user.name.replace(/[<>]/g, '');
      return transporter.sendMail({
        from: env.SMTP_FROM,
        to: user.email,
        subject: 'Welcome to DECI.Project',
        text: `Hello ${safeName},\n\nWelcome to DECI.Project. Your electronics shopping account is ready.\n\nDECI.Project Team`,
        html: `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f4f5f7;padding:32px"><div style="max-width:560px;margin:auto;background:#fff;border-radius:18px;padding:32px"><p style="font-size:12px;letter-spacing:.14em;color:#666">DECI.PROJECT</p><h1 style="margin:8px 0 18px">Welcome, ${safeName}.</h1><p>Your electronics shopping account is ready. You can now explore products, save a cart, and place simulated orders.</p><p style="margin-top:28px;color:#666">DECI.Project Team</p></div></body></html>`,
      });
    },
  };
}

export const emailService = createEmailService();

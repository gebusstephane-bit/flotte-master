"use server";

/**
 * Mailer Gmail SMTP - Alternative à Resend pour les domaines .fr
 * À utiliser en développement ou si Resend ne supporte pas votre TLD
 */

import nodemailer from "nodemailer";

export interface SendMailParams {
  to: string[];
  subject: string;
  html: string;
  text?: string;
}

export interface SendMailResult {
  success: boolean;
  message: string;
}

export async function sendMailGmail({
  to,
  subject,
  html,
  text,
}: SendMailParams): Promise<SendMailResult> {
  const GMAIL_USER = process.env.GMAIL_USER; // ton-email@gmail.com
  const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD; // mot de passe d'application

  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.warn("[MAILER-GMAIL] Configuration manquante");
    return { 
      success: false, 
      message: "GMAIL_USER ou GMAIL_APP_PASSWORD manquant dans .env.local" 
    };
  }

  const recipients = (to || []).map((x) => (x || "").trim()).filter(Boolean);
  if (recipients.length === 0) {
    return { success: false, message: "Aucun destinataire" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // true pour 465, false pour les autres ports
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false, // Nécessaire en développement local
      },
    });

    const result = await transporter.sendMail({
      from: `"FleetFlow" <${GMAIL_USER}>`,
      to: recipients,
      subject,
      html,
      text: text || subject,
    });

    console.log("[MAILER-GMAIL] Email envoyé:", result.messageId);
    return { 
      success: true, 
      message: `Email envoyé via Gmail (id: ${result.messageId})` 
    };
  } catch (err: any) {
    console.error("[MAILER-GMAIL] Erreur:", err);
    return { 
      success: false, 
      message: err?.message || "Erreur Gmail SMTP" 
    };
  }
}

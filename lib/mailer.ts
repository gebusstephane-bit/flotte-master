import "server-only";

// Server-only — Resend API
// Ne JAMAIS importer ce fichier dans un composant client.

import { Resend } from "resend";

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

function env(name: string) {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v.trim() : "";
}

export async function sendMail({
  to,
  subject,
  html,
  text,
}: SendMailParams): Promise<SendMailResult> {
  const RESEND_API_KEY = env("RESEND_API_KEY");
  const MAIL_FROM_EMAIL = env("MAIL_FROM_EMAIL");
  const MAIL_FROM_NAME = env("MAIL_FROM_NAME") || "FleetFlow";

  if (!RESEND_API_KEY) {
    console.warn("[MAILER] RESEND_API_KEY manquante");
    return { success: false, message: "Resend non configuré (RESEND_API_KEY manquante)" };
  }

  if (!MAIL_FROM_EMAIL) {
    console.warn("[MAILER] MAIL_FROM_EMAIL manquante");
    return { success: false, message: "Resend non configuré (MAIL_FROM_EMAIL manquante)" };
  }

  if (MAIL_FROM_EMAIL.toLowerCase().endsWith("@gmail.com")) {
    console.error(
      "[MAILER] MAIL_FROM_EMAIL utilise @gmail.com — Resend ne peut pas envoyer depuis un domaine non vérifié.",
      "Configurez un domaine vérifié dans Resend (https://resend.com/domains) et mettez à jour MAIL_FROM_EMAIL (ex: no-reply@votre-domaine.fr)."
    );
    return {
      success: false,
      message: "MAIL_FROM_EMAIL invalide : Resend interdit l'envoi depuis @gmail.com. Utilisez un domaine vérifié (ex: no-reply@votre-domaine.fr).",
    };
  }

  const recipients = (to || []).map((x) => (x || "").trim()).filter(Boolean);
  if (recipients.length === 0) {
    console.warn("[MAILER] Aucun destinataire valide.");
    return { success: false, message: "Aucun destinataire" };
  }

  console.log("[MAILER] Envoi à", recipients.join(", "), "| Sujet:", subject);

  try {
    const resend = new Resend(RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: `${MAIL_FROM_NAME} <${MAIL_FROM_EMAIL}>`,
      to: recipients,
      subject,
      html,
      text: text || subject,
    });

    if (error) {
      console.error("[MAILER] Resend error:", error);
      const msg = error.message || "Erreur Resend";
      if (msg.toLowerCase().includes("domain is not verified")) {
        return {
          success: false,
          message: "Domaine expéditeur non vérifié : configurez Resend Domains (https://resend.com/domains) et mettez à jour MAIL_FROM_EMAIL (ex: no-reply@votre-domaine.fr).",
        };
      }
      return { success: false, message: msg };
    }

    console.log("[MAILER] OK — id:", data?.id);
    return { success: true, message: `Email envoyé (id: ${data?.id})` };
  } catch (err: any) {
    console.error("[MAILER] Erreur:", err?.message || err);
    return { success: false, message: err?.message || "Erreur inconnue" };
  }
}

/**
 * API Route: Contact Enterprise
 * POST /api/contact-enterprise
 * 
 * Envoie un email à fleet.master.contact@gmail.com avec les infos du prospect
 */

import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      companyName,
      firstName,
      lastName,
      email,
      phone,
      fleetSize,
      message,
    } = body;

    // Validation basique
    if (!companyName || !firstName || !lastName || !email) {
      return NextResponse.json(
        { error: "Champs obligatoires manquants" },
        { status: 400 }
      );
    }

    // Créer le transporteur SMTP
    // Note: Pour que ça fonctionne, il faut configurer les variables d'environnement
    // ou utiliser un service comme Resend, SendGrid, etc.
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || "fleet.master.contact@gmail.com",
        pass: process.env.SMTP_PASS || "",
      },
    });

    // Construire l'email
    const mailOptions = {
      from: `"FleetFlow Contact" <${process.env.SMTP_USER || "fleet.master.contact@gmail.com"}>`,
      to: "fleet.master.contact@gmail.com",
      replyTo: email,
      subject: `🚀 Nouvelle demande Enterprise - ${companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #0066FF; border-bottom: 2px solid #0066FF; padding-bottom: 10px;">
            Nouvelle demande Enterprise
          </h1>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #1e293b; margin-top: 0;">Informations du contact</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; width: 150px;"><strong>Entreprise:</strong></td>
                <td style="padding: 8px 0; color: #1e293b;">${companyName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;"><strong>Nom:</strong></td>
                <td style="padding: 8px 0; color: #1e293b;">${firstName} ${lastName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;"><strong>Email:</strong></td>
                <td style="padding: 8px 0; color: #1e293b;">
                  <a href="mailto:${email}" style="color: #0066FF;">${email}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;"><strong>Téléphone:</strong></td>
                <td style="padding: 8px 0; color: #1e293b;">${phone || "Non renseigné"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;"><strong>Taille flotte:</strong></td>
                <td style="padding: 8px 0; color: #1e293b;">${fleetSize || "Non renseignée"}</td>
              </tr>
            </table>
          </div>

          ${message ? `
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e293b; margin-top: 0;">Message</h3>
            <p style="color: #334155; line-height: 1.6; white-space: pre-wrap;">${message}</p>
          </div>
          ` : ""}

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px;">
            <p>Cet email a été envoyé automatiquement depuis le formulaire de contact Enterprise FleetFlow.</p>
            <p>Date: ${new Date().toLocaleString("fr-FR")}</p>
          </div>
        </div>
      `,
      text: `
Nouvelle demande Enterprise - ${companyName}

Informations du contact:
- Entreprise: ${companyName}
- Nom: ${firstName} ${lastName}
- Email: ${email}
- Téléphone: ${phone || "Non renseigné"}
- Taille flotte: ${fleetSize || "Non renseignée"}

${message ? `Message:\n${message}` : ""}

---
Envoyé le ${new Date().toLocaleString("fr-FR")}
      `,
    };

    // Envoyer l'email (désactivé si pas de SMTP configuré)
    if (process.env.SMTP_PASS) {
      await transporter.sendMail(mailOptions);
      console.log("[Contact Enterprise] Email envoyé à fleet.master.contact@gmail.com");
    } else {
      // Mode développement : juste logger
      console.log("[Contact Enterprise] Email simulé (pas de SMTP configuré):");
      console.log("  De:", mailOptions.from);
      console.log("  À:", mailOptions.to);
      console.log("  Sujet:", mailOptions.subject);
      console.log("  Contenu HTML envoyé");
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Contact Enterprise] Error:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de l'envoi" },
      { status: 500 }
    );
  }
}

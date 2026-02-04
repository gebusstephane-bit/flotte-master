export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { sendMail } from "@/lib/mailer";
import { sendMailGmail } from "@/lib/mailer-gmail";

// Server-side Supabase client (service role for reading profiles + signed URLs)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const APP_URL = process.env.APP_URL || "http://localhost:3000";

type NotifyType =
  | "INTERVENTION_CREATED"        // Demande créée
  | "INTERVENTION_APPROVED"       // Demande validée par admin
  | "INTERVENTION_REJECTED"       // Demande refusée par admin
  | "DEVIS_UPLOADED"              // Devis joint
  | "DEVIS_VALIDATED"             // Devis validé (vrai devis)
  | "DEVIS_REFUSED"               // Devis refusé (vrai devis)
  | "RDV_PLANNED"                 // RDV planifié
  | "INTERVENTION_COMPLETED"      // Intervention terminée
  | "INSPECTION_WORK_COMPLETED";  // Inspection après travaux validée

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getEmailsByRoles(roles: string[], organizationId?: string): Promise<string[]> {
  console.log("[NOTIFY] getEmailsByRoles - roles:", roles, "org:", organizationId);
  
  let query = supabaseAdmin
    .from("profiles")
    .select("email, current_organization_id")
    .in("role", roles);
  
  // Filtrer par organisation si spécifiée
  if (organizationId) {
    query = query.eq("current_organization_id", organizationId);
  }
  
  const { data, error } = await query;

  if (error) {
    console.error("[NOTIFY] Erreur lecture profiles:", error);
    return [];
  }
  
  console.log("[NOTIFY] getEmailsByRoles - found:", data?.length || 0, "emails:", data?.map(p => p.email));
  return (data || []).map((p) => p.email).filter(Boolean);
}

async function getUserIdsByRoles(roles: string[], organizationId?: string): Promise<string[]> {
  console.log("[NOTIFY] getUserIdsByRoles - roles:", roles, "org:", organizationId);
  
  let query = supabaseAdmin
    .from("profiles")
    .select("id, current_organization_id")
    .in("role", roles);
  
  // Filtrer par organisation si spécifiée
  if (organizationId) {
    query = query.eq("current_organization_id", organizationId);
  }
  
  const { data, error } = await query;

  if (error) {
    console.error("[NOTIFY] Erreur lecture profiles IDs:", error);
    return [];
  }
  
  console.log("[NOTIFY] getUserIdsByRoles - found:", data?.length || 0, "users");
  return (data || []).map((p) => p.id).filter(Boolean);
}

async function logNotification(params: {
  triggerBy: string;
  eventType: NotifyType;
  recipients: string[];
  recipientEmails: string[];
  status: 'sent' | 'error' | 'pending';
  errorMessage?: string;
  metadata?: any;
  interventionId?: string;
  inspectionId?: string;
  vehicleId?: string;
}) {
  try {
    await supabaseAdmin.from("notification_logs").insert({
      trigger_by: params.triggerBy,
      event_type: params.eventType,
      recipients: params.recipients,
      recipient_emails: params.recipientEmails,
      status: params.status,
      error_message: params.errorMessage,
      metadata: params.metadata || {},
      intervention_id: params.interventionId,
      inspection_id: params.inspectionId,
      vehicle_id: params.vehicleId,
    });
  } catch (err) {
    console.error("[NOTIFY] Erreur log notification:", err);
  }
}

async function getIntervention(id: string) {
  const { data, error } = await supabaseAdmin
    .from("interventions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("[NOTIFY] Erreur lecture intervention:", error);
    return null;
  }
  return data;
}

async function getSignedDevisUrl(devisPath: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage
    .from("devis-interventions")
    .createSignedUrl(devisPath, 60 * 60 * 24); // 24h

  if (error || !data?.signedUrl) {
    console.error("[NOTIFY] Signed URL error:", error);
    return null;
  }
  return data.signedUrl;
}

function fmt(n: number | null | undefined): string {
  return (n || 0).toLocaleString("fr-FR");
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleString("fr-FR");
  } catch {
    return d;
  }
}

function linkButton(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">${label}</a>`;
}

function footer(): string {
  return `<p style="color:#999;font-size:12px;margin-top:24px;border-top:1px solid #eee;padding-top:12px;">Notification automatique — <a href="${APP_URL}" style="color:#2563eb;">FleetFlow</a></p>`;
}

// ---------------------------------------------------------------------------
// Email builders
// ---------------------------------------------------------------------------

function buildInterventionCreatedEmail(intervention: any) {
  const subject = `[FLEETFLOW] Nouvelle demande d'intervention - ${intervention.immat}`;
  const html = `
    <h2>Nouvelle demande d'intervention</h2>
    <table style="border-collapse:collapse;">
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Véhicule</td><td>${intervention.vehicule}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Immatriculation</td><td>${intervention.immat}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Description</td><td>${intervention.description}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Garage</td><td>${intervention.garage}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Montant estimé</td><td>${fmt(intervention.montant)} EUR</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Date</td><td>${fmtDate(intervention.date_creation)}</td></tr>
    </table>
    <p style="margin-top:16px;">${linkButton(`${APP_URL}/maintenance`, "Voir dans Maintenance")}</p>
    ${footer()}
  `;
  return { subject, html };
}

function buildInterventionApprovedEmail(intervention: any) {
  const subject = `[FLEETFLOW] Demande validée - ${intervention.immat}`;
  const html = `
    <h2>Demande d'intervention <span style="color:#16a34a">validée</span></h2>
    <table style="border-collapse:collapse;">
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Véhicule</td><td>${intervention.vehicule} (${intervention.immat})</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Description</td><td>${intervention.description}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Montant</td><td>${fmt(intervention.montant)} EUR</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Statut</td><td style="color:#16a34a;font-weight:bold;">En attente de planification du RDV</td></tr>
    </table>
    <p style="margin-top:16px;">${linkButton(`${APP_URL}/maintenance`, "Voir dans Maintenance")}</p>
    ${footer()}
  `;
  return { subject, html };
}

function buildInterventionRejectedEmail(intervention: any) {
  const subject = `[FLEETFLOW] Demande refusée - ${intervention.immat}`;
  const reasonHtml = intervention.rejected_reason
    ? `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Motif du refus</td><td style="color:#dc2626;">${intervention.rejected_reason}</td></tr>`
    : "";
  const html = `
    <h2>Demande d'intervention <span style="color:#dc2626">refusée</span></h2>
    <table style="border-collapse:collapse;">
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Véhicule</td><td>${intervention.vehicule} (${intervention.immat})</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Description</td><td>${intervention.description}</td></tr>
      ${reasonHtml}
    </table>
    <p style="margin-top:16px;">${linkButton(`${APP_URL}/maintenance?tab=history`, "Voir l'historique")}</p>
    ${footer()}
  `;
  return { subject, html };
}

function buildDevisUploadedEmail(intervention: any, signedUrl: string | null) {
  const subject = `[FLEETFLOW] Devis joint - ${intervention.immat}`;
  const linkHtml = signedUrl
    ? `<p><a href="${signedUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;">Télécharger le devis (PDF)</a></p>
       <p style="font-size:12px;color:#666;">Ce lien expire dans 24 heures.</p>`
    : `<p style="color:#c00;">Lien de téléchargement indisponible.</p>`;

  const html = `
    <h2>Devis PDF joint à une intervention</h2>
    <table style="border-collapse:collapse;">
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Véhicule</td><td>${intervention.vehicule} (${intervention.immat})</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Description</td><td>${intervention.description}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Montant</td><td>${fmt(intervention.montant)} EUR</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Fichier</td><td>${intervention.devis_filename || "devis.pdf"}</td></tr>
    </table>
    ${linkHtml}
    <p style="margin-top:16px;">${linkButton(`${APP_URL}/maintenance`, "Voir dans Maintenance")}</p>
    ${footer()}
  `;
  return { subject, html };
}

function buildDevisValidatedEmail(intervention: any) {
  const subject = `[FLEETFLOW] Devis validé - ${intervention.immat}`;
  const html = `
    <h2>Devis <span style="color:#16a34a">validé</span></h2>
    <table style="border-collapse:collapse;">
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Véhicule</td><td>${intervention.vehicule} (${intervention.immat})</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Description</td><td>${intervention.description}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Montant</td><td>${fmt(intervention.montant)} EUR</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Statut</td><td style="color:#16a34a;font-weight:bold;">En attente de planification du RDV</td></tr>
    </table>
    <p style="margin-top:16px;">${linkButton(`${APP_URL}/maintenance`, "Voir dans Maintenance")}</p>
    ${footer()}
  `;
  return { subject, html };
}

function buildDevisRefusedEmail(intervention: any) {
  const subject = `[FLEETFLOW] Devis refusé - ${intervention.immat}`;
  const reasonHtml = intervention.rejected_reason
    ? `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Motif du refus</td><td style="color:#dc2626;">${intervention.rejected_reason}</td></tr>`
    : "";
  const html = `
    <h2>Devis <span style="color:#dc2626">refusé</span></h2>
    <table style="border-collapse:collapse;">
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Véhicule</td><td>${intervention.vehicule} (${intervention.immat})</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Description</td><td>${intervention.description}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Montant</td><td>${fmt(intervention.montant)} EUR</td></tr>
      ${reasonHtml}
    </table>
    <p style="margin-top:16px;">${linkButton(`${APP_URL}/maintenance?tab=history`, "Voir l'historique")}</p>
    ${footer()}
  `;
  return { subject, html };
}

function buildRdvPlannedEmail(intervention: any) {
  const subject = `[FLEETFLOW] RDV planifié - ${intervention.immat}`;
  const html = `
    <h2>RDV de maintenance planifié</h2>
    <table style="border-collapse:collapse;">
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Véhicule</td><td>${intervention.vehicule} (${intervention.immat})</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Description</td><td>${intervention.description}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Garage</td><td>${intervention.garage}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Montant</td><td>${fmt(intervention.montant)} EUR</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Date RDV</td><td style="font-weight:bold;color:#16a34a;">${fmtDate(intervention.rdv_date)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Lieu</td><td>${intervention.rdv_lieu || "-"}</td></tr>
    </table>
    <p style="margin-top:16px;">${linkButton(`${APP_URL}/planning`, "Voir le Planning")}</p>
    ${footer()}
  `;
  return { subject, html };
}

function buildInterventionCompletedEmail(intervention: any) {
  const subject = `[FLEETFLOW] Intervention terminée - ${intervention.immat}`;
  const vehicleLink = intervention.vehicle_id
    ? `<p style="margin-top:8px;">${linkButton(`${APP_URL}/parc/${intervention.vehicle_id}`, "Fiche véhicule")}</p>`
    : "";
  const html = `
    <h2>Intervention terminée</h2>
    <table style="border-collapse:collapse;">
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Véhicule</td><td>${intervention.vehicule} (${intervention.immat})</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Description</td><td>${intervention.description}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Garage</td><td>${intervention.garage}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Montant</td><td>${fmt(intervention.montant)} EUR</td></tr>
    </table>
    <p style="margin-top:16px;">${linkButton(`${APP_URL}/maintenance?tab=history`, "Voir l'historique")}</p>
    ${vehicleLink}
    ${footer()}
  `;
  return { subject, html };
}

function buildInspectionWorkCompletedEmail(intervention: any, extra?: { hasAnomalies?: boolean; anomaliesCount?: number }) {
  const hasAnomalies = extra?.hasAnomalies || false;
  const color = hasAnomalies ? "#dc2626" : "#16a34a";
  const status = hasAnomalies ? "terminés avec anomalies détectées" : "terminés - Véhicule conforme";
  const icon = hasAnomalies ? "⚠️" : "✅";
  
  const subject = `[FLEETFLOW] Travaux ${hasAnomalies ? "avec anomalies" : "conformes"} - ${intervention.immat}`;
  
  const anomaliesHtml = hasAnomalies
    ? `<div style="background:#fef2f2;border:1px solid #fecaca;padding:12px;border-radius:6px;margin:16px 0;">
        <p style="color:#dc2626;font-weight:bold;margin:0;">⚠️ ${extra?.anomaliesCount || 1} anomalie(s) détectée(s) lors de l'inspection</p>
        <p style="color:#7f1d1d;margin:8px 0 0 0;font-size:14px;">Une nouvelle intervention sera créée automatiquement pour traiter ces anomalies.</p>
       </div>`
    : `<div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:12px;border-radius:6px;margin:16px 0;">
        <p style="color:#16a34a;font-weight:bold;margin:0;">✅ Aucune anomalie détectée - Véhicule conforme</p>
       </div>`;
  
  const html = `
    <h2>Travaux terminés ${icon}</h2>
    <p style="font-size:16px;color:${color};font-weight:600;">Inspection post-travaux : ${status}</p>
    
    <table style="border-collapse:collapse;margin-top:16px;">
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Véhicule</td><td>${intervention.vehicule} (${intervention.immat})</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Description</td><td>${intervention.description}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Garage</td><td>${intervention.garage}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Montant final</td><td>${fmt(intervention.montant)} EUR</td></tr>
    </table>
    
    ${anomaliesHtml}
    
    <p style="margin-top:16px;">${linkButton(`${APP_URL}/inspections`, "Voir l'inspection")}</p>
    ${footer()}
  `;
  return { subject, html };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // Auth check: only authenticated users with appropriate roles
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    );
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Non authentifié" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role, current_organization_id")
      .eq("id", user.id)
      .single();

    console.log("[NOTIFY] User:", user.id, "Profile:", profile, "Error:", profileError);

    if (!profile) {
      console.error("[NOTIFY] Profil non trouvé pour user:", user.id);
      return NextResponse.json({ success: false, message: "Profil non trouvé" }, { status: 403 });
    }

    if (!["admin", "direction", "agent_parc", "exploitation", "mecanicien"].includes(profile.role)) {
      console.error("[NOTIFY] Rôle insuffisant:", profile.role, "pour user:", user.id);
      return NextResponse.json({ success: false, message: "Rôle insuffisant" }, { status: 403 });
    }
    
    console.log("[NOTIFY] Rôle autorisé:", profile.role, "Org:", profile.current_organization_id);
    
    // Récupérer l'organization_id pour filtrer les destinataires
    const userOrgId = profile.current_organization_id;

    const body = await request.json();
    const { type, interventionId, extra } = body as {
      type: NotifyType;
      interventionId: string;
      extra?: Record<string, any>;
    };

    console.log("[NOTIFY] type:", type, "interventionId:", interventionId);

    if (!interventionId) {
      return NextResponse.json(
        { success: false, message: "interventionId manquant" },
        { status: 400 }
      );
    }

    const intervention = await getIntervention(interventionId);
    if (!intervention) {
      return NextResponse.json(
        { success: false, message: "Intervention introuvable" },
        { status: 404 }
      );
    }

    let recipientIds: string[] = [];
    let recipientEmails: string[] = [];
    let subject = "";
    let html = "";

    switch (type) {
      case "INTERVENTION_CREATED": {
        // 🆕 AJOUT: exploitation notifié aussi
        recipientIds = await getUserIdsByRoles(["admin", "direction", "exploitation"], userOrgId);
        recipientEmails = await getEmailsByRoles(["admin", "direction", "exploitation"], userOrgId);
        const email = buildInterventionCreatedEmail(intervention);
        subject = email.subject;
        html = email.html;
        break;
      }

      case "INTERVENTION_APPROVED": {
        // 🆕 NOUVEAU: Remplace DEVIS_VALIDATED pour la validation initiale
        recipientIds = await getUserIdsByRoles(["agent_parc", "admin", "direction"], userOrgId);
        recipientEmails = await getEmailsByRoles(["agent_parc", "admin", "direction"], userOrgId);
        const email = buildInterventionApprovedEmail(intervention);
        subject = email.subject;
        html = email.html;
        break;
      }

      case "INTERVENTION_REJECTED": {
        // 🆕 NOUVEAU: Remplace DEVIS_REFUSED pour le refus initial
        // 🆕 AJOUT: exploitation notifié aussi
        recipientIds = await getUserIdsByRoles(["agent_parc", "admin", "direction", "exploitation"], userOrgId);
        recipientEmails = await getEmailsByRoles(["agent_parc", "admin", "direction", "exploitation"], userOrgId);
        const email = buildInterventionRejectedEmail(intervention);
        subject = email.subject;
        html = email.html;
        break;
      }

      case "DEVIS_UPLOADED": {
        recipientIds = await getUserIdsByRoles(["admin", "direction"], userOrgId);
        recipientEmails = await getEmailsByRoles(["admin", "direction"], userOrgId);
        const signedUrl = intervention.devis_path
          ? await getSignedDevisUrl(intervention.devis_path)
          : null;
        const email = buildDevisUploadedEmail(intervention, signedUrl);
        subject = email.subject;
        html = email.html;
        break;
      }

      case "DEVIS_VALIDATED": {
        // Vrai devis validé (après upload du PDF)
        recipientIds = await getUserIdsByRoles(["agent_parc", "admin", "direction"], userOrgId);
        recipientEmails = await getEmailsByRoles(["agent_parc", "admin", "direction"], userOrgId);
        const email = buildDevisValidatedEmail(intervention);
        subject = email.subject;
        html = email.html;
        break;
      }

      case "DEVIS_REFUSED": {
        // Vrai devis refusé (après upload du PDF)
        recipientIds = await getUserIdsByRoles(["agent_parc", "admin", "direction"], userOrgId);
        recipientEmails = await getEmailsByRoles(["agent_parc", "admin", "direction"], userOrgId);
        const email = buildDevisRefusedEmail(intervention);
        subject = email.subject;
        html = email.html;
        break;
      }

      case "RDV_PLANNED": {
        recipientIds = await getUserIdsByRoles(["admin", "direction", "exploitation", "agent_parc"], userOrgId);
        recipientEmails = await getEmailsByRoles(["admin", "direction", "exploitation", "agent_parc"], userOrgId);
        const email = buildRdvPlannedEmail(intervention);
        subject = email.subject;
        html = email.html;
        break;
      }

      case "INTERVENTION_COMPLETED": {
        recipientIds = await getUserIdsByRoles(["admin", "direction", "exploitation", "agent_parc"], userOrgId);
        recipientEmails = await getEmailsByRoles(["admin", "direction", "exploitation", "agent_parc"], userOrgId);
        const email = buildInterventionCompletedEmail(intervention);
        subject = email.subject;
        html = email.html;
        break;
      }

      case "INSPECTION_WORK_COMPLETED": {
        // 🆕 NOUVEAU: Inspection après travaux validée
        recipientIds = await getUserIdsByRoles(["admin", "direction", "exploitation", "agent_parc"], userOrgId);
        recipientEmails = await getEmailsByRoles(["admin", "direction", "exploitation", "agent_parc"], userOrgId);
        const email = buildInspectionWorkCompletedEmail(intervention, extra);
        subject = email.subject;
        html = email.html;
        break;
      }

      default:
        return NextResponse.json(
          { success: false, message: `Type inconnu: ${type}` },
          { status: 400 }
        );
    }

    if (recipientEmails.length === 0) {
      console.warn("[NOTIFY] Aucun destinataire trouvé pour", type);
      
      // Log quand même l'erreur
      await logNotification({
        triggerBy: user.id,
        eventType: type,
        recipients: [],
        recipientEmails: [],
        status: 'error',
        errorMessage: 'Aucun destinataire trouvé',
        metadata: { interventionId },
        interventionId,
      });
      
      return NextResponse.json({
        success: true,
        message: "Aucun destinataire (aucun profil avec ce rôle)",
        recipients: [],
      });
    }

    // Envoi de l'email (Resend d'abord, fallback Gmail si domaine non vérifié)
    let result = await sendMail({ to: recipientEmails, subject, html });
    
    // Si Resend échoue à cause du domaine non vérifié, essayer Gmail
    if (!result.success && (result.message.includes("domain is not verified") || result.message.includes("Domaine expéditeur"))) {
      console.log("[NOTIFY] Fallback vers Gmail SMTP...");
      result = await sendMailGmail({ to: recipientEmails, subject, html });
    }

    // 🆕 Log dans notification_logs
    await logNotification({
      triggerBy: user.id,
      eventType: type,
      recipients: recipientIds,
      recipientEmails: recipientEmails,
      status: result.success ? 'sent' : 'error',
      errorMessage: result.success ? undefined : result.message,
      metadata: { 
        interventionId, 
        extra,
        subject,
        mailerUsed: result.success && result.message.includes("Gmail") ? "gmail" : "resend",
      },
      interventionId,
      vehicleId: intervention.vehicle_id,
    });

    return NextResponse.json({
      success: result.success,
      message: result.message,
      recipients: recipientEmails,
    });
  } catch (error: any) {
    console.error("[NOTIFY] Erreur:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}

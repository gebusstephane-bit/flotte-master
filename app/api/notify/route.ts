export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { sendMail } from "@/lib/mailer";

// Server-side Supabase client (service role for reading profiles + signed URLs)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const APP_URL = process.env.APP_URL || "http://localhost:3000";

type NotifyType =
  | "INTERVENTION_CREATED"
  | "DEVIS_UPLOADED"
  | "DEVIS_VALIDATED"
  | "DEVIS_REFUSED"
  | "RDV_PLANNED"
  | "INTERVENTION_COMPLETED";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getEmailsByRoles(roles: string[]): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("email")
    .in("role", roles);

  if (error) {
    console.error("[NOTIFY] Erreur lecture profiles:", error);
    return [];
  }
  return (data || []).map((p) => p.email).filter(Boolean);
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

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "direction", "agent_parc"].includes(profile.role)) {
      return NextResponse.json({ success: false, message: "Rôle insuffisant" }, { status: 403 });
    }

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

    let recipients: string[] = [];
    let subject = "";
    let html = "";

    switch (type) {
      case "INTERVENTION_CREATED": {
        recipients = await getEmailsByRoles(["admin", "direction"]);
        const email = buildInterventionCreatedEmail(intervention);
        subject = email.subject;
        html = email.html;
        break;
      }

      case "DEVIS_UPLOADED": {
        recipients = await getEmailsByRoles(["admin", "direction"]);
        const signedUrl = intervention.devis_path
          ? await getSignedDevisUrl(intervention.devis_path)
          : null;
        const email = buildDevisUploadedEmail(intervention, signedUrl);
        subject = email.subject;
        html = email.html;
        break;
      }

      case "DEVIS_VALIDATED": {
        recipients = await getEmailsByRoles(["agent_parc", "admin", "direction"]);
        const email = buildDevisValidatedEmail(intervention);
        subject = email.subject;
        html = email.html;
        break;
      }

      case "DEVIS_REFUSED": {
        recipients = await getEmailsByRoles(["agent_parc", "admin", "direction"]);
        const email = buildDevisRefusedEmail(intervention);
        subject = email.subject;
        html = email.html;
        break;
      }

      case "RDV_PLANNED": {
        recipients = await getEmailsByRoles(["admin", "direction", "exploitation"]);
        const email = buildRdvPlannedEmail(intervention);
        subject = email.subject;
        html = email.html;
        break;
      }

      case "INTERVENTION_COMPLETED": {
        recipients = await getEmailsByRoles(["admin", "direction", "exploitation"]);
        const email = buildInterventionCompletedEmail(intervention);
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

    if (recipients.length === 0) {
      console.warn("[NOTIFY] Aucun destinataire trouvé pour", type);
      return NextResponse.json({
        success: true,
        message: "Aucun destinataire (aucun profil avec ce rôle)",
        recipients: [],
      });
    }

    const result = await sendMail({ to: recipients, subject, html });

    return NextResponse.json({
      success: result.success,
      message: result.message,
      recipients,
    });
  } catch (error: any) {
    console.error("[NOTIFY] Erreur:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { differenceInDays, parseISO } from "date-fns";

// Client Supabase avec service role
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Resend pour emails
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const APP_URL = process.env.APP_URL || "http://localhost:3000";
const FROM_EMAIL = process.env.MAIL_FROM_EMAIL || "onboarding@resend.dev";
const FROM_NAME = process.env.MAIL_FROM_NAME || "FleetFlow";

interface AlertConfig {
  type: string;
  label: string;
  field: "date_ct" | "date_tachy" | "date_atp";
}

const ALERT_CONFIGS: AlertConfig[] = [
  { type: "ct_30", label: "CT dans 30 jours", field: "date_ct" },
  { type: "ct_7", label: "CT dans 7 jours", field: "date_ct" },
  { type: "ct_1", label: "CT demain", field: "date_ct" },
  { type: "tachy_30", label: "Tachygraphe dans 30 jours", field: "date_tachy" },
  { type: "tachy_7", label: "Tachygraphe dans 7 jours", field: "date_tachy" },
  { type: "tachy_1", label: "Tachygraphe demain", field: "date_tachy" },
  { type: "atp_30", label: "ATP dans 30 jours", field: "date_atp" },
  { type: "atp_7", label: "ATP dans 7 jours", field: "date_atp" },
  { type: "atp_1", label: "ATP demain", field: "date_atp" },
];

// Vérification du cron secret pour sécurité
function verifyCronSecret(request: NextRequest): boolean {
  const secret = request.headers.get("x-cron-secret");
  return secret === process.env.CRON_SECRET;
}

export async function POST(request: NextRequest) {
  try {
    // Sécurité: vérifier le secret si configuré
    if (process.env.CRON_SECRET && !verifyCronSecret(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Si Resend non configuré, retourner info
    if (!resend) {
      return NextResponse.json({
        success: false,
        message: "Resend non configuré (RESEND_API_KEY manquante)",
        sent: 0,
      });
    }

    // Récupérer tous les véhicules avec dates d'échéance
    const { data: vehicles, error: vehiclesError } = await supabaseAdmin
      .from("vehicles")
      .select("id, immat, marque, type, date_ct, date_tachy, date_atp");

    if (vehiclesError) throw vehiclesError;

    // Récupérer les emails des utilisateurs admin/direction/agent_parc
    const { data: recipients, error: recipientsError } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .in("role", ["admin", "direction", "agent_parc"])
      .not("email", "is", null);

    if (recipientsError) throw recipientsError;

    const emails = recipients?.map((r) => r.email).filter(Boolean) || [];

    if (emails.length === 0) {
      return NextResponse.json({
        success: false,
        message: "Aucun destinataire configuré",
        sent: 0,
      });
    }

    const today = new Date();
    const alertsToSend: { vehicle: any; config: AlertConfig; daysLeft: number }[] = [];

    // Analyser chaque véhicule
    for (const vehicle of vehicles || []) {
      for (const config of ALERT_CONFIGS) {
        const dateStr = vehicle[config.field];
        if (!dateStr) continue;

        const expiryDate = parseISO(dateStr);
        const daysLeft = differenceInDays(expiryDate, today);

        // Vérifier si on doit envoyer l'alerte
        const expectedDays = config.type.endsWith("_30") ? 30 : config.type.endsWith("_7") ? 7 : 1;
        
        if (daysLeft === expectedDays) {
          // Vérifier si alerte déjà envoyée
          const { data: existing } = await supabaseAdmin
            .from("sent_alerts")
            .select("id")
            .eq("vehicle_id", vehicle.id)
            .eq("alert_type", config.type)
            .single();

          if (!existing) {
            alertsToSend.push({ vehicle, config, daysLeft });
          }
        }
      }
    }

    // Envoyer les emails
    let sentCount = 0;
    const errors: string[] = [];

    for (const alert of alertsToSend) {
      try {
        const subject = `[FLEETFLOW] Alerte: ${alert.config.label} - ${alert.vehicle.immat}`;
        const html = buildAlertEmail(alert.vehicle, alert.config, alert.daysLeft);

        await resend.emails.send({
          from: `${FROM_NAME} <${FROM_EMAIL}>`,
          to: emails,
          subject,
          html,
        });

        // Enregistrer l'alerte comme envoyée
        await supabaseAdmin.from("sent_alerts").insert({
          vehicle_id: alert.vehicle.id,
          alert_type: alert.config.type,
          recipient_email: emails.join(","),
        });

        sentCount++;
      } catch (err) {
        console.error(`[Alerts] Error sending ${alert.config.type} for ${alert.vehicle.immat}:`, err);
        errors.push(`${alert.vehicle.immat}: ${alert.config.type}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${sentCount} alertes envoyées`,
      sent: sentCount,
      totalPending: alertsToSend.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: unknown) {
    console.error("[Alerts Cron] Error:", error);
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

function buildAlertEmail(vehicle: any, config: AlertConfig, daysLeft: number): string {
  const urgencyColor = daysLeft <= 1 ? "#dc2626" : daysLeft <= 7 ? "#ea580c" : "#ca8a04";
  const urgencyText = daysLeft <= 1 ? "URGENT" : daysLeft <= 7 ? "Important" : "Information";

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${urgencyColor}; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">🔔 Alerte échéance véhicule</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">${urgencyText}</p>
      </div>
      
      <div style="padding: 30px; background: #f9fafb;">
        <p style="font-size: 16px; color: #374151;">
          Le véhicule suivant a une échéance <strong>${config.label.toLowerCase()}</strong> :
        </p>
        
        <table style="width: 100%; background: white; border-radius: 8px; margin: 20px 0; padding: 20px;">
          <tr>
            <td style="padding: 10px; color: #6b7280; width: 150px;">Immatriculation</td>
            <td style="padding: 10px; font-family: monospace; font-size: 18px; font-weight: bold; color: #111827;">${vehicle.immat}</td>
          </tr>
          <tr>
            <td style="padding: 10px; color: #6b7280;">Marque</td>
            <td style="padding: 10px; color: #111827;">${vehicle.marque}</td>
          </tr>
          <tr>
            <td style="padding: 10px; color: #6b7280;">Type</td>
            <td style="padding: 10px; color: #111827;">${vehicle.type}</td>
          </tr>
          <tr>
            <td style="padding: 10px; color: #6b7280;">Échéance</td>
            <td style="padding: 10px; color: ${urgencyColor}; font-weight: bold;">${config.label}</td>
          </tr>
        </table>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${APP_URL}/parc/${vehicle.id}" 
             style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Voir la fiche véhicule
          </a>
        </div>
        
        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 30px;">
          Cet email a été envoyé automatiquement par FleetFlow.<br>
          Pour ne plus recevoir ces alertes, contactez votre administrateur.
        </p>
      </div>
    </div>
  `;
}

// GET pour vérification simple (health check)
export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    resendConfigured: !!resend,
  });
}

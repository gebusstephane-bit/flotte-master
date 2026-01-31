// Mock notification system (email non configure)
// En production, remplacer par un vrai service email (Resend, SendGrid, etc.)

export interface NotifyParams {
  to: string[];
  subject: string;
  body: string;
}

export interface NotifyResult {
  success: boolean;
  message: string;
  recipients: string[];
}

/**
 * Fonction mock pour les notifications
 * Affiche dans la console et retourne un succes simule
 */
export function notifyMock({ to, subject, body }: NotifyParams): NotifyResult {
  console.log('='.repeat(60));
  console.log('[NOTIFICATION MOCK]');
  console.log('Destinataires:', to.join(', '));
  console.log('Sujet:', subject);
  console.log('Corps:');
  console.log(body);
  console.log('='.repeat(60));

  return {
    success: true,
    message: 'Notification envoyee (mode mock)',
    recipients: to,
  };
}

// Destinataires par defaut selon le role
export const NOTIFY_RECIPIENTS = {
  directeur: 'directeur@fleet.local',
  exploitation: 'exploitation@fleet.local',
  parc: 'parc@fleet.local',
} as const;

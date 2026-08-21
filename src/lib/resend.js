import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);
export const ZAKTALKS_EMAIL_FROM = 'ZakTalks <noreply@zaktalks.com>';
export const ZAKTALKS_ADMIN_EMAIL = process.env.ZAKTALKS_ADMIN_EMAIL || 'hello@zaktalks.com';

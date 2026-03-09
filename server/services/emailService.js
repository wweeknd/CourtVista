/**
 * CourtVista Email Service
 * Wraps the Resend API for sending verification and notification emails.
 * The backend is responsible ONLY for sending emails.
 * Token generation/storage happens on the frontend (localStorage).
 */
import { Resend } from 'resend';

let resend = null;

/**
 * Initialize the Resend client (called once at server startup)
 */
export function initEmailService(apiKey) {
    resend = new Resend(apiKey);
}

/**
 * Get the configured "from" address
 */
function getFromEmail() {
    return process.env.FROM_EMAIL || 'CourtVista <onboarding@resend.dev>';
}

// ─── HTML Email Templates ────────────────────────────────────────────────────

function baseTemplate(content) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { margin: 0; padding: 0; background: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .container { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #0f1629 0%, #1e293b 100%); padding: 32px 40px; text-align: center; }
        .header h1 { color: #d4a853; margin: 0; font-size: 24px; letter-spacing: 1px; }
        .header p { color: #94a3b8; margin: 8px 0 0; font-size: 13px; }
        .body { padding: 32px 40px; color: #334155; line-height: 1.6; }
        .body h2 { color: #0f1629; margin: 0 0 16px; font-size: 20px; }
        .body p { margin: 0 0 16px; font-size: 15px; }
        .btn { display: inline-block; padding: 14px 32px; background: #d4a853; color: #0f1629; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 8px 0 24px; }
        .btn:hover { background: #c49a48; }
        .details { background: #f8fafc; border-radius: 8px; padding: 20px; margin: 16px 0; border: 1px solid #e2e8f0; }
        .details-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
        .details-row:last-child { border-bottom: none; }
        .details-label { color: #64748b; font-weight: 500; }
        .details-value { color: #0f1629; font-weight: 600; text-align: right; }
        .footer { padding: 24px 40px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; }
        .footer a { color: #d4a853; text-decoration: none; }
        .warning { background: #fef3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 12px 16px; margin: 16px 0; font-size: 13px; color: #856404; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>CourtVista</h1>
            <p>Your Trusted Legal Platform</p>
        </div>
        <div class="body">
            ${content}
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} CourtVista. All rights reserved.</p>
            <p>This is an automated message. Please do not reply directly.</p>
        </div>
    </div>
</body>
</html>`;
}

// ─── Email Senders ───────────────────────────────────────────────────────────

/**
 * Send a verification email with a token link.
 * @param {string} to - recipient email
 * @param {string} name - user's display name
 * @param {string} token - raw verification token (not hashed)
 */
export async function sendVerificationEmail(to, name, token) {
    const verifyUrl = `${process.env.VERIFY_URL || 'http://localhost:5173/verify-email'}?token=${encodeURIComponent(token)}&email=${encodeURIComponent(to)}`;

    const html = baseTemplate(`
        <h2>Verify Your Email</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Welcome to CourtVista! Please verify your email address to complete your registration and start booking consultations.</p>
        <div style="text-align: center;">
            <a href="${verifyUrl}" class="btn">Verify Email Address</a>
        </div>
        <div class="warning">
            ⏰ This verification link expires in <strong>24 hours</strong>. If you didn't create a CourtVista account, you can safely ignore this email.
        </div>
        <p style="font-size: 13px; color: #64748b;">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="font-size: 12px; color: #94a3b8; word-break: break-all;">${verifyUrl}</p>
    `);

    const { data, error } = await resend.emails.send({
        from: getFromEmail(),
        to: [to],
        subject: 'Verify Your Email — CourtVista',
        html,
    });

    if (error) {
        console.error('Failed to send verification email:', error);
        throw new Error(error.message || 'Failed to send verification email');
    }

    return data;
}

/**
 * Send booking confirmation email to the client.
 */
export async function sendBookingConfirmation(to, details) {
    const { clientName, lawyerName, date, time, caseType, consultationFee } = details;

    const html = baseTemplate(`
        <h2>Booking Confirmed! ✅</h2>
        <p>Hi <strong>${clientName}</strong>,</p>
        <p>Your consultation request has been successfully submitted. Here are the details:</p>
        <div class="details">
            <div class="details-row">
                <span class="details-label">Lawyer</span>
                <span class="details-value">${lawyerName}</span>
            </div>
            <div class="details-row">
                <span class="details-label">Case Type</span>
                <span class="details-value">${caseType || 'General Consultation'}</span>
            </div>
            ${date ? `<div class="details-row">
                <span class="details-label">Preferred Date</span>
                <span class="details-value">${date}</span>
            </div>` : ''}
            ${time ? `<div class="details-row">
                <span class="details-label">Time Slot</span>
                <span class="details-value">${time}</span>
            </div>` : ''}
            ${consultationFee ? `<div class="details-row">
                <span class="details-label">Consultation Fee</span>
                <span class="details-value">₹${consultationFee}</span>
            </div>` : ''}
        </div>
        <p>The lawyer will review your request and respond within 24 hours. You'll receive a notification once they accept.</p>
        <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/user" class="btn">View My Consultations</a>
        </div>
    `);

    const { data, error } = await resend.emails.send({
        from: getFromEmail(),
        to: [to],
        subject: `Consultation Booked with ${lawyerName} — CourtVista`,
        html,
    });

    if (error) {
        console.error('Failed to send booking confirmation:', error);
        throw new Error(error.message || 'Failed to send booking confirmation');
    }

    return data;
}

/**
 * Send booking notification email to the lawyer.
 */
export async function sendLawyerNotification(to, details) {
    const { clientName, lawyerName, date, time, caseType, clientEmail, message } = details;

    const html = baseTemplate(`
        <h2>New Consultation Request 📋</h2>
        <p>Hi <strong>${lawyerName}</strong>,</p>
        <p>You have a new consultation request from a potential client:</p>
        <div class="details">
            <div class="details-row">
                <span class="details-label">Client Name</span>
                <span class="details-value">${clientName}</span>
            </div>
            <div class="details-row">
                <span class="details-label">Client Email</span>
                <span class="details-value">${clientEmail}</span>
            </div>
            <div class="details-row">
                <span class="details-label">Case Type</span>
                <span class="details-value">${caseType || 'General Consultation'}</span>
            </div>
            ${date ? `<div class="details-row">
                <span class="details-label">Preferred Date</span>
                <span class="details-value">${date}</span>
            </div>` : ''}
            ${time ? `<div class="details-row">
                <span class="details-label">Time Slot</span>
                <span class="details-value">${time}</span>
            </div>` : ''}
        </div>
        ${message ? `<p><strong>Client's Message:</strong></p><p style="background: #f8fafc; padding: 12px; border-radius: 8px; font-style: italic;">"${message}"</p>` : ''}
        <p>Please log in to your dashboard to accept or decline this request.</p>
        <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/lawyer" class="btn">View Request</a>
        </div>
    `);

    const { data, error } = await resend.emails.send({
        from: getFromEmail(),
        to: [to],
        subject: `New Consultation Request from ${clientName} — CourtVista`,
        html,
    });

    if (error) {
        console.error('Failed to send lawyer notification:', error);
        throw new Error(error.message || 'Failed to send lawyer notification');
    }

    return data;
}

/**
 * Send cancellation / decline email to the client.
 */
export async function sendCancellationEmail(to, details) {
    const { clientName, lawyerName, date, reason } = details;

    const html = baseTemplate(`
        <h2>Consultation Update</h2>
        <p>Hi <strong>${clientName}</strong>,</p>
        <p>We're sorry to inform you that your consultation request with <strong>${lawyerName}</strong> has been declined.</p>
        <div class="details">
            <div class="details-row">
                <span class="details-label">Lawyer</span>
                <span class="details-value">${lawyerName}</span>
            </div>
            ${date ? `<div class="details-row">
                <span class="details-label">Requested Date</span>
                <span class="details-value">${date}</span>
            </div>` : ''}
            ${reason ? `<div class="details-row">
                <span class="details-label">Reason</span>
                <span class="details-value">${reason}</span>
            </div>` : ''}
        </div>
        <p>Don't worry — there are many qualified lawyers on CourtVista. You can search for another lawyer who fits your needs.</p>
        <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/search" class="btn">Find Another Lawyer</a>
        </div>
    `);

    const { data, error } = await resend.emails.send({
        from: getFromEmail(),
        to: [to],
        subject: `Consultation Update — CourtVista`,
        html,
    });

    if (error) {
        console.error('Failed to send cancellation email:', error);
        throw new Error(error.message || 'Failed to send cancellation email');
    }

    return data;
}

/**
 * Send acceptance confirmation email to the client.
 */
export async function sendAcceptanceEmail(to, details) {
    const { clientName, lawyerName, date, time } = details;

    const html = baseTemplate(`
        <h2>Consultation Accepted! 🎉</h2>
        <p>Hi <strong>${clientName}</strong>,</p>
        <p>Great news! <strong>${lawyerName}</strong> has accepted your consultation request.</p>
        <div class="details">
            <div class="details-row">
                <span class="details-label">Lawyer</span>
                <span class="details-value">${lawyerName}</span>
            </div>
            ${date ? `<div class="details-row">
                <span class="details-label">Date</span>
                <span class="details-value">${date}</span>
            </div>` : ''}
            ${time ? `<div class="details-row">
                <span class="details-label">Time</span>
                <span class="details-value">${time}</span>
            </div>` : ''}
        </div>
        <p>You can now message the lawyer directly through your dashboard.</p>
        <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/user" class="btn">Go to Dashboard</a>
        </div>
    `);

    const { data, error } = await resend.emails.send({
        from: getFromEmail(),
        to: [to],
        subject: `${lawyerName} Accepted Your Consultation — CourtVista`,
        html,
    });

    if (error) {
        console.error('Failed to send acceptance email:', error);
        throw new Error(error.message || 'Failed to send acceptance email');
    }

    return data;
}

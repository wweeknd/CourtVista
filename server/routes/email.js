/**
 * Email API Routes
 * Backend only sends emails — token generation/storage is on the frontend.
 */
import { Router } from 'express';
import {
    sendVerificationEmail,
    sendBookingConfirmation,
    sendLawyerNotification,
    sendCancellationEmail,
    sendAcceptanceEmail,
} from '../services/emailService.js';

const router = Router();

// ─── Send Verification Email ─────────────────────────────────────────────────
router.post('/send-verification', async (req, res) => {
    try {
        const { email, name, token } = req.body;

        if (!email || !name || !token) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: email, name, token',
            });
        }

        await sendVerificationEmail(email, name, token);

        res.json({ success: true, message: 'Verification email sent' });
    } catch (error) {
        console.error('Send verification error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to send verification email',
        });
    }
});

// ─── Booking Confirmation (to client) ────────────────────────────────────────
router.post('/booking-confirmation', async (req, res) => {
    try {
        const { email, details } = req.body;

        if (!email || !details) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: email, details',
            });
        }

        await sendBookingConfirmation(email, details);

        res.json({ success: true, message: 'Booking confirmation email sent' });
    } catch (error) {
        console.error('Booking confirmation error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to send booking confirmation',
        });
    }
});

// ─── Lawyer Notification (to lawyer) ─────────────────────────────────────────
router.post('/lawyer-notification', async (req, res) => {
    try {
        const { email, details } = req.body;

        if (!email || !details) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: email, details',
            });
        }

        await sendLawyerNotification(email, details);

        res.json({ success: true, message: 'Lawyer notification email sent' });
    } catch (error) {
        console.error('Lawyer notification error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to send lawyer notification',
        });
    }
});

// ─── Cancellation Email ──────────────────────────────────────────────────────
router.post('/cancellation', async (req, res) => {
    try {
        const { email, details } = req.body;

        if (!email || !details) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: email, details',
            });
        }

        await sendCancellationEmail(email, details);

        res.json({ success: true, message: 'Cancellation email sent' });
    } catch (error) {
        console.error('Cancellation email error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to send cancellation email',
        });
    }
});

// ─── Acceptance Email (to client when lawyer accepts) ────────────────────────
router.post('/acceptance', async (req, res) => {
    try {
        const { email, details } = req.body;

        if (!email || !details) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: email, details',
            });
        }

        await sendAcceptanceEmail(email, details);

        res.json({ success: true, message: 'Acceptance email sent' });
    } catch (error) {
        console.error('Acceptance email error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to send acceptance email',
        });
    }
});

export default router;

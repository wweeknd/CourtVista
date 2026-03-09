/**
 * CourtVista Email Server
 * Lightweight Express backend responsible ONLY for sending emails via Resend API.
 * All user data and verification tokens remain in the frontend's localStorage.
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import emailRoutes from './routes/email.js';
import { initEmailService } from './services/emailService.js';

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ─── Middleware ──────────────────────────────────────────────────────────────

// Strict CORS — only allow the frontend origin
app.use(cors({
    origin: FRONTEND_URL,
    methods: ['POST'],
    allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

// ─── Initialize Email Service ────────────────────────────────────────────────

const RESEND_API_KEY = process.env.RESEND_API_KEY;
if (!RESEND_API_KEY || RESEND_API_KEY.startsWith('re_xxx')) {
    console.warn('⚠️  RESEND_API_KEY is not configured. Emails will fail to send.');
    console.warn('   Set your API key in server/.env — get one at https://resend.com/api-keys');
}
initEmailService(RESEND_API_KEY);

// ─── Routes ──────────────────────────────────────────────────────────────────

app.use('/api/email', emailRoutes);

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'CourtVista Email Server' });
});

// ─── Start Server ────────────────────────────────────────────────────────────

app.listen(PORT, () => {
    console.log(`✉️  CourtVista Email Server running on port ${PORT}`);
    console.log(`   CORS origin: ${FRONTEND_URL}`);
    console.log(`   Resend API: ${RESEND_API_KEY ? '✓ configured' : '✗ not configured'}`);
});

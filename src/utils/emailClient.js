/**
 * Frontend Email API Client
 * Handles communication with the backend email server and
 * token generation/verification on the client side.
 * 
 * Token flow:
 *   1. Frontend generates a random token
 *   2. Frontend computes SHA-256 hash and stores hash + expiry in user record
 *   3. Frontend sends the raw token to backend → backend emails it to user
 *   4. User clicks link → VerifyEmail page reads token from URL
 *   5. Frontend hashes the URL token and compares with stored hash
 *   6. If match + not expired → user marked as verified
 */

const API_BASE = 'http://localhost:3001/api/email';

// ─── Token Generation & Hashing ─────────────────────────────────────────────

/**
 * Generate a cryptographically secure random token (hex string).
 */
export function generateToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Compute SHA-256 hash of a token string.
 * Returns a hex string.
 */
export async function hashToken(token) {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ─── LocalStorage Helpers ────────────────────────────────────────────────────

function getStoredUsers() {
    try {
        return JSON.parse(localStorage.getItem('courtvista_users')) || [];
    } catch {
        return [];
    }
}

function saveUsers(users) {
    localStorage.setItem('courtvista_users', JSON.stringify(users));
}

// ─── Verification Token Management ──────────────────────────────────────────

/**
 * Store a verification token hash + expiry in the user's localStorage record.
 * @param {string} email - user's email
 * @param {string} tokenHash - SHA-256 hash of the raw token
 * @param {number} expiryHours - hours until expiry (default 24)
 */
export function storeVerificationToken(email, tokenHash, expiryHours = 24) {
    const users = getStoredUsers();
    const expiry = Date.now() + expiryHours * 60 * 60 * 1000;
    const updated = users.map((u) => {
        if (u.email.toLowerCase() === email.toLowerCase()) {
            return { ...u, verificationTokenHash: tokenHash, verificationExpiry: expiry };
        }
        return u;
    });
    saveUsers(updated);
}

/**
 * Verify a token against the stored hash for a given email.
 * @param {string} email - user's email
 * @param {string} tokenHash - SHA-256 hash of the token from the URL
 * @returns {{ success: boolean, message: string }}
 */
export function verifyStoredToken(email, tokenHash) {
    const users = getStoredUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
        return { success: false, message: 'User not found.' };
    }

    if (user.emailVerified) {
        return { success: true, message: 'Email already verified.' };
    }

    if (!user.verificationTokenHash) {
        return { success: false, message: 'No verification token found. Please request a new one.' };
    }

    if (Date.now() > user.verificationExpiry) {
        return { success: false, message: 'Verification link has expired. Please request a new one.', expired: true };
    }

    if (user.verificationTokenHash !== tokenHash) {
        return { success: false, message: 'Invalid verification token.' };
    }

    // Mark user as verified
    const updated = users.map((u) => {
        if (u.email.toLowerCase() === email.toLowerCase()) {
            return {
                ...u,
                emailVerified: true,
                verificationTokenHash: null,
                verificationExpiry: null,
            };
        }
        return u;
    });
    saveUsers(updated);

    // Also update session if user is logged in
    try {
        const sessionUser = JSON.parse(sessionStorage.getItem('courtvista_user'));
        if (sessionUser && sessionUser.email.toLowerCase() === email.toLowerCase()) {
            sessionStorage.setItem('courtvista_user', JSON.stringify({
                ...sessionUser,
                emailVerified: true,
            }));
        }
    } catch { /* ignore */ }

    return { success: true, message: 'Email verified successfully!' };
}

/**
 * Check if a user's email is verified.
 */
export function isUserVerified(email) {
    const users = getStoredUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    return user?.emailVerified === true;
}

// ─── Backend API Calls ──────────────────────────────────────────────────────

/**
 * Request the backend to send a verification email.
 */
export async function requestVerificationEmail(email, name, token) {
    try {
        const res = await fetch(`${API_BASE}/send-verification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name, token }),
        });
        return await res.json();
    } catch (error) {
        console.error('Failed to request verification email:', error);
        return { success: false, message: 'Failed to send verification email. Please try again.' };
    }
}

/**
 * Send booking confirmation email to client.
 */
export async function sendBookingConfirmationEmail(clientEmail, details) {
    try {
        const res = await fetch(`${API_BASE}/booking-confirmation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: clientEmail, details }),
        });
        return await res.json();
    } catch (error) {
        console.error('Failed to send booking confirmation:', error);
        return { success: false, message: 'Failed to send booking confirmation email.' };
    }
}

/**
 * Send notification email to lawyer about new booking.
 */
export async function sendLawyerNotificationEmail(lawyerEmail, details) {
    try {
        const res = await fetch(`${API_BASE}/lawyer-notification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: lawyerEmail, details }),
        });
        return await res.json();
    } catch (error) {
        console.error('Failed to send lawyer notification:', error);
        return { success: false, message: 'Failed to send lawyer notification email.' };
    }
}

/**
 * Send cancellation email to client.
 */
export async function sendCancellationEmailRequest(clientEmail, details) {
    try {
        const res = await fetch(`${API_BASE}/cancellation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: clientEmail, details }),
        });
        return await res.json();
    } catch (error) {
        console.error('Failed to send cancellation email:', error);
        return { success: false, message: 'Failed to send cancellation email.' };
    }
}

/**
 * Send acceptance email to client when lawyer accepts.
 */
export async function sendAcceptanceEmailRequest(clientEmail, details) {
    try {
        const res = await fetch(`${API_BASE}/acceptance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: clientEmail, details }),
        });
        return await res.json();
    } catch (error) {
        console.error('Failed to send acceptance email:', error);
        return { success: false, message: 'Failed to send acceptance email.' };
    }
}

/**
 * Full verification flow: generate token → store hash → send email.
 * Returns the result of the email send request.
 */
export async function initiateEmailVerification(email, name) {
    const token = generateToken();
    const tokenHash = await hashToken(token);
    storeVerificationToken(email, tokenHash);
    return await requestVerificationEmail(email, name, token);
}

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

import { auth } from "../firebase";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    sendEmailVerification,
} from "firebase/auth";

import { db } from "../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";

const AuthContext = createContext(null);
const googleProvider = new GoogleAuthProvider();

// Hardcoded admin account
const ADMIN_ACCOUNT = {
    id: 'admin-001',
    name: 'Admin',
    email: import.meta.env.VITE_ADMIN_EMAIL || 'admin@courtvista.com',
    password: import.meta.env.VITE_ADMIN_PASSWORD || '',
    role: 'admin',
    emailVerified: true,
};

/**
 * Maps Firebase Auth error codes to human-readable messages.
 */
export function mapAuthError(error) {
    const code = error?.code || '';
    const map = {
        'auth/user-not-found':       'No account found with this email.',
        'auth/wrong-password':       'Incorrect password. Please try again.',
        'auth/invalid-credential':   'Invalid email or password.',
        'auth/email-already-in-use': 'An account with this email already exists.',
        'auth/weak-password':        'Password must be at least 6 characters.',
        'auth/invalid-email':        'Please enter a valid email address.',
        'auth/too-many-requests':    'Too many attempts. Please wait a moment and try again.',
        'auth/network-request-failed': 'Network error. Please check your connection.',
        'auth/popup-closed-by-user': 'Sign-in popup was closed. Please try again.',
        'auth/cancelled-popup-request': 'Sign-in was cancelled.',
        'auth/user-disabled':        'This account has been disabled. Contact support.',
    };
    return map[code] || error?.message || 'Something went wrong. Please try again.';
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    // NEW: prevents ProtectedRoute from redirecting before auth resolves
    const [authLoading, setAuthLoading] = useState(true);

    // Ref to track an in-progress Google sign-in so onAuthStateChanged doesn't race
    const googleSignInPending = useRef(false);
    // Ref to hold a new Google user's data until they pick a role on SelectRole
    const pendingGoogleUser = useRef(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            try {
                if (firebaseUser) {
                    // If a Google sign-in is in progress, let loginWithGoogle handle the user state
                    if (googleSignInPending.current) {
                        return;
                    }

                    // Always resolve from Firestore (single source of truth)
                    try {
                        const userDocRef = doc(db, "users", firebaseUser.uid);
                        const userDocSnap = await getDoc(userDocRef);

                        if (userDocSnap.exists()) {
                            const data = userDocSnap.data();
                            // Remove Firestore Timestamps that can't serialize to JSON
                            const { createdAt, updatedAt, ...safeData } = data;
                            const resolvedUser = {
                                id: firebaseUser.uid,
                                name: data.name || firebaseUser.displayName || 'User',
                                email: data.email || firebaseUser.email,
                                role: data.role || 'user',
                                emailVerified: firebaseUser.emailVerified,
                                ...safeData
                            };
                            setUser(resolvedUser);
                            return;
                        }
                    } catch (e) {
                        console.error("Auth state recovery error:", e);
                    }

                    // Firestore unavailable or no doc — minimal fallback
                    setUser({
                        id: firebaseUser.uid,
                        name: firebaseUser.displayName || 'User',
                        email: firebaseUser.email,
                        role: 'user',
                        emailVerified: firebaseUser.emailVerified
                    });
                } else {
                    setUser(null);
                }
            } finally {
                // CRITICAL: always unlock, even on error, so the app doesn't hang
                setAuthLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    /**
     * Register a new user (role = 'user' or 'lawyer').
     * Sends Firebase native email verification immediately.
     */
    async function register({ name, email, password, role }) {
        try {
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                email.toLowerCase(),
                password
            );

            const firebaseUser = userCredential.user;
            await setDoc(doc(db, "users", firebaseUser.uid), {
                name,
                email: email.toLowerCase(),
                role,
                createdAt: new Date()
            });

            // Send Firebase native verification email (no backend needed)
            try {
                await sendEmailVerification(firebaseUser);
            } catch (verifyErr) {
                console.warn("Could not send verification email:", verifyErr);
            }

            const newUser = {
                id: firebaseUser.uid,
                name,
                email: email.toLowerCase(),
                role,
                emailVerified: firebaseUser.emailVerified
            };

            setUser(newUser);

            return { success: true, user: newUser };

        } catch (error) {
            return { success: false, message: mapAuthError(error) };
        }
    }

    /**
     * Login with email + password.
     * Verification is enforced at booking/Q&A time — login itself is always allowed.
     */
    async function login(email, password) {

        // Admin login stays the same
        if (email.toLowerCase() === ADMIN_ACCOUNT.email && password === ADMIN_ACCOUNT.password) {
            const adminUser = {
                id: ADMIN_ACCOUNT.id,
                name: ADMIN_ACCOUNT.name,
                email: ADMIN_ACCOUNT.email,
                role: ADMIN_ACCOUNT.role,
                emailVerified: true,
            };
            setUser(adminUser);
            setAuthLoading(false);
            return { success: true, user: adminUser };
        }

        try {
            const userCredential = await signInWithEmailAndPassword(
                auth,
                email.toLowerCase(),
                password
            );

            const firebaseUser = userCredential.user;

            // Resolve user from Firestore (single source of truth)
            let resolvedUser = null;
            try {
                const userDocRef = doc(db, "users", firebaseUser.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const data = userDocSnap.data();
                    const { createdAt, updatedAt, ...safeData } = data;
                    resolvedUser = {
                        id: firebaseUser.uid,
                        name: data.name || firebaseUser.displayName || 'User',
                        email: data.email || firebaseUser.email,
                        role: data.role || 'user',
                        emailVerified: firebaseUser.emailVerified,
                        ...safeData
                    };
                }
            } catch (firestoreErr) {
                console.warn("Could not fetch user from Firestore:", firestoreErr);
            }

            // Final fallback if not in Firestore
            if (!resolvedUser) {
                resolvedUser = {
                    id: firebaseUser.uid,
                    name: firebaseUser.displayName || 'User',
                    email: firebaseUser.email,
                    role: 'user',
                    emailVerified: firebaseUser.emailVerified
                };
            }

            setUser(resolvedUser);
            return { success: true, user: resolvedUser };

        } catch (error) {
            console.error("Login Error:", error);
            return { success: false, message: mapAuthError(error) };
        }
    }

    /**
     * Send a password reset email.
     */
    async function sendPasswordReset(email) {
        try {
            await sendPasswordResetEmail(auth, email.toLowerCase());
            return { success: true };
        } catch (error) {
            return { success: false, message: mapAuthError(error) };
        }
    }

    /**
     * Resend Firebase email verification to the currently signed-in user.
     */
    async function resendEmailVerification() {
        const currentUser = auth.currentUser;
        if (!currentUser) return { success: false, message: 'Not signed in.' };
        try {
            await sendEmailVerification(currentUser);
            return { success: true };
        } catch (error) {
            return { success: false, message: mapAuthError(error) };
        }
    }

    async function loginWithGoogle() {
        try {
            // Signal onAuthStateChanged to NOT auto-set user during this flow
            googleSignInPending.current = true;

            const result = await signInWithPopup(auth, googleProvider);
            const firebaseUser = result.user;

            // Check Firestore for existing profile
            let found = null;
            try {
                const userDocRef = doc(db, "users", firebaseUser.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const data = userDocSnap.data();
                    const { createdAt, updatedAt, ...safeData } = data;
                    found = {
                        id: firebaseUser.uid,
                        name: data.name || firebaseUser.displayName || "User",
                        email: data.email || firebaseUser.email,
                        role: data.role || 'user',
                        emailVerified: firebaseUser.emailVerified,
                        profilePicture: data.profilePicture || firebaseUser.photoURL || null,
                        ...safeData
                    };

                    googleSignInPending.current = false;
                    setUser(found);
                    setAuthLoading(false);
                    return { success: true, user: found };
                }
            } catch (e) {
                console.error("Firestore lookup during Google login failed:", e);
            }

            // ── NEW USER: Don't log them in yet — they must pick a role first ──
            pendingGoogleUser.current = {
                id: firebaseUser.uid,
                name: firebaseUser.displayName || "User",
                email: firebaseUser.email,
                emailVerified: firebaseUser.emailVerified,
                profilePicture: firebaseUser.photoURL || null
            };

            // Keep the pending flag ON — onAuthStateChanged must stay out of the way
            // until completeGoogleSignup() is called from SelectRole
            return {
                success: true,
                user: pendingGoogleUser.current,
                needsRole: true
            };

        } catch (error) {
            googleSignInPending.current = false;
            setAuthLoading(false);
            console.error("Google login error:", error);
            return { success: false, message: mapAuthError(error) };
        }
    }

    /**
     * Complete a new Google sign-up by saving the chosen role.
     * Called from SelectRole after the user picks 'user' or 'lawyer'.
     */
    async function completeGoogleSignup(role) {
        const pending = pendingGoogleUser.current;
        if (!pending) {
            return { success: false, message: 'No pending Google sign-up.' };
        }

        const newUser = {
            ...pending,
            role,
        };

        // Save to Firestore 'users' collection
        try {
            await setDoc(doc(db, "users", newUser.id), {
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                profilePicture: newUser.profilePicture || null,
                emailVerified: newUser.emailVerified,
                createdAt: new Date()
            });
        } catch (err) {
            console.error("Firestore save during Google signup failed:", err);
        }

        // If lawyer, also add to 'lawyers' collection so they appear in search
        if (role === 'lawyer') {
            try {
                await setDoc(doc(db, "lawyers", newUser.id), {
                    name: newUser.name,
                    email: newUser.email,
                    role: 'lawyer',
                    profilePicture: newUser.profilePicture || null,
                    createdAt: new Date()
                });
            } catch (err) {
                console.error("Firestore lawyers save during Google signup failed:", err);
            }
        }

        // Clear pending state, allow onAuthStateChanged to work normally
        pendingGoogleUser.current = null;
        googleSignInPending.current = false;

        setUser(newUser);
        setAuthLoading(false);
        return { success: true, user: newUser };
    }

    // Logout
    async function logout() {
        pendingGoogleUser.current = null;
        googleSignInPending.current = false;
        await signOut(auth);
        setUser(null);
    }

    // Update user profile — writes to Firestore only
    async function updateProfile(updates) {
        if (!user) return { success: false, message: 'Not logged in.' };

        const updatedUser = { ...user, ...updates };
        setUser(updatedUser);

        const firestoreUpdates = { ...updatedUser };

        try {
            // 1. Always update the 'users' collection
            await setDoc(doc(db, "users", user.id), {
                ...firestoreUpdates,
                updatedAt: new Date()
            });
        } catch (err) {
            console.error("Firestore users update failed:", err);
            return { success: false, message: 'Failed to save profile. Please try again.' };
        }

        // 2. For lawyers: ALSO update the 'lawyers' collection
        if (updatedUser.role === 'lawyer') {
            try {
                await setDoc(doc(db, "lawyers", user.id), {
                    ...firestoreUpdates,
                    updatedAt: new Date()
                }, { merge: true });
            } catch (err) {
                console.error("Firestore lawyers update failed:", err);
            }
        }

        return { success: true, user: updatedUser };
    }

    /**
     * Refresh user data from Firestore.
     */
    async function refreshUser() {
        if (!user || !user.id || user.id === ADMIN_ACCOUNT.id) return;
        try {
            const userDocRef = doc(db, "users", user.id);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const data = userDocSnap.data();
                const { createdAt, updatedAt, ...safeData } = data;
                setUser({
                    ...user,
                    ...safeData,
                    emailVerified: auth.currentUser?.emailVerified || user.emailVerified,
                });
            }
        } catch (e) {
            console.error("refreshUser error:", e);
        }
    }

    // Get the current lawyer's dynamic profile (for search listing)
    const getLawyerProfile = useCallback(() => {
        if (!user || user.role !== 'lawyer') return null;
        return {
            id: user.id,
            name: user.name,
            photo: user.profilePicture || null,
            gender: user.gender || '',
            specializations: user.specializations || [],
            experience: Number(user.experience) || 0,
            rating: Number(user.rating) || 0,
            reviewCount: Number(user.reviewCount) || 0,
            verified: user.verified || false,
            city: user.city || user.jurisdiction || '',
            jurisdiction: user.jurisdiction || '',
            languages: user.languages || ['English'],
            feesRange: user.feesRange || null,
            consultationFee: Number(user.consultationFee) || 0,
            education: user.education || '',
            barCouncilNumber: user.barCouncilNumber || '',
            bio: user.bio || '',
            totalCases: Number(user.totalCases) || 0,
            pendingCases: Number(user.pendingCases) || 0,
            awards: user.awards || [],
            reviews: user.reviews || [],
            isProBono: user.isProBono || false,
            isDynamic: true,
        };
    }, [user]);

    // Get dashboard path based on role (accepts optional role override to avoid stale context)
    function getDashboardPath(role) {
        const r = role || user?.role;
        if (!r) return '/login';
        switch (r) {
            case 'admin': return '/dashboard/admin';
            case 'lawyer': return '/dashboard/lawyer';
            default: return '/dashboard/user';
        }
    }

    return (
        <AuthContext.Provider value={{
            user,
            authLoading,
            login,
            register,
            logout,
            updateProfile,
            refreshUser,
            getDashboardPath,
            getLawyerProfile,
            loginWithGoogle,
            completeGoogleSignup,
            pendingGoogleUser,
            sendPasswordReset,
            resendEmailVerification,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

// Custom hook for easy access
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

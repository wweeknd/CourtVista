import { createContext, useContext, useState, useEffect, useCallback } from 'react';

import { auth } from "../firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";

const AuthContext = createContext(null);
const googleProvider = new GoogleAuthProvider();

// Hardcoded admin account
const ADMIN_ACCOUNT = {
    id: 'admin-001',
    name: 'Admin',
    email: 'admin@courtvista.com',
    password: 'admin123',
    role: 'admin',
    emailVerified: true,
};

// Helper: get all registered users from localStorage
function getStoredUsers() {
    try {
        return JSON.parse(localStorage.getItem('courtvista_users')) || [];
    } catch {
        return [];
    }
}

// Helper: build a searchable lawyer object from a user record
function userToLawyerProfile(u, index) {
    const languages = u.languages
        ? u.languages.split(',').map((l) => l.trim()).filter(Boolean)
        : ['English'];
    const specializations = u.specializations
        ? (Array.isArray(u.specializations) ? u.specializations : u.specializations.split(',').map((s) => s.trim()).filter(Boolean))
        : [];
    return {
        id: u.id,
        name: u.name,
        photo: u.profilePicture || null,
        gender: u.gender || '',
        specializations,
        experience: Number(u.experience) || 0,
        rating: Number(u.rating) || 0,
        reviewCount: 0,
        verified: false,
        city: u.city || u.jurisdiction || '',
        jurisdiction: u.jurisdiction || '',
        languages,
        feesRange: u.feesRange || null,
        consultationFee: Number(u.consultationFee) || 0,
        education: u.education || '',
        barCouncilNumber: u.barCouncilNumber || '',
        bio: u.bio || '',
        totalCases: 0,
        pendingCases: 0,
        awards: [],
        reviews: [],
        isProBono: u.isProBono || false,
        isDynamic: true,  // flag to distinguish from static profiles
    };
}

// Helper: get all dynamic lawyer profiles built from registered users
export function getDynamicLawyers() {
    try {
        const users = JSON.parse(localStorage.getItem('courtvista_users')) || [];
        return users
            .filter((u) => u.role === 'lawyer')
            .map((u, i) => userToLawyerProfile(u, i));
    } catch {
        return [];
    }
}

// Helper: get currently logged-in user from sessionStorage
function getStoredCurrentUser() {
    try {
        return JSON.parse(sessionStorage.getItem('courtvista_user')) || null;
    } catch {
        return null;
    }
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(getStoredCurrentUser);

    // Keep sessionStorage in sync whenever user changes
    useEffect(() => {
        if (user) {
            sessionStorage.setItem('courtvista_user', JSON.stringify(user));
        } else {
            sessionStorage.removeItem('courtvista_user');
        }
    }, [user]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                const users = getStoredUsers();
                const found = users.find((u) => u.id === firebaseUser.uid);

                if (found) {
                    setUser(found);
                }
            } else {
                setUser(null);
            }
        });

        return () => unsubscribe();
    }, []);

    /**
     * Register a new user (role = 'user' or 'lawyer').
     * Does NOT auto-login — user must verify email first for booking.
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

            const newUser = {
                id: firebaseUser.uid,
                name,
                email: email.toLowerCase(),
                role,
                emailVerified: firebaseUser.emailVerified
            };

            // still store additional profile info locally (for now)
            const users = getStoredUsers();
            localStorage.setItem(
                "courtvista_users",
                JSON.stringify([...users, { ...newUser }])
            );
            setUser(newUser);

            return { success: true, user: newUser };

        }
        catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Login with email + password.
     * Does NOT block unverified users — verification is enforced at booking time.
     */
    async function login(email, password) {

        // Admin login stays the same
        if
            (
            email.toLowerCase() === ADMIN_ACCOUNT.email &&
            password === ADMIN_ACCOUNT.password
        ) {
            const adminUser =
            {
                id: ADMIN_ACCOUNT.id,
                name: ADMIN_ACCOUNT.name,
                email: ADMIN_ACCOUNT.email,
                role: ADMIN_ACCOUNT.role,
                emailVerified: true,
            };
            setUser(adminUser);
            return { success: true, user: adminUser };
        }

        try {
            const userCredential = await signInWithEmailAndPassword(
                auth,
                email.toLowerCase(),
                password
            );

            const firebaseUser = userCredential.user;

            const users = getStoredUsers();
            const userArray = Array.isArray(users) ? users : (users ? Object.values(users) : []);
            const found = userArray.find((u) => u.id === firebaseUser.uid);

            if (!found) {
                // Let's create a minimal user locally if it exists in Firebase
                const minUser = {
                    id: firebaseUser.uid,
                    name: firebaseUser.displayName || 'Unknown User',
                    email: firebaseUser.email,
                    role: 'user', // default
                    emailVerified: firebaseUser.emailVerified
                };
                
                // Save it so it's found next time
                localStorage.setItem(
                    "courtvista_users",
                    JSON.stringify([...userArray, minUser])
                );
                
                setUser(minUser);
                return { success: true, user: minUser };
            }

            setUser(found);
            return { success: true, user: found };

        }
        catch (error) {
            console.error("Login Error:", error);
            // Return actual error message temporarily to help user debug
            return { success: false, message: error.message || "Invalid email or password." };
        }
    }

    async function loginWithGoogle() {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const firebaseUser = result.user;

            const users = getStoredUsers();
            let found = users.find((u) => u.id === firebaseUser.uid);

            if (!found) {
                const newUser = {
                    id: firebaseUser.uid,
                    name: firebaseUser.displayName || "User",
                    email: firebaseUser.email,
                    emailVerified: firebaseUser.emailVerified,
                    profilePicture: firebaseUser.photoURL || null
                };

                // TEMP: set user (no role yet)
                setUser(newUser);

                return {
                    success: true,
                    user: newUser,
                    needsRole: true   // 👈 KEY LINE
                };
            }

            setUser(found);

            return { success: true, user: found };

        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    // Logout
    async function logout() {
        await signOut(auth);
        setUser(null);
    }

    // Update user profile
    async function updateProfile(updates) {
        if (!user) return { success: false, message: 'Not logged in.' };

        const updatedUser = { ...user, ...updates };
        setUser(updatedUser);

        const users = getStoredUsers();
        const existing = users.find((u) => u.id === user.id);

        let updatedUsers;

        if (existing) {
            updatedUsers = users.map((u) =>
                u.id === user.id ? { ...u, ...updates } : u
            );
        } else {
            updatedUsers = [...users, updatedUser];
        }

        localStorage.setItem('courtvista_users', JSON.stringify(updatedUsers));

        try {
            await setDoc(doc(db, "users", user.id), {
                ...updatedUser,
                updatedAt: new Date()
            });
        } catch (err) {
            console.error("Firestore update failed:", err);
        }

        return { success: true, user: updatedUser };
    }

    /**
     * Refresh user data from localStorage (e.g., after email verification).
     */
    function refreshUser() {
        if (!user) return;
        const users = getStoredUsers();
        const found = users.find((u) => u.id === user.id);
        if (found) {
            const { password: _unused, ...safeUser } = found;
            setUser(safeUser);
        }
    }

    // Get the current lawyer's dynamic profile (for search listing)
    const getLawyerProfile = useCallback(() => {
        if (!user || user.role !== 'lawyer') return null;
        const users = getStoredUsers();
        const found = users.find((u) => u.id === user.id);
        return found ? userToLawyerProfile(found, 0) : null;
    }, [user]);

    // Get dashboard path based on role
    function getDashboardPath() {
        if (!user) return '/login';
        switch (user.role) {
            case 'admin': return '/dashboard/admin';
            case 'lawyer': return '/dashboard/lawyer';
            default: return '/dashboard/user';
        }
    }

    return (
        <AuthContext.Provider value={{ user, login, register, logout, updateProfile, refreshUser, getDashboardPath, getLawyerProfile, loginWithGoogle }}>
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

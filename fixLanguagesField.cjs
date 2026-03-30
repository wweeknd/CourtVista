/**
 * Fix the languages field in the lawyers collection — it was accidentally
 * written as a comma-separated string instead of an array by updateProfile().
 */
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function fixLanguagesField() {
    try {
        // Fix in 'lawyers' collection
        const lawyersSnap = await db.collection('lawyers').get();
        let fixed = 0;
        for (const doc of lawyersSnap.docs) {
            const data = doc.data();
            if (typeof data.languages === 'string') {
                const arr = data.languages.split(',').map(l => l.trim()).filter(Boolean);
                await doc.ref.update({ languages: arr });
                console.log(`Fixed lawyers/${doc.id}: "${data.languages}" → [${arr.join(', ')}]`);
                fixed++;
            }
        }

        // Fix in 'users' collection too
        const usersSnap = await db.collection('users').get();
        for (const doc of usersSnap.docs) {
            const data = doc.data();
            if (typeof data.languages === 'string') {
                const arr = data.languages.split(',').map(l => l.trim()).filter(Boolean);
                await doc.ref.update({ languages: arr });
                console.log(`Fixed users/${doc.id}: "${data.languages}" → [${arr.join(', ')}]`);
                fixed++;
            }
        }

        console.log(`\nDone. Fixed ${fixed} document(s).`);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

fixLanguagesField();

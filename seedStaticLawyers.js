/**
 * seedStaticLawyers.js
 * 
 * One-time script to seed the 62 static lawyer profiles from src/data/lawyers.js
 * into the Firestore 'lawyers' collection. This ensures all lawyer profiles
 * are available to all users on all devices (not just in the local JS bundle).
 * 
 * The document IDs are the string-converted numeric IDs (e.g., "1", "2", ..., "62").
 * 
 * Usage:  node seedStaticLawyers.js
 */

import admin from "firebase-admin";
import fs from "fs";

// Load service account key
const serviceAccount = JSON.parse(
    fs.readFileSync("serviceAccountKey.json", "utf-8")
);

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = admin.firestore();

// ── Import lawyer data ──────────────────────────────────────────────────────
// We can't directly import ESM from lawyers.js here because it uses `export`,
// so we'll read the file and extract the data programmatically.
// Instead, let's just dynamically import it.

async function seedLawyers() {
    // Dynamic import of the lawyers data
    const { lawyers } = await import("./src/data/lawyers.js");

    console.log(`Found ${lawyers.length} static lawyers to seed.`);

    const batch = db.batch();
    let count = 0;

    for (const lawyer of lawyers) {
        const docId = String(lawyer.id); // "1", "2", ..., "62"
        const docRef = db.collection("lawyers").doc(docId);

        // Prepare the document data — store everything except the `reviews` array
        // (reviews are large and should be stored separately if needed;
        //  for now we skip them to keep Firestore docs lean, they're generated client-side)
        const { reviews, ...lawyerData } = lawyer;

        batch.set(docRef, {
            ...lawyerData,
            id: docId,  // Store as string for consistency
            isStatic: true,  // Flag to identify seeded profiles
            seededAt: new Date(),
        }, { merge: true }); // merge: true so we don't overwrite any user-submitted data

        count++;

        // Firestore batches can hold max 500 operations
        if (count % 450 === 0) {
            await batch.commit();
            console.log(`  Committed batch of ${count} lawyers...`);
        }
    }

    // Commit remaining
    await batch.commit();
    console.log(`\n✅ Successfully seeded ${count} lawyers into Firestore 'lawyers' collection!`);
    console.log("   Document IDs: '1' through '62'");
    console.log("   These profiles will now be visible to all users on all devices.");
}

seedLawyers().catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
});

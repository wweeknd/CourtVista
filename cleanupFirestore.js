/**
 * cleanupFirestore.js
 * 
 * Cleans up the Firestore 'lawyers' collection:
 * 1. Deletes ALL old generated docs with IDs like "lawyer_001" (from lawyers.json upload)
 * 2. Deletes Vikram Sharma (doc ID "1") 
 * 3. Deletes any doc whose name matches "Ranveer Hegde" or "Vikram Sharma"
 * 
 * Usage: node cleanupFirestore.js
 */

import admin from "firebase-admin";
import fs from "fs";

const serviceAccount = JSON.parse(
    fs.readFileSync("serviceAccountKey.json", "utf-8")
);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = admin.firestore();

// Names to delete (case-insensitive match)
const NAMES_TO_DELETE = [
    'vikram sharma',
    'ranveer hegde',
];

async function cleanup() {
    const lawyersRef = db.collection("lawyers");
    const snapshot = await lawyersRef.get();

    console.log(`Found ${snapshot.size} documents in 'lawyers' collection.\n`);

    let deletedCount = 0;
    const batch = db.batch();

    for (const doc of snapshot.docs) {
        const id = doc.id;
        const data = doc.data();
        const name = (data.name || '').toLowerCase();
        let reason = null;

        // 1. Delete old generated docs (lawyer_001, lawyer_002, etc.)
        if (id.startsWith('lawyer_')) {
            reason = `Old generated doc (${id})`;
        }

        // 2. Delete by name match
        if (NAMES_TO_DELETE.includes(name)) {
            reason = `Name match: "${data.name}" (doc ${id})`;
        }

        if (reason) {
            console.log(`  ❌ Deleting: ${data.name || id} — ${reason}`);
            batch.delete(doc.ref);
            deletedCount++;
        }
    }

    if (deletedCount === 0) {
        console.log("✅ Nothing to delete — collection is already clean.");
        return;
    }

    // Commit the batch
    await batch.commit();
    console.log(`\n✅ Deleted ${deletedCount} documents from Firestore 'lawyers' collection.`);

    // Verify remaining count
    const remaining = await lawyersRef.get();
    console.log(`   Remaining documents: ${remaining.size}`);
}

cleanup().catch((err) => {
    console.error("❌ Cleanup failed:", err);
    process.exit(1);
});

import admin from "firebase-admin";
import fs from "fs";

// Load service account key
const serviceAccount = JSON.parse(
    fs.readFileSync("serviceAccountKey.json", "utf-8")
);

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Load lawyers dataset
const lawyers = JSON.parse(fs.readFileSync("lawyers.json", "utf-8"));

async function uploadData() {
    const collectionRef = db.collection("lawyers");

    for (const lawyer of lawyers) {
        await collectionRef.doc(lawyer.id).set(lawyer);
        console.log(`Uploaded: ${lawyer.name}`);
    }

    console.log("✅ All lawyers uploaded!");
}

uploadData();
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

// Use a stable, publicly hosted image of Charlie Cox as Matt Murdock
// This is an Unsplash-style professional headshot URL that won't expire
const MATT_PHOTO_URLS = [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Charlie_Cox_by_Gage_Skidmore.jpg/440px-Charlie_Cox_by_Gage_Skidmore.jpg',
];

async function fixMattPhoto() {
    // Find Matt Murdock
    const usersSnapshot = await db.collection('users').get();
    let mattId = null;
    let mattData = null;
    
    usersSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.name && data.name.toLowerCase().includes('matt murdock')) {
            mattId = doc.id;
            mattData = data;
            console.log(`Found Matt Murdock: ${doc.id} (${data.name})`);
        }
    });

    if (!mattId) {
        console.log('Matt Murdock not found in users collection!');
        process.exit(1);
    }

    const photoUrl = MATT_PHOTO_URLS[0];
    console.log(`Setting photo URL: ${photoUrl}`);

    // Update users collection
    await db.collection('users').doc(mattId).update({
        profilePicture: photoUrl,
        image: photoUrl
    });
    console.log('✅ Updated users collection');

    // Update lawyers collection
    try {
        const lawyerDoc = await db.collection('lawyers').doc(mattId).get();
        if (lawyerDoc.exists) {
            await db.collection('lawyers').doc(mattId).update({
                profilePicture: photoUrl,
                image: photoUrl
            });
            console.log('✅ Updated lawyers collection');
        } else {
            console.log('ℹ️ Matt not in lawyers collection (expected - registered as user/lawyer via app)');
        }
    } catch (err) {
        console.log('Lawyers collection update skipped:', err.message);
    }

    console.log('\n🎉 Done! Matt Murdock photo URL saved to Firestore.');
    console.log('Photo will be visible to ALL visitors now.');
    process.exit(0);
}

fixMattPhoto().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});

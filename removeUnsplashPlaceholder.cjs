/**
 * Remove the Unsplash placeholder profilePicture from Matt Murdock's
 * Firestore documents (both 'lawyers' and 'users' collections).
 * This allows the user-uploaded picture from localStorage to show instead.
 */
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

const TARGET_EMAIL = 'avocado@gmail.com';

async function removeUnsplashPlaceholder() {
  try {
    console.log(`Looking up user with email: ${TARGET_EMAIL}...`);
    const userRecord = await auth.getUserByEmail(TARGET_EMAIL);
    const uid = userRecord.uid;
    console.log(`Found UID: ${uid}`);

    // 1. Remove profilePicture from 'lawyers' collection
    const lawyerRef = db.collection('lawyers').doc(uid);
    const lawyerSnap = await lawyerRef.get();
    if (lawyerSnap.exists) {
      const data = lawyerSnap.data();
      console.log(`Current lawyers profilePicture: ${data.profilePicture ? data.profilePicture.substring(0, 80) + '...' : 'none'}`);
      
      await lawyerRef.update({
        profilePicture: admin.firestore.FieldValue.delete()
      });
      console.log('✅ Removed profilePicture from lawyers collection');
    } else {
      console.log('No document in lawyers collection');
    }

    // 2. Remove profilePicture from 'users' collection
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (userSnap.exists) {
      const data = userSnap.data();
      console.log(`Current users profilePicture: ${data.profilePicture ? data.profilePicture.substring(0, 80) + '...' : 'none'}`);
      
      await userRef.update({
        profilePicture: admin.firestore.FieldValue.delete()
      });
      console.log('✅ Removed profilePicture from users collection');
    } else {
      console.log('No document in users collection');
    }

    console.log('\nDone! Profile picture fields have been removed from Firestore.');
    console.log('The app will now show initials (or the user-uploaded photo from localStorage if available).');
    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }
}

removeUnsplashPlaceholder();

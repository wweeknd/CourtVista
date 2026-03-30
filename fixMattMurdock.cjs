const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

const TARGET_EMAIL = 'avocado@gmail.com';
const MATT_MURDOCK_DATA = {
  name: 'Matt Murdock',
  role: 'lawyer',
  specializations: ['Criminal Law', 'Civil Litigation', 'Human Rights'],
  experience: 10,
  experienceStartDate: '2014-01-01',
  jurisdiction: "Hell's Kitchen, New York / Mumbai",
  city: 'Mumbai',
  bio: 'A visually impaired but highly skilled attorney specializing in criminal defense and social justice. Matt Murdock brings a unique perspective to the courtroom, relying on his heightened senses and unwavering dedication to the truth. Co-founder of Nelson and Murdock.',
  education: 'Columbia Law School',
  consultationFee: 1500,
  languages: ['English', 'Hindi'],
  isProBono: true,
  verified: true,
  profilePicture: 'https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&q=80&w=400',
  rating: 4.9,
  reviewCount: 154,
  totalCases: 210,
  pendingCases: 12,
  phone: '+91 98765 43210',
  awards: [
    { title: 'Social Justice Excellence Award', year: 2022 },
    { title: 'Top Criminal Defense Attorney', year: 2020 }
  ],
  reviews: [
    { user: 'Franklin Nelson', rating: 5, comment: 'The best partner and attorney I know. His commitment to justice is unparalleled.', date: '2024-01-15' },
    { user: 'Karen Page', rating: 5, comment: 'He saw the truth when no one else would. Truly a guardian of the city.', date: '2023-11-20' }
  ]
};

async function fixAccount() {
  try {
    console.log(`Searching for user with email: ${TARGET_EMAIL}...`);
    const userRecord = await auth.getUserByEmail(TARGET_EMAIL);
    const uid = userRecord.uid;
    console.log(`Found UID: ${uid}`);

    // 1. Update/Create in 'users' collection
    console.log(`Updating 'users' collection for ${uid}...`);
    await db.collection('users').doc(uid).set({
      ...MATT_MURDOCK_DATA,
      email: TARGET_EMAIL,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // 2. Update/Create in 'lawyers' collection
    console.log(`Updating 'lawyers' collection for ${uid}...`);
    await db.collection('lawyers').doc(uid).set({
      ...MATT_MURDOCK_DATA,
      id: uid,
      email: TARGET_EMAIL,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log('SUCCESS: Matt Murdock account has been correctly configured in Firestore.');
    process.exit(0);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error(`ERROR: User with email ${TARGET_EMAIL} not found in Firebase Auth.`);
    } else {
      console.error('ERROR:', error);
    }
    process.exit(1);
  }
}

fixAccount();

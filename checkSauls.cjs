const admin = require('firebase-admin');
const sa = require('./serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

(async () => {
    let out = [];
    out.push('\n-- USERS --');
    const u = await db.collection('users').get();
    u.forEach(d => {
        const x = d.data();
        if (x.name && x.name.toLowerCase().includes('saul')) {
            out.push(`ID: ${d.id} | Name: ${x.name} | PicLen: ${x.profilePicture ? x.profilePicture.length : 0}`);
        }
    });

    out.push('\n-- LAWYERS --');
    const l = await db.collection('lawyers').get();
    l.forEach(d => {
        const x = d.data();
        if (x.name && x.name.toLowerCase().includes('saul')) {
            out.push(`ID: ${d.id} | Name: ${x.name} | profPicLen: ${x.profilePicture ? x.profilePicture.length : 0} | ImageLen: ${x.image ? x.image.length : 0} | photoLen: ${x.photo ? x.photo.length : 0}`);
        }
    });
    console.log(out.join('\n'));
})().then(() => process.exit(0));

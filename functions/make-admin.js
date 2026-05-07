const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // El usuario debe descargar esto de Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const email = process.argv[2];

if (!email) {
  console.log('Uso: node make-admin.js usuario@email.com');
  process.exit(1);
}

async function makeAdmin(userEmail) {
  try {
    const user = await admin.auth().getUserByEmail(userEmail);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    console.log(`Éxito: El usuario ${userEmail} ahora es ADMINISTRADOR.`);
    process.exit(0);
  } catch (error) {
    console.error('Error al asignar rol de admin:', error);
    process.exit(1);
  }
}

makeAdmin(email);

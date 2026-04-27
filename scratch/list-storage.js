
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'ecommerce-ff-ff589.firebasestorage.app'
});

const bucket = admin.storage().bucket();

async function listFiles() {
  const [files] = await bucket.getFiles({ prefix: 'product-images/' });
  console.log('Files in product-images/:');
  files.forEach(file => {
    console.log(file.name);
  });
}

listFiles().catch(console.error);

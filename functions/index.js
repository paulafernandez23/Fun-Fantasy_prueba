const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

/**
 * Cloud Function que se activa cuando se crea un nuevo documento en la colección 'mail'.
 * Utiliza nodemailer para enviar el correo a través del servidor SMTP configurado.
 */
exports.processQueue = functions
  .region("us-central1") // Usamos us-central1 para máxima compatibilidad con bases de datos nam5
  .runWith({
    secrets: ["SMTP_PASSWORD"], // La contraseña se guarda de forma segura en Firebase Secrets
  })
  .firestore.document("mail/{docId}")
  .onCreate(async (snapshot, context) => {
    const emailData = snapshot.data();
    const docId = context.params.docId;

    console.log(`Procesando envío de email para el documento: ${docId}`);

    // Configuración del servidor SMTP (esfantasia.es)
    const transporter = nodemailer.createTransport({
      host: "esfantasia.es", // Cambiado de mail.esfantasia.es para coincidir con el certificado SSL
      port: 465,
      secure: true, // true para puerto 465
      auth: {
        user: "soporte@esfantasia.es",
        pass: process.env.SMTP_PASSWORD, // Recuperado de los secretos de Firebase
      },
      tls: {
        // Asegura que la conexión no se caiga por discrepancias menores en el nombre del host
        // pero manteniendo el cifrado SSL/TLS activo.
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: '"Fun Fantasy" <soporte@esfantasia.es>',
      to: emailData.to,
      subject: emailData.message.subject,
      html: emailData.message.html,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log("Email enviado con éxito:", info.messageId);

      // Actualizamos el documento con el estado de éxito
      return snapshot.ref.update({
        delivery: {
          state: "SUCCESS",
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          messageId: info.messageId,
        },
      });
    } catch (error) {
      console.error("Error al enviar el email:", error);

      // Actualizamos el documento con el estado de error
      return snapshot.ref.update({
        delivery: {
          state: "ERROR",
          error: error.message,
          failedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      });
    }
  });

/**
 * Cloud Function para servir imágenes de Firebase Storage con URLs amigables.
 * Esto ayuda al SEO al permitir que las imágenes se carguen desde el dominio principal
 * y tengan nombres descriptivos.
 */
exports.serveImage = functions.https.onRequest(async (req, res) => {
  // Añadir CORS para que funcione desde localhost y otros dominios
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  const fileName = req.path.split('/').pop();
  
  if (!fileName) {
    return res.status(400).send("Falta el nombre del archivo");
  }

  const bucket = admin.storage().bucket();
  const extensions = ['', '.png', '.jpg', '.jpeg', '.webp'];
  let fileToServe = null;

  try {
    // 1. Intentar encontrar el archivo directamente con extensiones comunes
    for (const ext of extensions) {
      const filePath = `product-images/${fileName}${ext}`;
      const file = bucket.file(filePath);
      const [exists] = await file.exists();
      if (exists) {
        fileToServe = file;
        break;
      }
    }

    // 2. Si no se encuentra (posiblemente por el timestamp), buscar por prefijo
    if (!fileToServe) {
      console.log(`Buscando por prefijo para: ${fileName}`);
      const [files] = await bucket.getFiles({ 
        prefix: `product-images/${fileName}`,
        maxResults: 1 
      });
      
      if (files.length > 0) {
        fileToServe = files[0];
        console.log(`Imagen encontrada por prefijo: ${fileToServe.name}`);
      }
    }

    if (!fileToServe) {
      console.warn(`Imagen no encontrada para: ${fileName}`);
      return res.status(404).send("Imagen no encontrada");
    }

    const [metadata] = await fileToServe.getMetadata();
    
    res.setHeader("Content-Type", metadata.contentType || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000, s-maxage=31536000, immutable");

    fileToServe.createReadStream()
      .on('error', (err) => {
        console.error("Error en stream:", err);
        if (!res.headersSent) res.status(500).send("Error de lectura");
      })
      .pipe(res);
  } catch (error) {
    console.error("Error serveImage:", error);
    res.status(500).send("Error interno");
  }
});

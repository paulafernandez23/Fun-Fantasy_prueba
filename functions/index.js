const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

/**
 * Sanitización básica para prevenir XSS en los datos procesados por funciones.
 */
function sanitize(text) {
  if (typeof text !== "string") return text;
  return text
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
    .replace(/on\w+="[^"]*"/gim, "")
    .replace(/javascript:[^"']*/gim, "#");
}

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
      subject: sanitize(emailData.message.subject),
      html: sanitize(emailData.message.html),
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

  // Determinar si la petición es para noticias o para productos
  // Las rutas /noticias/** apuntan a la carpeta news/ de Storage
  const isNewsImage = req.path.startsWith('/noticias-img/');
  const storageFolder = isNewsImage ? 'news' : 'product-images';

  const bucket = admin.storage().bucket();
  const extensions = ['', '.png', '.jpg', '.jpeg', '.webp'];
  let fileToServe = null;

  try {
    if (isNewsImage) {
      // Las imágenes de noticias tienen timestamp: news/1234567890_nombre-original.jpg
      // El fileName que llega es el nombre limpio (sin timestamp ni extensión).
      // Buscamos directamente por prefijo ya que el nombre en Storage lleva timestamp delante.
      console.log(`[news] Buscando imagen de noticia por prefijo para: ${fileName}`);
      const [files] = await bucket.getFiles({
        prefix: `${storageFolder}/`,
        maxResults: 500
      });

      // Buscar el archivo cuyo nombre (tras el timestamp_) coincida con el slug recibido
      fileToServe = files.find(f => {
        const baseName = f.name.split('/').pop() || '';
        // Eliminar timestamp inicial (ej: "1714560000000_") y extensión para comparar
        const withoutTimestamp = baseName.replace(/^\d+_/, '');
        const slug = withoutTimestamp.replace(/\.[a-z0-9]+$/i, '');
        return slug === fileName;
      }) || null;

      if (fileToServe) {
        console.log(`[news] Imagen encontrada: ${fileToServe.name}`);
      }
    } else {
      // Productos: 1. Buscar directamente con extensiones comunes
      for (const ext of extensions) {
        const filePath = `${storageFolder}/${fileName}${ext}`;
        const file = bucket.file(filePath);
        const [exists] = await file.exists();
        if (exists) {
          fileToServe = file;
          break;
        }
      }

      // Productos: 2. Si no se encuentra (posiblemente por el timestamp), buscar por prefijo
      if (!fileToServe) {
        console.log(`[products] Buscando por prefijo para: ${fileName}`);
        const [files] = await bucket.getFiles({
          prefix: `${storageFolder}/${fileName}`,
          maxResults: 1
        });

        if (files.length > 0) {
          fileToServe = files[0];
          console.log(`[products] Imagen encontrada por prefijo: ${fileToServe.name}`);
        }
      }
    }

    if (!fileToServe) {
      console.warn(`Imagen no encontrada para: ${fileName} en carpeta: ${storageFolder}`);
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

/**
 * Cloud Function para sincronizar el rol 'admin' del documento del usuario
 * con los Custom Claims de Firebase Auth.
 * Se ejecuta al crear o actualizar un documento en la colección 'users'.
 */
exports.syncAdminClaim = functions.firestore
  .document('users/{userId}')
  .onWrite(async (change, context) => {
    const userId = context.params.userId;
    const data = change.after.data();

    // Si el documento se borró, no hacemos nada (Auth se borra por separado)
    if (!data) return null;

    const isAdmin = data.role === 'admin';

    try {
      // Obtenemos el usuario de Auth para ver sus claims actuales
      const userRecord = await admin.auth().getUser(userId);
      const currentClaims = userRecord.customClaims || {};

      // Si el claim ya coincide con la DB, no hacemos la petición (ahorra ciclos)
      if (currentClaims.admin === isAdmin) {
        return null;
      }

      // Asignamos el claim 'admin' (true o falso/undefined)
      if (isAdmin) {
        await admin.auth().setCustomUserClaims(userId, { ...currentClaims, admin: true });
        console.log(`Rol admin ASIGNADO a: ${userId}`);
      } else {
        // Para revocar el acceso, seteamos admin a false en lugar de eliminarlo completamente
        await admin.auth().setCustomUserClaims(userId, { ...currentClaims, admin: false });
        console.log(`Rol admin REVOCADO a: ${userId}`);
      }
      return null;
    } catch (error) {
      console.error(`Error sincronizando claim para ${userId}:`, error);
      return null;
    }
  });
/**
 * Cloud Function que actúa como proxy para Gemini AI.
 * Esto permite mantener la API KEY en el lado del servidor de forma segura.
 */
const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.chat = functions
  .region("us-central1")
  .runWith({
    secrets: ["GEMINI_API_KEY"],
  })
  .https.onCall(async (data, context) => {
    const { message, history, systemPrompt } = data;

    if (!message) {
      throw new functions.https.HttpsError("invalid-argument", "Falta el mensaje");
    }

    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash-latest",
        systemInstruction: systemPrompt
      });

      const chat = model.startChat({
        history: history,
      });

      const result = await chat.sendMessage(message);
      const response = await result.response;
      return { text: response.text() };
    } catch (error) {
      console.error("Error en chat proxy:", error);
      throw new functions.https.HttpsError("internal", "Error al procesar el chat: " + error.message);
    }
  });

import { db } from './firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

const STORE_NAME = 'Fun Fantasy';
const PRIMARY_COLOR = '#446279';
const BACKGROUND_COLOR = '#f8f9fa';
const TEXT_COLOR = '#2b3437';
const SUPPORT_EMAIL = 'soporte@esfantasia.es';

/**
 * Plantilla base para los correos electrónicos.
 */
const getBaseTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: ${TEXT_COLOR};
      background-color: ${BACKGROUND_COLOR};
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.05);
    }
    .header {
      background-color: ${PRIMARY_COLOR};
      padding: 30px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      letter-spacing: 1px;
    }
    .content {
      padding: 40px 30px;
    }
    .footer {
      background-color: #f1f4f6;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #586064;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: ${PRIMARY_COLOR};
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
      margin-top: 20px;
    }
    .info-box {
      background-color: #f8f9fa;
      border-left: 4px solid ${PRIMARY_COLOR};
      padding: 15px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${STORE_NAME}</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>&copy; 2026 ${STORE_NAME}. Murcia, España.</p>
      <p>Has recibido este correo porque interactuaste con nuestra tienda online.</p>
    </div>
  </div>
</body>
</html>
`;

/**
 * Añade un correo a la cola de envío de Firebase.
 */
async function queueEmail(to: string, subject: string, html: string) {
  try {
    await addDoc(collection(db, 'mail'), {
      to: [to],
      message: {
        subject: subject,
        html: html,
      },
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error al encolar el email:', error);
  }
}

/**
 * Notifica al administrador de un nuevo mensaje de contacto.
 */
export async function sendContactNotification(data: { name: string, email: string, message: string }) {
  const content = `
    <h2>Nuevo mensaje de contacto</h2>
    <p>Has recibido un nuevo mensaje desde el formulario de la web:</p>
    <div class="info-box">
      <p><strong>Nombre:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Mensaje:</strong></p>
      <p>${data.message}</p>
    </div>
    <p>Puedes responder directamente al cliente a su dirección de correo.</p>
  `;
  await queueEmail(SUPPORT_EMAIL, `Nuevo contacto: ${data.name}`, getBaseTemplate(content));
}

/**
 * Notifica al administrador de una nueva solicitud de cita desde el chatbot.
 */
export async function sendAppointmentRequestNotification(data: { name: string, contact: string, date: string, time: string, description: string }) {
  const content = `
    <h2>Nueva solicitud de cita</h2>
    <p>Un cliente ha solicitado una cita de valoración a través del chatbot:</p>
    <div class="info-box">
      <p><strong>Cliente:</strong> ${data.name}</p>
      <p><strong>Contacto:</strong> ${data.contact}</p>
      <p><strong>Fecha y Hora:</strong> ${data.date} a las ${data.time}h</p>
      <p><strong>Cartas:</strong> ${data.description}</p>
    </div>
    <p>Accede al panel de administración para confirmar o rechazar la cita.</p>
    <a href="https://esfantasia.es/admin" class="button">Ir al Panel Admin</a>
  `;
  await queueEmail(SUPPORT_EMAIL, `Nueva cita solicitada: ${data.name}`, getBaseTemplate(content));
}

/**
 * Notifica al cliente sobre el estado de su cita.
 */
export async function sendAppointmentStatusNotification(
  to: string, 
  name: string, 
  status: 'confirmed' | 'rejected',
  details: { date: string, time: string }
) {
  const isConfirmed = status === 'confirmed';
  const subject = isConfirmed ? '¡Cita Confirmada!' : 'Actualización sobre tu cita';
  
  const content = isConfirmed ? `
    <h2>¡Hola ${name}!</h2>
    <p>Nos alegra informarte que tu cita de valoración ha sido <strong>confirmada</strong>.</p>
    <div class="info-box">
      <p><strong>Fecha:</strong> ${details.date}</p>
      <p><strong>Hora:</strong> ${details.time}h</p>
      <p><strong>Lugar:</strong> Murcia / Online (según acordado)</p>
    </div>
    <p>Te esperamos para valorar tus cartas de Final Fantasy. Si necesitas cancelar o cambiar la hora, por favor avísanos con antelación.</p>
  ` : `
    <h2>Hola ${name},</h2>
    <p>Sentimos informarte que no podemos aceptar tu solicitud de cita para el día <strong>${details.date}</strong> a las <strong>${details.time}h</strong> en este momento.</p>
    <p>Es posible que ya tengamos ese hueco ocupado o que el administrador no esté disponible.</p>
    <div class="info-box">
      <p>Te invitamos a solicitar una nueva cita en un horario diferente a través de nuestro chatbot o respondiendo directamente a este correo.</p>
    </div>
    <p>¡Gracias por tu interés!</p>
  `;

  await queueEmail(to, subject, getBaseTemplate(content));
}

/**
 * Envía una Newsletter a múltiples destinatarios de forma individual.
 */
export async function sendNewsletterEmail(toAddresses: string[], subject: string, htmlContent: string) {
  const promises = toAddresses.map(async (to) => {
    // Añadir enlace de baja al final del contenido
    const unsubscribeLink = `https://esfantasia.es/unsubscribe?email=${encodeURIComponent(to)}`;
    const finalContent = `
      ${htmlContent}
      
      <div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; text-align: center; font-size: 11px; color: #888;">
        <p>Recibes este correo porque estás suscrito a nuestra Newsletter.</p>
        <p><a href="${unsubscribeLink}" style="color: #666; text-decoration: underline;">Haz clic aquí para darte de baja de forma segura</a></p>
      </div>
    `;

    return queueEmail(to, subject, getBaseTemplate(finalContent));
  });

  await Promise.allSettled(promises);
}

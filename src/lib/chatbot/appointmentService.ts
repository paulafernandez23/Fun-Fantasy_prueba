import { createDocument, queryDocuments, getDocument, updateDocument } from '../db/firestoreService';
import { Timestamp, orderBy } from 'firebase/firestore';
import { sendAppointmentRequestNotification, sendAppointmentStatusNotification } from '../emailService';

export interface Appointment {
  id?: string;
  name: string;
  contact: string;       // email o teléfono
  date: string;          // ej: "2026-04-25"
  time: string;          // ej: "17:00"
  cardDescription: string;
  status: 'pending' | 'confirmed' | 'rejected';
  createdAt?: Timestamp;
  calendarUrl?: string;
}

/**
 * Valida que los datos de la cita estén completos.
 * Devuelve null si es válido, o un mensaje de error si falta algo.
 */
export function validateAppointment(data: Partial<Appointment>): string | null {
  if (!data.name || data.name.trim().length < 2) return 'Falta el nombre del cliente.';
  if (!data.contact || data.contact.trim().length < 5) return 'Falta el email o teléfono de contacto.';
  if (!data.date) return 'Falta la fecha de la cita.';
  if (!data.time) return 'Falta la hora de la cita.';
  if (!data.cardDescription || data.cardDescription.trim().length < 3) return 'Falta la descripción de las cartas.';
  return null;
}

/**
 * Genera una URL pre-rellenada de Google Calendar para que el admin
 * pueda añadir la cita a su calendario con un solo clic.
 */
export function buildCalendarUrl(appt: Appointment): string {
  // Convertir fecha y hora al formato YYYYMMDDTHHMMSS
  const toCalDate = (date: string, time: string) => {
    const [y, m, d] = date.split('-');
    const [h, min] = time.split(':');
    return `${y}${m}${d}T${h}${min}00`;
  };

  // La cita dura 1 hora por defecto
  const addOneHour = (time: string) => {
    const [h, min] = time.split(':').map(Number);
    const endH = (h + 1).toString().padStart(2, '0');
    return `${endH}:${min.toString().padStart(2, '0')}`;
  };

  const start = toCalDate(appt.date, appt.time);
  const endTime = addOneHour(appt.time);
  const end = toCalDate(appt.date, endTime);

  const title = encodeURIComponent(`Valoración cartas — ${appt.name}`);
  const details = encodeURIComponent(
    `Cliente: ${appt.name}\nContacto: ${appt.contact}\nCartas: ${appt.cardDescription}`
  );
  const location = encodeURIComponent('Fun Fantasy');

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
}

/**
 * Guarda una cita en Firestore y devuelve el documento creado con su ID.
 */
export async function saveAppointment(data: Omit<Appointment, 'id' | 'status' | 'createdAt' | 'calendarUrl'>): Promise<Appointment> {
  const calendarUrl = buildCalendarUrl({ ...data, status: 'pending' });

  const payload: Omit<Appointment, 'id'> = {
    ...data,
    status: 'pending',
    createdAt: Timestamp.now(),
    calendarUrl,
  };

  const id = await createDocument('appointments', payload);
  
  // Notificar al administrador
  try {
    await sendAppointmentRequestNotification({
      name: data.name,
      contact: data.contact,
      date: formatDate(data.date),
      time: data.time,
      description: data.cardDescription
    });
  } catch (error) {
    console.error('Error enviando notificación de cita al admin:', error);
  }

  return { id, ...payload };
}

/**
 * Obtiene todas las citas ordenadas por fecha de creación descendente.
 */
export async function getAppointments(): Promise<Appointment[]> {
  return queryDocuments<Appointment>('appointments', [orderBy('createdAt', 'desc')]);
}

/**
 * Actualiza el estado de una cita (confirmed | rejected).
 */
export async function updateAppointmentStatus(
  id: string,
  status: 'confirmed' | 'rejected'
): Promise<void> {
  // 1. Obtener datos de la cita antes de actualizar
  const apptData = await getDocument<Appointment>('appointments', id);
  
  if (apptData) {
    // 2. Actualizar estado
    await updateDocument('appointments', id, { status });

    // 3. Notificar al cliente si tiene un email válido
    if (apptData.contact && apptData.contact.includes('@')) {
      try {
        await sendAppointmentStatusNotification(
          apptData.contact,
          apptData.name,
          status,
          { date: formatDate(apptData.date), time: apptData.time }
        );
      } catch (error) {
        console.error('Error enviando notificación de estado al cliente:', error);
      }
    }
  }
}

/**
 * Formatea una fecha "YYYY-MM-DD" como texto legible en español.
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${parseInt(d)} de ${months[parseInt(m) - 1]} de ${y}`;
}

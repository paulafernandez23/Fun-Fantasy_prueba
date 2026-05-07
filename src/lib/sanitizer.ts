/**
 * Sanitizer utility to prevent XSS attacks by cleaning strings from dangerous HTML tags and attributes.
 */

/**
 * Removes <script> tags and any HTML attributes that start with "on" (event handlers).
 * Also removes <iframe> and <object> tags for security.
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') return input;

  return input
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, '') // Remove <script> blocks
    .replace(/<iframe\b[^>]*>([\s\S]*?)<\/iframe>/gim, '') // Remove <iframe> blocks
    .replace(/<object\b[^>]*>([\s\S]*?)<\/object>/gim, '') // Remove <object> blocks
    .replace(/on\w+="[^"]*"/gim, '')                       // Remove onEvent="code" attributes
    .replace(/on\w+='[^']*'/gim, '')                       // Remove onEvent='code' attributes
    .replace(/javascript:[^"']*/gim, '#');                 // Remove javascript: links
}

/**
 * Clean an entire object recursively.
 */
export function sanitizeObject<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;

  const result: any = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (typeof value === 'string') {
        result[key] = sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = sanitizeObject(value);
      } else {
        result[key] = value;
      }
    }
  }

  return result as T;
}

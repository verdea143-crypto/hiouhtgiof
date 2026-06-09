import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

/**
 * Requests permissions for displaying notifications.
 * Works for both Capacitor native platforms and Web browsers.
 */
export async function requestNotificationPermissions() {
  if (Capacitor.isNativePlatform()) {
    try {
      const perm = await LocalNotifications.requestPermissions();
      return perm.display === 'granted';
    } catch (e) {
      console.error('Error requesting Capacitor notification permissions:', e);
      return false;
    }
  } else if ('Notification' in window) {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (e) {
      console.error('Error requesting web notification permissions:', e);
      return false;
    }
  }
  return false;
}

/**
 * Schedules a notification to remind the user to settle a pending bet.
 * The reminder is scheduled for 2 hours after the bet date/time.
 * 
 * @param {string} betId - Unique string identifier of the bet.
 * @param {string} matchName - The teams or event name (e.g. "Real Madrid vs Barcelona").
 * @param {string|number} stakeVal - The stake description/value (e.g. "2u / 20.00€").
 * @param {string} eventDateStr - Date/time string when the event starts.
 */
export async function scheduleBetReminder(betId, matchName, stakeVal, eventDateStr) {
  if (!eventDateStr) return;
  const eventDate = new Date(eventDateStr);
  if (isNaN(eventDate.getTime())) return;

  // Schedule for 2 hours after the event start time (assumes match ends)
  const triggerTime = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000);

  // If trigger time is in the past, don't schedule
  if (triggerTime.getTime() <= Date.now()) return;

  const title = 'BF: Registrar resultado';
  const body = `¿Cómo quedó el partido "${matchName}"? Abre BetFlow para registrar tu apuesta de stake ${stakeVal}.`;

  if (Capacitor.isNativePlatform()) {
    try {
      // Check and request permissions if needed
      const status = await LocalNotifications.checkPermissions();
      if (status.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions();
        if (req.display !== 'granted') {
          console.warn('[Notification] Permissions denied by native OS.');
          return;
        }
      }

      // Convert betId string to a unique 32-bit integer for Capacitor compatibility
      const numericId = Math.abs(hashCode(betId)) % 2147483647;

      // Cancel any pre-existing reminder with the same ID to prevent duplication
      try {
        await LocalNotifications.cancel({ notifications: [{ id: numericId }] });
      } catch (err) {
        // Ignore errors if it wasn't scheduled yet
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: numericId,
            schedule: { at: triggerTime },
            sound: null,
            attachments: null,
            actionTypeId: '',
            extra: null
          }
        ]
      });
      console.log(`[Notification] Scheduled native reminder for bet ${betId} at ${triggerTime}`);
    } catch (e) {
      console.error('Error scheduling local notification:', e);
    }
  } else if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      scheduleWebTimeout(title, body, triggerTime);
    } else {
      // Proactively ask for permission in web
      const granted = await requestNotificationPermissions();
      if (granted) {
        scheduleWebTimeout(title, body, triggerTime);
      }
    }
  }
}

/**
 * Schedules a standard browser timeout notification (fallback).
 */
function scheduleWebTimeout(title, body, triggerTime) {
  const delay = triggerTime.getTime() - Date.now();
  if (delay > 0 && delay < 24 * 60 * 60 * 1000) { // Limit to 24h reminders to avoid excessive timer leaks
    setTimeout(() => {
      try {
        new Notification(title, { body });
      } catch (e) {
        console.error('Failed to display fallback web notification:', e);
      }
    }, delay);
    console.log(`[Notification] Scheduled web fallback reminder in ${Math.round(delay/1000)}s`);
  }
}

/**
 * Generates a simple hash code integer from a string.
 */
function hashCode(str) {
  let hash = 0;
  if (!str) return hash;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

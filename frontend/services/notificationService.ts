import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { API } from '@/constants/api';
import { fetchWithTimeout } from '@/utils/fetchWithTimeout';
import { getAuthHeaders } from '@/utils/authHeaders';

// ── Backend notification-service integration ────────────────────────────────
// Previously this file only did on-device Expo local notifications for
// medication reminders. notification-service (GET /api/notifications/{userId},
// GET /api/notifications/{userId}/unread-count, PATCH
// /api/notifications/{notificationId}/read) has existed since Phase 1 step 7b
// but nothing in the frontend ever called it. Wired up here, same
// fetchWithTimeout + getAuthHeaders pattern as every other service file.

// API.notifications is read at call time — see constants/api.ts on why the
// URL must not be captured in a module-level const.

export type ServerNotification = {
  id: string;
  userId: string;
  type: 'ORDER_STATUS' | 'CHAT_MESSAGE' | 'COMMUNITY_ACTIVITY' | 'APPOINTMENT_REMINDER';
  title: string;
  body: string;
  relatedEntityId?: string;
  read: boolean;
  createdAt: string;
};

export async function getNotifications(userId: string): Promise<ServerNotification[]> {
  try {
    const res = await fetchWithTimeout(`${API.notifications}/${userId}`, {
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const res = await fetchWithTimeout(`${API.notifications}/${userId}/unread-count`, {
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return typeof data === 'number' ? data : 0;
  } catch {
    return 0;
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  try {
    await fetchWithTimeout(`${API.notifications}/${notificationId}/read`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    });
  } catch {
    // Best-effort — if this fails the item just stays unread until next load.
  }
}

// Show alerts even while the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Ask the user for notification permission. Call this once, e.g. on app start
 * or when the Medications screen first loads.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('medication-reminders', {
      name: 'Medication Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  return finalStatus === 'granted';
}

/**
 * Schedule a repeating daily local notification for a medication.
 * reminderTime should be in "HH:mm" 24-hour format, e.g. "08:00".
 * Returns the notification identifier — save this so you can cancel it later
 * if the medication is edited or deleted.
 */
export async function scheduleMedicationReminder(
  medicationId: string,
  name: string,
  dosage: string,
  reminderTime: string
): Promise<string | null> {
  const [hourStr, minuteStr] = reminderTime.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  if (isNaN(hour) || isNaN(minute)) {
    console.warn('[notificationService] Invalid reminderTime:', reminderTime);
    return null;
  }

  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time to take your medicine',
        body: `${name} — ${dosage}`,
        data: { medicationId },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
    return identifier;
  } catch (err) {
    console.warn('[notificationService] Failed to schedule reminder:', err);
    return null;
  }
}

/**
 * Cancel a previously scheduled reminder by its identifier.
 */
export async function cancelMedicationReminder(identifier: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (err) {
    console.warn('[notificationService] Failed to cancel reminder:', err);
  }
}

/**
 * Cancel all scheduled reminders (useful for logout/reset).
 */
export async function cancelAllMedicationReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
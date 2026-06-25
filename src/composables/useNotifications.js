import { ref } from 'vue';

// ---------------------------------------------------------------------------
// Notification types
// ---------------------------------------------------------------------------
// 'success' | 'error' | 'warning' | 'info'

let nextNotificationId = 1;

// Shared state — all consumers see the same list
const notifications = ref([]);

// Default number of milliseconds before auto-dismiss (0 = never)
const DEFAULT_DURATION = 4000;

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

function addNotification(message, type = 'info', options = {}) {
  const id = nextNotificationId++;

  const notification = {
    id,
    message,
    type,
    duration: options.duration ?? DEFAULT_DURATION,
    title: options.title ?? null,
    dismissible: options.dismissible ?? true,
  };

  notifications.value.unshift(notification);

  if (notification.duration > 0) {
    setTimeout(() => dismissNotification(id), notification.duration);
  }

  return id;
}

function dismissNotification(id) {
  const index = notifications.value.findIndex((n) => n.id === id);
  if (index !== -1) {
    notifications.value.splice(index, 1);
  }
}

function clearAllNotifications() {
  notifications.value = [];
}

// ---------------------------------------------------------------------------
// Convenience shortcuts
// ---------------------------------------------------------------------------

function notifySuccess(message, options = {}) {
  return addNotification(message, 'success', options);
}

function notifyError(message, options = {}) {
  return addNotification(message, 'error', { duration: 0, ...options });
}

function notifyWarning(message, options = {}) {
  return addNotification(message, 'warning', options);
}

function notifyInfo(message, options = {}) {
  return addNotification(message, 'info', options);
}

// ---------------------------------------------------------------------------
// Browser Push Notification helpers (skeleton — requires user permission)
// ---------------------------------------------------------------------------

async function requestPushPermission() {
  if (!('Notification' in window)) {
    console.warn('[notifications] Browser does not support push notifications.');
    return 'unsupported';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  const result = await Notification.requestPermission();
  return result; // 'granted' | 'denied' | 'default'
}

function sendPushNotification(title, body, options = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    console.warn('[notifications] Push permission not granted.');
    return null;
  }

  const pushOptions = {
    body,
    icon: options.icon ?? null,    // path to notification icon
    tag: options.tag ?? String(Date.now()), // deduplication key
    requireInteraction: options.requireInteraction ?? false,
  };

  return new Notification(title, pushOptions);
}

// ---------------------------------------------------------------------------
// Composable export
// ---------------------------------------------------------------------------

export function useNotifications() {
  return {
    // State
    notifications,

    // In-app notification actions
    addNotification,
    dismissNotification,
    clearAllNotifications,

    // Shortcuts
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo,

    // Browser push
    requestPushPermission,
    sendPushNotification,
  };
}

/**
 * In-app toasts and push delivery types.
 */

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface InAppNotification {
  id: string;
  message: string;
  /** e.g. "Shift update" — shown above the message when set */
  title?: string;
  type: NotificationType;
}

export type ShowToastFn = (message: string, type: NotificationType, title?: string) => void;

export interface NotificationContextValue {
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
}

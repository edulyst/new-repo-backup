import { apiRequest } from '@/lib/api';

export type NotificationHistoryItem = {
  _id?: string;
  id?: string;
  title: string;
  body: string;
  channel?: 'email' | 'in-app' | 'both';
  audience_type?: 'all' | 'workers' | 'employers' | 'unverified';
  status?: 'queued' | 'processing' | 'delivered' | 'partial' | 'failed' | 'scheduled';
  recipients_count?: number;
  sent_at?: string;
  created_at?: string;
  scheduled_at?: string;
  failure_reason?: string;
};

export async function listNotificationHistory(limit = 40): Promise<NotificationHistoryItem[]> {
  const data = await apiRequest<NotificationHistoryItem[] | { notifications?: NotificationHistoryItem[] }>(
    `/api/v1/student/notifications?page=1&limit=${limit}`,
    { method: 'GET' },
  );
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.notifications)) return data.notifications;
  return [];
}

export async function deleteNotificationForMe(id: string): Promise<void> {
  await apiRequest(`/api/v1/student/notifications/${id}`, { method: 'DELETE' });
}


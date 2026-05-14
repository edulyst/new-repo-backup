/**
 * Worker profile API (student portal routes).
 */
import { apiRequest } from './api';

export interface MeUser {
  id: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  goal?: string;
  profilePhotoUrl?: string;
  role: string;
}

export async function getMe(): Promise<MeUser> {
  const res = await apiRequest<{ profile: Record<string, unknown> | null }>('/api/v1/student/me', { method: 'GET' });
  const profile = (res?.profile ?? {}) as Record<string, unknown>;
  return {
    id: String(profile.user_id ?? profile.id ?? ''),
    firstName: typeof profile.full_name === 'string' ? profile.full_name.split(' ')[0] : undefined,
    lastName: typeof profile.full_name === 'string' ? profile.full_name.split(' ').slice(1).join(' ') : undefined,
    role: 'worker',
    goal: (profile.goal as 'profile' | 'browse' | undefined) ?? undefined,
    profilePhotoUrl: (profile.avatar_url as string | undefined) ?? undefined,
  };
}

export interface UpdateMeInput {
  firstName?: string;
  lastName?: string;
  goal?: 'profile' | 'browse';
  profilePhotoUrl?: string;
  experienceLevel?: 'experienced' | 'keen_to_learn';
  workCategoryIds?: string[];
  onboardingData?: Record<string, unknown>;
}

export async function updateMe(data: UpdateMeInput): Promise<{ message: string; user: MeUser }> {
  const mapped: Record<string, unknown> = {};
  if (data.firstName || data.lastName) {
    mapped.full_name = `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim();
  }
  if (data.profilePhotoUrl !== undefined) mapped.avatar_url = data.profilePhotoUrl;
  if (data.experienceLevel !== undefined) mapped.experience_level = data.experienceLevel;
  if (data.goal !== undefined) mapped.goal = data.goal;
  if (data.onboardingData !== undefined) mapped.onboarding_data = data.onboardingData;

  if (Array.isArray(data.workCategoryIds) && data.workCategoryIds.length > 0) {
    await apiRequest('/api/v1/workers/categories', {
      method: 'PUT',
      body: JSON.stringify({ category_ids: data.workCategoryIds }),
    });
  }

  const res = await apiRequest<{ profile: Record<string, unknown> }>('/api/v1/student/me/profile', {
    method: 'PATCH',
    body: JSON.stringify(mapped),
  });
  const profile = (res?.profile ?? {}) as Record<string, unknown>;
  return {
    message: 'Profile updated',
    user: {
      id: String(profile.user_id ?? profile.id ?? ''),
      role: 'worker',
      firstName: typeof profile.full_name === 'string' ? profile.full_name.split(' ')[0] : undefined,
      lastName: typeof profile.full_name === 'string' ? profile.full_name.split(' ').slice(1).join(' ') : undefined,
      goal: (profile.goal as 'profile' | 'browse' | undefined) ?? data.goal,
      profilePhotoUrl: (profile.avatar_url as string | undefined) ?? undefined,
    },
  };
}

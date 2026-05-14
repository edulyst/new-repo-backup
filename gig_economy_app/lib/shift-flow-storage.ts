import AsyncStorage from '@react-native-async-storage/async-storage';

export type PendingShiftDecision = {
  shiftId: string;
  applicationId?: string;
  title: string;
  message: string;
  venue?: string;
  timing?: string;
  employer?: string;
  createdAt: string;
};

const PENDING_DECISIONS_KEY = 'pending_shift_decisions_v1';
const TIMELINE_KEY = 'shift_timeline_events_v1';

export type ShiftTimelineEventType = 'applied' | 'accepted' | 'rejected' | 'reminder' | 'checked_in';

export type ShiftTimelineEvent = {
  id: string;
  shiftId: string;
  type: ShiftTimelineEventType;
  title: string;
  message?: string;
  at: string;
};

async function readAll(): Promise<PendingShiftDecision[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_DECISIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingShiftDecision[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(items: PendingShiftDecision[]): Promise<void> {
  await AsyncStorage.setItem(PENDING_DECISIONS_KEY, JSON.stringify(items));
}

export async function listPendingShiftDecisions(): Promise<PendingShiftDecision[]> {
  return readAll();
}

export async function upsertPendingShiftDecision(item: PendingShiftDecision): Promise<void> {
  const all = await readAll();
  const next = [item, ...all.filter((x) => x.shiftId !== item.shiftId)].slice(0, 20);
  await writeAll(next);
}

export async function removePendingShiftDecision(shiftId: string): Promise<void> {
  const all = await readAll();
  await writeAll(all.filter((x) => x.shiftId !== shiftId));
}

async function readTimeline(): Promise<ShiftTimelineEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(TIMELINE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ShiftTimelineEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeTimeline(items: ShiftTimelineEvent[]): Promise<void> {
  await AsyncStorage.setItem(TIMELINE_KEY, JSON.stringify(items));
}

export async function listShiftTimelineEvents(limit = 40): Promise<ShiftTimelineEvent[]> {
  const all = await readTimeline();
  return all.slice(0, limit);
}

export async function appendShiftTimelineEvent(input: Omit<ShiftTimelineEvent, 'id' | 'at'> & { at?: string }): Promise<void> {
  const all = await readTimeline();
  const nextEvent: ShiftTimelineEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    shiftId: input.shiftId,
    type: input.type,
    title: input.title,
    message: input.message,
    at: input.at ?? new Date().toISOString(),
  };
  const next = [nextEvent, ...all].slice(0, 120);
  await writeTimeline(next);
}

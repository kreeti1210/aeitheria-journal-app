import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  JournalInteraction,
  JournalEntry,
  VentSession,
  FutureLetter,
  TinyWin,
  CycleProfile,
  PatternInsight
} from '../types';

/**
 * Strips all `undefined` fields from an object recursively to guarantee
 * zero-crash payload hygiene with the Firestore SDK.
 */
export function sanitizePayload<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (key, value) => {
      return value === undefined ? null : value;
    })
  );
}

// ----------------- INTERACTIONS (Conversations & Deep Reflections) -----------------

export async function saveJournalInteraction(
  userId: string,
  interaction: JournalInteraction
): Promise<{ success: boolean; id: string; error?: string }> {
  if (!userId) return { success: false, id: interaction.id, error: 'User ID is required' };
  try {
    const docRef = doc(db, 'users', userId, 'interactions', interaction.id);
    const cleanData = sanitizePayload({
      ...interaction,
      userId,
      updatedAt: Date.now(),
    });
    await setDoc(docRef, cleanData, { merge: true });
    return { success: true, id: interaction.id };
  } catch (error: any) {
    console.error(`[Firestore saveJournalInteraction Error]:`, error);
    return { success: false, id: interaction.id, error: error?.message };
  }
}

export function subscribeUserInteractions(
  userId: string,
  onUpdate: (interactions: JournalInteraction[]) => void,
  onError?: (err: Error) => void
): Unsubscribe | (() => void) {
  if (!userId) return () => {};
  try {
    const colRef = collection(db, 'users', userId, 'interactions');
    const q = query(colRef, orderBy('updatedAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const items: JournalInteraction[] = [];
        snapshot.forEach((d) => items.push(d.data() as JournalInteraction));
        onUpdate(items);
      },
      (err) => {
        console.error('[Firestore onSnapshot error]:', err);
        if (onError) onError(err);
      }
    );
  } catch (error: any) {
    console.error('[Firestore subscribe error]:', error);
    return () => {};
  }
}

export async function deleteJournalInteraction(
  userId: string,
  interactionId: string
): Promise<{ success: boolean; error?: string }> {
  if (!userId || !interactionId) return { success: false, error: 'Missing parameters' };
  try {
    await deleteDoc(doc(db, 'users', userId, 'interactions', interactionId));
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message };
  }
}

// ----------------- JOURNAL ENTRIES (Classic & Transformed Entries) -----------------

export async function saveJournalEntry(
  userId: string,
  entry: JournalEntry
): Promise<{ success: boolean; id: string; error?: string }> {
  if (!userId) return { success: false, id: entry.id, error: 'User ID is required' };
  try {
    const docRef = doc(db, 'users', userId, 'journalEntries', entry.id);
    const cleanData = sanitizePayload({
      ...entry,
      userId,
      updatedAt: Date.now(),
    });
    await setDoc(docRef, cleanData, { merge: true });
    return { success: true, id: entry.id };
  } catch (error: any) {
    return { success: false, id: entry.id, error: error?.message };
  }
}

export function subscribeUserJournalEntries(
  userId: string,
  onUpdate: (entries: JournalEntry[]) => void,
  onError?: (err: Error) => void
): Unsubscribe | (() => void) {
  if (!userId) return () => {};
  try {
    const colRef = collection(db, 'users', userId, 'journalEntries');
    const q = query(colRef, orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const items: JournalEntry[] = [];
        snapshot.forEach((d) => items.push(d.data() as JournalEntry));
        onUpdate(items);
      },
      (err) => {
        if (onError) onError(err);
      }
    );
  } catch {
    return () => {};
  }
}

export const subscribeJournalEntries = subscribeUserJournalEntries;

export async function deleteJournalEntry(userId: string, entryId: string): Promise<boolean> {
  if (!userId || !entryId) return false;
  try {
    await deleteDoc(doc(db, 'users', userId, 'journalEntries', entryId));
    return true;
  } catch {
    return false;
  }
}

// ----------------- VENT SESSIONS -----------------

export async function saveVentSession(
  userId: string,
  session: VentSession
): Promise<{ success: boolean; id: string; error?: string }> {
  if (!userId) return { success: false, id: session.id, error: 'User ID is required' };
  try {
    const docRef = doc(db, 'users', userId, 'ventSessions', session.id);
    const cleanData = sanitizePayload({
      ...session,
      userId,
      updatedAt: Date.now(),
    });
    await setDoc(docRef, cleanData, { merge: true });
    return { success: true, id: session.id };
  } catch (error: any) {
    return { success: false, id: session.id, error: error?.message };
  }
}

export function subscribeUserVentSessions(
  userId: string,
  onUpdate: (sessions: VentSession[]) => void,
  onError?: (err: Error) => void
): Unsubscribe | (() => void) {
  if (!userId) return () => {};
  try {
    const colRef = collection(db, 'users', userId, 'ventSessions');
    const q = query(colRef, orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const items: VentSession[] = [];
        snapshot.forEach((d) => items.push(d.data() as VentSession));
        onUpdate(items);
      },
      (err) => {
        if (onError) onError(err);
      }
    );
  } catch {
    return () => {};
  }
}

export const subscribeVentSessions = subscribeUserVentSessions;

export async function deleteVentSession(userId: string, sessionId: string): Promise<boolean> {
  if (!userId || !sessionId) return false;
  try {
    // 1. Delete the vent session document
    await deleteDoc(doc(db, 'users', userId, 'ventSessions', sessionId));

    // 2. Cascade delete all linked reflective journal entries derived from this secret vent
    try {
      const journalCol = collection(db, 'users', userId, 'journalEntries');
      const q = query(journalCol, where('sourceVentId', '==', sessionId));
      const snap = await getDocs(q);
      const deletePromises: Promise<void>[] = [];
      snap.forEach((docSnapshot) => {
        deletePromises.push(deleteDoc(docSnapshot.ref));
      });
      await Promise.all(deletePromises);
    } catch (cascadeErr) {
      console.warn('Cascade delete related journal entries notice:', cascadeErr);
    }

    return true;
  } catch {
    return false;
  }
}

// ----------------- FUTURE LETTERS -----------------

export async function saveFutureLetter(
  userId: string,
  letter: FutureLetter
): Promise<{ success: boolean; id: string; error?: string }> {
  if (!userId) return { success: false, id: letter.id, error: 'User ID is required' };
  try {
    const docRef = doc(db, 'users', userId, 'futureLetters', letter.id);
    await setDoc(docRef, sanitizePayload({ ...letter, userId }), { merge: true });
    return { success: true, id: letter.id };
  } catch (error: any) {
    return { success: false, id: letter.id, error: error?.message };
  }
}

export function subscribeUserFutureLetters(
  userId: string,
  onUpdate: (letters: FutureLetter[]) => void,
  onError?: (err: Error) => void
): Unsubscribe | (() => void) {
  if (!userId) return () => {};
  try {
    const colRef = collection(db, 'users', userId, 'futureLetters');
    const q = query(colRef, orderBy('deliverAt', 'asc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const items: FutureLetter[] = [];
        snapshot.forEach((d) => items.push(d.data() as FutureLetter));
        onUpdate(items);
      },
      (err) => {
        if (onError) onError(err);
      }
    );
  } catch {
    return () => {};
  }
}

export const subscribeFutureLetters = subscribeUserFutureLetters;

export async function deleteFutureLetter(userId: string, letterId: string): Promise<boolean> {
  if (!userId || !letterId) return false;
  try {
    await deleteDoc(doc(db, 'users', userId, 'futureLetters', letterId));
    return true;
  } catch {
    return false;
  }
}

// ----------------- TINY WINS -----------------

export async function saveTinyWin(
  userId: string,
  win: TinyWin
): Promise<{ success: boolean; id: string; error?: string }> {
  if (!userId) return { success: false, id: win.id, error: 'User ID is required' };
  try {
    const docRef = doc(db, 'users', userId, 'tinyWins', win.id);
    await setDoc(docRef, sanitizePayload({ ...win, userId }), { merge: true });
    return { success: true, id: win.id };
  } catch (error: any) {
    return { success: false, id: win.id, error: error?.message };
  }
}

export function subscribeUserTinyWins(
  userId: string,
  onUpdate: (wins: TinyWin[]) => void,
  onError?: (err: Error) => void
): Unsubscribe | (() => void) {
  if (!userId) return () => {};
  try {
    const colRef = collection(db, 'users', userId, 'tinyWins');
    const q = query(colRef, orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const items: TinyWin[] = [];
        snapshot.forEach((d) => items.push(d.data() as TinyWin));
        onUpdate(items);
      },
      (err) => {
        if (onError) onError(err);
      }
    );
  } catch {
    return () => {};
  }
}

export const subscribeTinyWins = subscribeUserTinyWins;

export async function deleteTinyWin(userId: string, winId: string): Promise<boolean> {
  if (!userId || !winId) return false;
  try {
    await deleteDoc(doc(db, 'users', userId, 'tinyWins', winId));
    return true;
  } catch {
    return false;
  }
}

// ----------------- CYCLE PROFILE & SETTINGS -----------------

export async function fetchCycleProfile(userId: string): Promise<CycleProfile | null> {
  if (!userId) return null;
  try {
    const docRef = doc(db, 'users', userId, 'cycleProfile', 'settings');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as CycleProfile;
    }
    return null;
  } catch {
    return null;
  }
}

export function subscribeUserCycleProfile(
  userId: string,
  onUpdate: (profile: CycleProfile | null) => void,
  onError?: (err: Error) => void
): Unsubscribe | (() => void) {
  if (!userId) return () => {};
  try {
    const docRef = doc(db, 'users', userId, 'cycleProfile', 'settings');
    return onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          onUpdate(snap.data() as CycleProfile);
        } else {
          onUpdate(null);
        }
      },
      (err) => {
        if (onError) onError(err);
      }
    );
  } catch {
    return () => {};
  }
}

export async function saveCycleProfile(
  userId: string,
  profile: CycleProfile
): Promise<{ success: boolean; error?: string }> {
  if (!userId) return { success: false, error: 'User ID required' };
  try {
    const docRef = doc(db, 'users', userId, 'cycleProfile', 'settings');
    await setDoc(docRef, sanitizePayload({ ...profile, userId, updatedAt: Date.now() }), { merge: true });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message };
  }
}

export async function deleteCycleProfile(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    await deleteDoc(doc(db, 'users', userId, 'cycleProfile', 'settings'));
    return true;
  } catch {
    return false;
  }
}

// ----------------- PATTERN INSIGHTS -----------------

export async function savePatternInsight(
  userId: string,
  insight: PatternInsight
): Promise<{ success: boolean; id: string }> {
  if (!userId) return { success: false, id: insight.id };
  try {
    const docRef = doc(db, 'users', userId, 'patternInsights', insight.id);
    await setDoc(docRef, sanitizePayload({ ...insight, userId }), { merge: true });
    return { success: true, id: insight.id };
  } catch {
    return { success: false, id: insight.id };
  }
}

export function subscribePatternInsights(
  userId: string,
  onUpdate: (insights: PatternInsight[]) => void,
  onError?: (err: Error) => void
): Unsubscribe | (() => void) {
  if (!userId) return () => {};
  try {
    const colRef = collection(db, 'users', userId, 'patternInsights');
    const q = query(colRef, orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const items: PatternInsight[] = [];
        snapshot.forEach((d) => items.push(d.data() as PatternInsight));
        onUpdate(items);
      },
      (err) => {
        if (onError) onError(err);
      }
    );
  } catch {
    return () => {};
  }
}

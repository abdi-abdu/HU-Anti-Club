/**
 * stats.js
 * ────────
 * Manages homepage statistics stored in Firestore stats/current document.
 *
 * Three statistics are tracked:
 *   - activeMemberCount: Count of users with status='active'
 *   - resourceCount: Total count of resources available
 *   - eventsHeldCount: Count of published events with date < now (events that have occurred)
 *
 * The stats document is:
 *   - Publicly readable (for homepage display)
 *   - Admin-only writable (updated through authorized workflows)
 *   - Recalculable from authoritative sources (reconciliation mechanism)
 *
 * Usage:
 *   import { updateStats, recalculateStats } from '../services/stats';
 *
 *   // After member status change:
 *   await updateStats({ activeMemberCount: newCount });
 *
 *   // Admin reconciliation:
 *   await recalculateStats(currentUser);
 */

import {
  doc, getDoc, setDoc, serverTimestamp,
  collection, getDocs, query, where
} from 'firebase/firestore';
import { db } from './firebase';
import toast from 'react-hot-toast';

const STATS_DOC = doc(db, 'stats', 'current');

/**
 * Update one or more stat counts atomically.
 * Only admins should call this through authorized workflows.
 *
 * @param {Object} updates - Partial stats object { activeMemberCount?, resourceCount?, eventsHeldCount? }
 * @param {Object} options - Optional { silent: boolean } to suppress error notifications
 */
export const updateStats = async (updates, options = {}) => {
  try {
    const currentStats = await getDoc(STATS_DOC);
    const existing = currentStats.exists() ? currentStats.data() : {
      activeMemberCount: 0,
      resourceCount: 0,
      eventsHeldCount: 0,
    };

    await setDoc(STATS_DOC, {
      ...existing,
      ...updates,
      lastUpdated: serverTimestamp(),
    });
  } catch (err) {
    console.error('Failed to update homepage statistics:', err);
    console.error('Stats update attempted:', updates);

    // Notify administrator of failure (unless explicitly silenced)
    if (!options.silent) {
      toast.error(
        'Failed to update homepage statistics. Please use the reconciliation button on the admin dashboard.',
        { duration: 6000, id: 'stats-update-error' }
      );
    }

    // Don't throw - stats update failures should not break main operations
  }
};

/**
 * Recalculate all statistics from authoritative Firestore collections.
 * Admin-only operation for fixing stale counts.
 *
 * @param {Object} currentUser - Firebase Auth user (must be admin)
 * @returns {Object} - New counts { activeMemberCount, resourceCount, eventsHeldCount }
 */
export const recalculateStats = async (currentUser) => {
  if (!currentUser) throw new Error('Authentication required');

  try {
    toast.loading('Recalculating statistics...', { id: 'recalc' });

    // Count active club members (excludes admin accounts)
    const memberProfilesSnap = await getDocs(
      query(
        collection(db, 'memberProfiles'),
        where('role', '==', 'student'),
        where('status', '==', 'active')
      )
    );
    const activeMemberCount = memberProfilesSnap.size;

    // Count all resources (no status field, all resources are "published")
    const resourcesSnap = await getDocs(collection(db, 'resources'));
    const resourceCount = resourcesSnap.size;

    // Count events held (published events with date < now)
    const eventsSnap = await getDocs(
      query(collection(db, 'events'), where('status', '==', 'published'))
    );
    const now = new Date();
    const eventsHeldCount = eventsSnap.docs.filter(d => {
      const eventDate = d.data().date?.toDate?.() || new Date(0);
      return eventDate < now;
    }).length;

    // Write recalculated stats
    await setDoc(STATS_DOC, {
      activeMemberCount,
      resourceCount,
      eventsHeldCount,
      lastUpdated: serverTimestamp(),
      lastRecalculation: serverTimestamp(),
    });

    toast.success(
      `Stats recalculated: ${activeMemberCount} members, ${resourceCount} resources, ${eventsHeldCount} events`,
      { id: 'recalc', duration: 4000 }
    );

    return { activeMemberCount, resourceCount, eventsHeldCount };
  } catch (err) {
    console.error('Recalculation failed:', err);
    toast.error('Failed to recalculate statistics', { id: 'recalc' });
    throw err;
  }
};

/**
 * Get current stats for display (public operation).
 * Returns default zeros if stats document doesn't exist yet.
 */
export const getStats = async () => {
  try {
    const snap = await getDoc(STATS_DOC);
    if (snap.exists()) {
      return snap.data();
    }
    return {
      activeMemberCount: 0,
      resourceCount: 0,
      eventsHeldCount: 0,
    };
  } catch (err) {
    console.error('Failed to fetch stats:', err);
    return {
      activeMemberCount: 0,
      resourceCount: 0,
      eventsHeldCount: 0,
    };
  }
};

/**
 * activityLog.js
 * ──────────────
 * Lightweight activity logging for important admin actions.
 *
 * Each log entry contains:
 *   actorId    — UID of the authenticated user who performed the action
 *   actorName  — display name of the actor (for readability)
 *   action     — short machine-readable action key (e.g. 'member.approve')
 *   label      — human-readable description (e.g. 'Approved member Kamil Umer')
 *   recordType — type of the affected record ('user', 'event', 'post', etc.)
 *   recordId   — Firestore document ID of the affected record
 *   timestamp  — server timestamp
 *
 * Usage:
 *   import { logAction } from '../services/activityLog';
 *   await logAction(currentUser, 'member.approve', 'user', userId, `Approved member ${name}`);
 *
 * Logs are immutable — Firestore rules block update and delete.
 */

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * @param {object} actor      - Firebase Auth user object (currentUser)
 * @param {string} action     - dot-namespaced action key
 * @param {string} recordType - collection name of the affected record
 * @param {string} recordId   - document ID of the affected record
 * @param {string} label      - human-readable description of the change
 */
export const logAction = async (actor, action, recordType, recordId, label) => {
  if (!actor?.uid) return; // silently skip if not authenticated

  try {
    await addDoc(collection(db, 'activityLogs'), {
      actorId:    actor.uid,
      actorName:  actor.displayName || actor.email || actor.uid,
      action,
      recordType,
      recordId:   recordId || '',
      label:      label    || action,
      timestamp:  serverTimestamp(),
    });
  } catch (err) {
    // Logging must never break the main operation — fail silently
    console.warn('Activity log write failed:', err.message);
  }
};

// ── Action key constants — keeps action strings consistent ────────────────────
export const LOG = {
  // Member actions
  MEMBER_APPROVED:    'member.approve',
  MEMBER_REJECTED:    'member.reject',
  MEMBER_DEACTIVATED: 'member.deactivate',
  MEMBER_REACTIVATED: 'member.reactivate',
  MEMBER_EDITED:      'member.edit',
  MEMBER_MAKE_ADMIN:  'member.makeAdmin',
  MEMBER_REMOVE_ADMIN:'member.removeAdmin',

  // Leadership actions
  LEADERSHIP_ASSIGNED:'leadership.assign',
  LEADERSHIP_UPDATED: 'leadership.update',
  LEADERSHIP_ENDED:   'leadership.end',
  LEADERSHIP_VISIBILITY: 'leadership.visibility',

  // Event actions
  EVENT_CREATED:      'event.create',
  EVENT_UPDATED:      'event.update',
  EVENT_PUBLISHED:    'event.publish',
  EVENT_UNPUBLISHED:  'event.unpublish',
  EVENT_CANCELLED:    'event.cancel',
  EVENT_RESTORED:     'event.restore',
  EVENT_DELETED:      'event.delete',

  // Post actions
  POST_CREATED:       'post.create',
  POST_UPDATED:       'post.update',
  POST_DELETED:       'post.delete',

  // Announcement actions
  ANN_CREATED:        'announcement.create',
  ANN_UPDATED:        'announcement.update',
  ANN_PUBLISHED:      'announcement.publish',
  ANN_UNPUBLISHED:    'announcement.unpublish',
  ANN_DELETED:        'announcement.delete',
};

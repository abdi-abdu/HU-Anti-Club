/**
 * usePermissions — resolves the current user's effective dashboard permissions.
 *
 * Sources of truth:
 *   • userProfile.role === 'admin'  → Website Administrator (all permissions)
 *   • positionIndex/{positionId}    → club position (Supervisor / President /
 *                                     Vice President / Secretary)
 *
 * IMPORTANT: club position never grants website Admin privileges.
 * The hook reads positionIndex once on mount / when the user changes.
 * It does NOT continuously poll — callers that need fresh data after a
 * leadership change should call refresh() (returned from the hook).
 *
 * Permission matrix derived from ROLE_PERMISSIONS_SPEC.md:
 *
 *  canViewDashboard          — any of the five roles
 *  canViewMembers            — Admin, Supervisor, President, VP, Secretary
 *  canEditMembers            — Admin, President, VP (create/edit/approve/reject)
 *  canDeactivateMembers      — Admin, President only
 *  canManageAdminRole        — Admin only
 *  canViewLeadership         — all five roles
 *  canManageLeadership       — Admin (all), Supervisor (president/vp/secretary only)
 *  canViewEvents             — all five roles
 *  canManageEvents           — Admin, President, VP, Secretary
 *  canDeleteEvents           — Admin, President only
 *  canCancelEvents           — Admin, President only
 *  canViewPosts              — all five roles
 *  canManagePosts            — Admin, President, VP, Secretary (all have full publish access)
 *  canDeletePosts            — Admin, President only
 *  canViewAnnouncements      — all five roles
 *  canManageAnnouncements    — Admin, President, VP, Secretary
 *  canDeleteAnnouncements    — Admin, President only
 *  canViewMessages           — Admin, President, VP, Secretary
 *  canViewMessageStats       — Supervisor (counts only)
 *  canMarkMessageReplied     — Admin, President, VP, Secretary
 *  canViewActivityLog        — all five roles
 *  canGrantAdminRole         — Admin only
 *  position                  — 'supervisor'|'president'|'vice_president'|'secretary'|null
 *  isAdmin                   — boolean
 */

import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';

const POSITIONS = ['supervisor', 'president', 'vice_president', 'secretary'];

export const usePermissions = () => {
  const { currentUser, userProfile } = useAuth();
  const isAdmin = userProfile?.role === 'admin';

  const [position,  setPosition]  = useState(null);   // current club position or null
  const [loading,   setLoading]   = useState(true);

  const resolvePosition = useCallback(async () => {
    if (!currentUser) { setPosition(null); setLoading(false); return; }
    // Admins have full access regardless of club position — skip lookup
    if (isAdmin)      { setPosition(null); setLoading(false); return; }

    setLoading(true);
    try {
      // Read each positionIndex entry and check if it belongs to this user.
      // At most 4 reads; all documents are tiny.
      for (const posId of POSITIONS) {
        const snap = await getDoc(doc(db, 'positionIndex', posId));
        if (snap.exists() && snap.data().memberId === currentUser.uid) {
          setPosition(posId);
          setLoading(false);
          return;
        }
      }
      setPosition(null);
    } catch {
      // positionIndex may not exist yet — treat as no position
      setPosition(null);
    } finally {
      setLoading(false);
    }
  }, [currentUser, isAdmin]);

  useEffect(() => { resolvePosition(); }, [resolvePosition]);

  // ── Permission derivations ────────────────────────────────────────────────
  const isSupervisor  = position === 'supervisor';
  const isPresident   = position === 'president';
  const isVP          = position === 'vice_president';
  const isSecretary   = position === 'secretary';
  const isOfficer     = isSupervisor || isPresident || isVP || isSecretary;

  const canViewDashboard      = isAdmin || isOfficer;

  // Members
  const canViewMembers        = isAdmin || isOfficer;
  const canEditMembers        = isAdmin || isPresident || isVP;   // create / edit / approve / reject
  const canDeactivateMembers  = isAdmin || isPresident;
  const canManageAdminRole    = isAdmin;
  const canGrantAdminRole     = isAdmin;

  // Leadership
  const canViewLeadership     = isAdmin || isOfficer;
  // Admin manages all 4; Supervisor manages president/vp/secretary (enforced inside Leadership.jsx)
  const canManageLeadership   = isAdmin || isSupervisor;

  // Events
  const canViewEvents         = isAdmin || isOfficer;
  const canManageEvents       = isAdmin || isPresident || isVP || isSecretary;
  const canDeleteEvents       = isAdmin || isPresident;
  const canCancelEvents       = isAdmin || isPresident;

  // Posts
  const canViewPosts          = isAdmin || isOfficer;
  const canManagePosts        = isAdmin || isPresident || isVP || isSecretary;
  const canDeletePosts        = isAdmin || isPresident;
  // All four officer roles can create, edit, and publish blog posts independently
  const canPublishPosts       = isAdmin || isPresident || isVP || isSecretary;

  // Announcements
  const canViewAnnouncements  = isAdmin || isOfficer;
  const canManageAnnouncements= isAdmin || isPresident || isVP || isSecretary;
  const canDeleteAnnouncements= isAdmin || isPresident;

  // Help Messages
  const canViewMessages       = isAdmin || isPresident || isVP || isSecretary;
  const canViewMessageStats   = isSupervisor; // counts only, no individual messages
  const canMarkMessageReplied = isAdmin || isPresident || isVP || isSecretary;

  // Activity Log
  const canViewActivityLog    = isAdmin || isOfficer;

  return {
    // Identity
    isAdmin,
    position,
    isSupervisor,
    isPresident,
    isVP,
    isSecretary,
    isOfficer,
    loading,
    refresh: resolvePosition,

    // Dashboard access
    canViewDashboard,

    // Members
    canViewMembers,
    canEditMembers,
    canDeactivateMembers,
    canManageAdminRole,
    canGrantAdminRole,

    // Leadership
    canViewLeadership,
    canManageLeadership,

    // Events
    canViewEvents,
    canManageEvents,
    canDeleteEvents,
    canCancelEvents,

    // Posts
    canViewPosts,
    canManagePosts,
    canDeletePosts,
    canPublishPosts,

    // Announcements
    canViewAnnouncements,
    canManageAnnouncements,
    canDeleteAnnouncements,

    // Messages
    canViewMessages,
    canViewMessageStats,
    canMarkMessageReplied,

    // Activity Log
    canViewActivityLog,
  };
};

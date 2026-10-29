import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  setPersistence,
  browserSessionPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import toast from 'react-hot-toast';

// Admin sessions expire after this many ms of inactivity (30 minutes)
const ADMIN_INACTIVITY_TIMEOUT = 30 * 60 * 1000;

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser,  setCurrentUser]  = useState(null);
  const [userProfile,  setUserProfile]  = useState(null);
  const [loading,      setLoading]      = useState(true);

  // ref so the inactivity timer always sees the latest profile
  const userProfileRef = useRef(null);
  const inactivityTimer = useRef(null);

  // ── fetch profile ───────────────────────────────────────────────────────────
  const fetchUserProfile = async (uid) => {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const data = snap.data();
        setUserProfile(data);
        userProfileRef.current = data;
        return data;
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  // ── inactivity logout (admins only) ─────────────────────────────────────────
  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = null;
    }
  }, []);

  const resetInactivityTimer = useCallback(() => {
    // only applies to admin users
    if (userProfileRef.current?.role !== 'admin') return;

    clearInactivityTimer();
    inactivityTimer.current = setTimeout(async () => {
      await signOut(auth);
      setUserProfile(null);
      userProfileRef.current = null;
      toast('Session expired due to inactivity. Please log in again.', {
        icon: '⏱️',
        duration: 5000,
      });
    }, ADMIN_INACTIVITY_TIMEOUT);
  }, [clearInactivityTimer]);

  // attach / detach activity listeners for admins
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => resetInactivityTimer();

    events.forEach(ev => window.addEventListener(ev, handleActivity, { passive: true }));

    return () => {
      events.forEach(ev => window.removeEventListener(ev, handleActivity));
      clearInactivityTimer();
    };
  }, [resetInactivityTimer, clearInactivityTimer]);

  // ── sign up ─────────────────────────────────────────────────────────────────
  const signup = async (email, password, userData) => {
    try {
      // new students → persistent session (stays logged in across browser restarts)
      await setPersistence(auth, browserLocalPersistence);
      const { user } = await createUserWithEmailAndPassword(auth, email, password);

      await updateProfile(user, { displayName: userData.fullName });

      await setDoc(doc(db, 'users', user.uid), {
        ...userData,
        role: 'student',
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      toast.success('Registration successful! Awaiting admin approval.');
      return user;
    } catch (error) {
      toast.error(error.message);
      throw error;
    }
  };

  // ── sign in ─────────────────────────────────────────────────────────────────
  const signin = async (email, password) => {
    try {
      // fetch profile first to determine role before setting persistence
      // we do a temporary sign-in with local persistence, then check role
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithEmailAndPassword(auth, email, password);

      // fetch their Firestore profile to check role
      const snap = await getDoc(doc(db, 'users', result.user.uid));
      const profile = snap.exists() ? snap.data() : null;

      if (profile?.role === 'admin') {
        // admins → session-only persistence (cleared when browser closes)
        // we must sign out and sign back in with the new persistence setting
        await signOut(auth);
        await setPersistence(auth, browserSessionPersistence);
        const adminResult = await signInWithEmailAndPassword(auth, email, password);
        toast.success('Welcome back, Admin!');
        return adminResult;
      }

      toast.success('Welcome back!');
      return result;
    } catch (error) {
      toast.error('Invalid email or password');
      throw error;
    }
  };

  // ── sign out ────────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      clearInactivityTimer();
      await signOut(auth);
      setUserProfile(null);
      userProfileRef.current = null;
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Error signing out');
      throw error;
    }
  };

  // ── auth state listener ─────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const profile = await fetchUserProfile(user.uid);
        // start inactivity timer if this is an admin resuming a session
        if (profile?.role === 'admin') {
          resetInactivityTimer();
        }
      } else {
        setUserProfile(null);
        userProfileRef.current = null;
        clearInactivityTimer();
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [resetInactivityTimer, clearInactivityTimer]);

  const value = {
    currentUser,
    userProfile,
    signup,
    signin,
    logout,
    fetchUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

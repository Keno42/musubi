import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth } from '../firebase';

const EMAIL_STORAGE_KEY = 'musubi.emailForSignIn';

const AuthContext = createContext(null);

function stripLinkParams() {
  const url = new URL(window.location.href);
  url.search = '';
  window.history.replaceState({}, document.title, url.toString());
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = signed out
  // 'none' | 'processing' | 'need-email' | 'error'
  // If opened via an email link without a stored address (other device,
  // cleared storage), start at 'need-email' and ask via a proper form.
  const [linkStatus, setLinkStatus] = useState(() => {
    if (!isSignInWithEmailLink(auth, window.location.href)) return 'none';
    return window.localStorage.getItem(EMAIL_STORAGE_KEY) ? 'processing' : 'need-email';
  });
  const [linkError, setLinkError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return unsubscribe;
  }, []);

  function finishLinkSignIn(email) {
    signInWithEmailLink(auth, email, window.location.href)
      .then(() => {
        window.localStorage.removeItem(EMAIL_STORAGE_KEY);
        stripLinkParams();
        setLinkStatus('none');
      })
      .catch((err) => {
        setLinkError(err.message);
        setLinkStatus('error');
      });
  }

  useEffect(() => {
    if (linkStatus !== 'processing') return;
    finishLinkSignIn(window.localStorage.getItem(EMAIL_STORAGE_KEY));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function completeLinkSignIn(email) {
    setLinkStatus('processing');
    setLinkError(null);
    finishLinkSignIn(email);
  }

  async function sendLoginLink(email, redirectPath) {
    const url = new URL(redirectPath, window.location.origin);
    const actionCodeSettings = {
      url: url.toString(),
      handleCodeInApp: true,
    };
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    window.localStorage.setItem(EMAIL_STORAGE_KEY, email);
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  const value = {
    user,
    loading: user === undefined,
    linkStatus,
    linkError,
    completeLinkSignIn,
    sendLoginLink,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

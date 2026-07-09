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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = signed out
  const [linkError, setLinkError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isSignInWithEmailLink(auth, window.location.href)) return;

    let email = window.localStorage.getItem(EMAIL_STORAGE_KEY);
    if (!email) {
      email = window.prompt('確認のため、登録したメールアドレスを入力してください');
    }
    if (!email) return;

    signInWithEmailLink(auth, email, window.location.href)
      .then(() => {
        window.localStorage.removeItem(EMAIL_STORAGE_KEY);
        const url = new URL(window.location.href);
        url.search = '';
        window.history.replaceState({}, document.title, url.toString());
      })
      .catch((err) => setLinkError(err.message));
  }, []);

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

  const value = { user, loading: user === undefined, linkError, sendLoginLink, signOut };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

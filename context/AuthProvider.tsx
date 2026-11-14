"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import {
  AuthUser,
  ProfileUpdateInput,
  SignInInput,
  SignUpInput,
  continueAsGuest as authContinueAsGuest,
  deleteAccount as authDeleteAccount,
  getCurrentUser,
  getFirstName,
  signIn as authSignIn,
  signOut as authSignOut,
  signUp as authSignUp,
  updateProfile as authUpdateProfile,
} from "@/lib/auth";

interface AuthContextValue {
  user: AuthUser | null;
  isGuest: boolean;
  hydrated: boolean;
  signUp: (input: SignUpInput) => Promise<AuthUser>;
  signIn: (input: SignInInput) => Promise<AuthUser>;
  signOut: () => void;
  continueAsGuest: () => AuthUser;
  updateProfile: (partial: ProfileUpdateInput) => AuthUser;
  deleteAccount: () => void;
  triggerWelcomeToast: (message: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);

  const syncUser = useCallback(() => {
    setUser(getCurrentUser());
  }, []);

  useEffect(() => {
    syncUser();
    setHydrated(true);

    const handleStorageOrAuth = () => {
      syncUser();
    };

    window.addEventListener("auth-changed", handleStorageOrAuth);
    window.addEventListener("storage", handleStorageOrAuth);
    return () => {
      window.removeEventListener("auth-changed", handleStorageOrAuth);
      window.removeEventListener("storage", handleStorageOrAuth);
    };
  }, [syncUser]);

  const triggerWelcomeToast = useCallback((message: string) => {
    setWelcomeMessage(message);
  }, []);

  useEffect(() => {
    if (!welcomeMessage) return;
    const timer = window.setTimeout(() => {
      setWelcomeMessage(null);
    }, 4200);
    return () => window.clearTimeout(timer);
  }, [welcomeMessage]);

  const handleSignUp = useCallback(
    async (input: SignUpInput) => {
      const created = await authSignUp(input);
      setUser(created);
      triggerWelcomeToast(`Welcome, ${getFirstName(created.name)}!`);
      return created;
    },
    [triggerWelcomeToast]
  );

  const handleSignIn = useCallback(
    async (input: SignInInput) => {
      const signedIn = await authSignIn(input);
      setUser(signedIn);
      triggerWelcomeToast(`Welcome, ${getFirstName(signedIn.name)}!`);
      return signedIn;
    },
    [triggerWelcomeToast]
  );

  const handleSignOut = useCallback(() => {
    authSignOut();
    setUser(null);
  }, []);

  const handleContinueAsGuest = useCallback(() => {
    const guest = authContinueAsGuest();
    setUser(guest);
    triggerWelcomeToast("Welcome, Guest!");
    return guest;
  }, [triggerWelcomeToast]);

  const handleUpdateProfile = useCallback((partial: ProfileUpdateInput) => {
    const updated = authUpdateProfile(partial);
    setUser(updated);
    return updated;
  }, []);

  const handleDeleteAccount = useCallback(() => {
    authDeleteAccount();
    setUser(null);
  }, []);

  const isGuest = Boolean(user?.isGuest);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isGuest,
      hydrated,
      signUp: handleSignUp,
      signIn: handleSignIn,
      signOut: handleSignOut,
      continueAsGuest: handleContinueAsGuest,
      updateProfile: handleUpdateProfile,
      deleteAccount: handleDeleteAccount,
      triggerWelcomeToast,
    }),
    [
      user,
      isGuest,
      hydrated,
      handleSignUp,
      handleSignIn,
      handleSignOut,
      handleContinueAsGuest,
      handleUpdateProfile,
      handleDeleteAccount,
      triggerWelcomeToast,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {welcomeMessage && (
          <motion.div
            key={welcomeMessage}
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ duration: 0.22 }}
            role="status"
            aria-live="polite"
            className="fixed top-20 right-4 z-[80] flex items-center gap-3 rounded-2xl border border-[#B5EAD7]/45 bg-[#120E2E]/95 px-4 py-3 text-sm font-medium text-[#EDEBFF] shadow-[0_14px_36px_rgba(0,0,0,0.55),0_0_24px_rgba(181,234,215,0.2)] backdrop-blur-xl"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#B5EAD7]/15 text-[#B5EAD7]">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>{welcomeMessage}</span>
            <button
              type="button"
              onClick={() => setWelcomeMessage(null)}
              aria-label="Dismiss welcome notification"
              className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#CFCBEA] transition-colors hover:bg-white/10 hover:text-[#EDEBFF]"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}


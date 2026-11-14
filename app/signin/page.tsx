"use client";

import React, { Suspense, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Check,
  Circle,
  Eye,
  EyeOff,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { UserRole, isUsernameTaken } from "@/lib/auth";
import { useAuth } from "@/context/AuthProvider";
import { useSound } from "@/components/SoundProvider";
import { RolePickerCards } from "@/components/auth/RolePickerCards";

const SigninEarthScene = dynamic(
  () => import("@/components/three/SigninEarthScene"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-36 w-36 rounded-full border border-[#A2D2FF]/35 bg-[#A2D2FF]/10 animate-pulse" />
      </div>
    ),
  }
);

type AuthTab = "signin" | "signup";

interface PasswordRule {
  id: string;
  label: string;
  test: (pw: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "len",
    label: "At least 8 characters",
    test: (pw) => pw.length >= 8,
  },
  {
    id: "upper",
    label: "One uppercase letter",
    test: (pw) => /[A-Z]/.test(pw),
  },
  {
    id: "lower",
    label: "One lowercase letter",
    test: (pw) => /[a-z]/.test(pw),
  },
  {
    id: "number",
    label: "One number",
    test: (pw) => /[0-9]/.test(pw),
  },
  {
    id: "special",
    label: "One special character",
    test: (pw) => /[^A-Za-z0-9]/.test(pw),
  },
];

function SigninPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signUp, continueAsGuest } = useAuth();
  const { playSound } = useSound();

  const nextUrl = useMemo(() => {
    const raw = searchParams.get("next");
    if (raw && raw.startsWith("/") && !raw.startsWith("//")) {
      return raw;
    }
    return "/";
  }, [searchParams]);

  const initialTab: AuthTab =
    searchParams.get("tab") === "signup" ? "signup" : "signin";
  const [activeTab, setActiveTab] = useState<AuthTab>(initialTab);

  // Sign-In state
  const [signInUsername, setSignInUsername] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [isSubmittingSignIn, setIsSubmittingSignIn] = useState(false);

  // Create-Account state
  const [fullName, setFullName] = useState("");
  const [signUpUsername, setSignUpUsername] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState<UserRole>("student");

  const [nameError, setNameError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [signUpGeneralError, setSignUpGeneralError] = useState<string | null>(
    null
  );
  const [isSubmittingSignUp, setIsSubmittingSignUp] = useState(false);

  // Password rule evaluation
  const ruleResults = useMemo(
    () =>
      PASSWORD_RULES.map((rule) => ({
        ...rule,
        met: rule.test(signUpPassword),
      })),
    [signUpPassword]
  );

  const metCount = ruleResults.filter((r) => r.met).length;

  const strengthInfo = useMemo(() => {
    if (!signUpPassword) {
      return { label: "Enter a password", color: "#CFCBEA", pct: 0 };
    }
    if (metCount <= 2) {
      return { label: "Weak", color: "#FFB5A7", pct: 33 };
    }
    if (metCount <= 4) {
      return { label: "Medium", color: "#FFD166", pct: 68 };
    }
    return { label: "Strong", color: "#B5EAD7", pct: 100 };
  }, [signUpPassword, metCount]);

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError(null);

    if (!signInUsername.trim() || !signInPassword) {
      setSignInError("Wrong username or password");
      return;
    }

    setIsSubmittingSignIn(true);
    try {
      await signIn({
        username: signInUsername,
        password: signInPassword,
        rememberMe,
      });
      playSound("success");
      router.push(nextUrl);
    } catch (err) {
      setSignInError(
        err instanceof Error ? err.message : "Wrong username or password"
      );
    } finally {
      setIsSubmittingSignIn(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null);
    setUsernameError(null);
    setPasswordError(null);
    setConfirmError(null);
    setSignUpGeneralError(null);

    let hasError = false;
    const trimmedName = fullName.trim();
    const trimmedUser = signUpUsername.trim();

    if (trimmedName.length < 2 || trimmedName.length > 40) {
      setNameError("Full name must be 2–40 characters.");
      hasError = true;
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(trimmedUser)) {
      setUsernameError(
        "Use 3–20 characters: letters, numbers, or underscore only."
      );
      hasError = true;
    } else if (isUsernameTaken(trimmedUser)) {
      setUsernameError("That username is taken");
      hasError = true;
    }

    if (metCount < PASSWORD_RULES.length) {
      setPasswordError("Please meet all 5 password rules below.");
      hasError = true;
    }

    if (signUpPassword !== confirmPassword) {
      setConfirmError("Passwords do not match");
      hasError = true;
    }

    if (hasError) return;

    setIsSubmittingSignUp(true);
    try {
      await signUp({
        name: trimmedName,
        username: trimmedUser,
        password: signUpPassword,
        role,
      });
      playSound("success");
      router.push(nextUrl);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not create account";
      if (msg === "That username is taken") {
        setUsernameError("That username is taken");
      } else {
        setSignUpGeneralError(msg);
      }
    } finally {
      setIsSubmittingSignUp(false);
    }
  };

  const handleContinueAsGuest = () => {
    continueAsGuest();
    playSound("success");
    router.push(nextUrl);
  };

  return (
    <div className="mx-auto max-w-6xl py-4 sm:py-8">
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
        {/* Left / Top on mobile: 3D Rotating Earth + Tagline */}
        <div className="lg:col-span-5">
          <div className="glass relative overflow-hidden rounded-3xl border border-white/15 p-6 sm:p-8 text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#A2D2FF]/35 bg-[#A2D2FF]/12 px-3.5 py-1 text-xs font-semibold text-[#A2D2FF]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              NASA SPHEREx Sky Patrol
            </div>

            <div className="relative mx-auto my-3 h-56 w-full sm:h-72 lg:h-80">
              <SigninEarthScene />
            </div>

            <h1 className="font-display text-2xl font-bold tracking-tight text-[#EDEBFF] sm:text-3xl">
              Join the detectives
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#CFCBEA]">
              Save your training badges, track moving worlds across six-month sky
              visits, and customize your cosmic detective role.
            </p>
          </div>
        </div>

        {/* Right: Sign In / Create Account Glass Card */}
        <div className="lg:col-span-7">
          <div className="glass rounded-3xl border border-white/15 p-6 sm:p-8 shadow-[0_18px_48px_rgba(0,0,0,0.45)]">
            {/* Two Tabs */}
            <div
              role="tablist"
              aria-label="Account access mode"
              className="grid grid-cols-2 gap-2 rounded-2xl border border-white/15 bg-[#0B0B1E]/60 p-1.5"
            >
              <button
                type="button"
                role="tab"
                id="tab-signin"
                aria-selected={activeTab === "signin"}
                aria-controls="panel-signin"
                onClick={() => {
                  playSound("click");
                  setActiveTab("signin");
                }}
                className={`min-h-[44px] rounded-xl px-4 py-2.5 font-display text-sm font-semibold transition-all ${
                  activeTab === "signin"
                    ? "bg-gradient-to-r from-[#FF8A65] to-[#FFD166] text-[#0B0B1E] shadow-sm"
                    : "text-[#CFCBEA] hover:bg-white/[0.06] hover:text-[#EDEBFF]"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                role="tab"
                id="tab-signup"
                aria-selected={activeTab === "signup"}
                aria-controls="panel-signup"
                onClick={() => {
                  playSound("click");
                  setActiveTab("signup");
                }}
                className={`min-h-[44px] rounded-xl px-4 py-2.5 font-display text-sm font-semibold transition-all ${
                  activeTab === "signup"
                    ? "bg-gradient-to-r from-[#FF8A65] to-[#FFD166] text-[#0B0B1E] shadow-sm"
                    : "text-[#CFCBEA] hover:bg-white/[0.06] hover:text-[#EDEBFF]"
                }`}
              >
                Create account
              </button>
            </div>

            {activeTab === "signin" ? (
              <form
                id="panel-signin"
                role="tabpanel"
                aria-labelledby="tab-signin"
                onSubmit={handleSignInSubmit}
                noValidate
                className="mt-6 space-y-5"
              >
                {signInError && (
                  <div
                    id="signin-error-msg"
                    role="alert"
                    className="flex items-center gap-2.5 rounded-2xl border border-[#FFB5A7]/50 bg-[#FFB5A7]/15 px-4 py-3 text-xs font-medium text-[#FFB5A7]"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{signInError}</span>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="signin-username"
                    className="block text-xs font-semibold uppercase tracking-wider text-[#CFCBEA]"
                  >
                    Username
                  </label>
                  <input
                    id="signin-username"
                    type="text"
                    autoComplete="username"
                    value={signInUsername}
                    onChange={(e) => {
                      setSignInUsername(e.target.value);
                      if (signInError) setSignInError(null);
                    }}
                    aria-invalid={Boolean(signInError)}
                    aria-describedby={signInError ? "signin-error-msg" : undefined}
                    placeholder="e.g. sky_detective"
                    className="mt-1.5 w-full min-h-[44px] rounded-2xl border border-white/15 bg-[#0B0B1E]/75 px-4 py-2.5 text-sm text-[#EDEBFF] placeholder-[#CFCBEA]/45 focus:border-[#A2D2FF] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="signin-password"
                    className="block text-xs font-semibold uppercase tracking-wider text-[#CFCBEA]"
                  >
                    Password
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      id="signin-password"
                      type={showSignInPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={signInPassword}
                      onChange={(e) => {
                        setSignInPassword(e.target.value);
                        if (signInError) setSignInError(null);
                      }}
                      aria-invalid={Boolean(signInError)}
                      aria-describedby={signInError ? "signin-error-msg" : undefined}
                      placeholder="Enter your password"
                      className="w-full min-h-[44px] rounded-2xl border border-white/15 bg-[#0B0B1E]/75 pl-4 pr-12 py-2.5 text-sm text-[#EDEBFF] placeholder-[#CFCBEA]/45 focus:border-[#A2D2FF] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignInPassword((v) => !v)}
                      aria-label={
                        showSignInPassword ? "Hide password" : "Show password"
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#CFCBEA] transition-colors hover:bg-white/10 hover:text-[#EDEBFF]"
                    >
                      {showSignInPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label
                    htmlFor="signin-remember"
                    className="inline-flex cursor-pointer items-center gap-2.5 text-xs font-medium text-[#CFCBEA] select-none"
                  >
                    <input
                      id="signin-remember"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-white/25 bg-[#0B0B1E] text-[#B5EAD7] focus:ring-[#A2D2FF]"
                    />
                    Remember me
                  </label>
                </div>

                <div className="space-y-3 pt-1">
                  <button
                    type="submit"
                    disabled={isSubmittingSignIn}
                    className="w-full min-h-[48px] rounded-full bg-gradient-to-r from-[#FF8A65] to-[#FFD166] px-6 py-3 font-display text-sm font-bold text-[#0B0B1E] shadow-[0_0_24px_rgba(255,138,101,0.35)] transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                  >
                    {isSubmittingSignIn ? "Signing in..." : "Sign in"}
                  </button>

                  <button
                    type="button"
                    onClick={handleContinueAsGuest}
                    className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.07] px-6 py-3 font-display text-sm font-semibold text-[#EDEBFF] transition-colors hover:border-[#A2D2FF]/50 hover:bg-white/[0.12]"
                  >
                    <UserCheck className="h-4 w-4 text-[#A2D2FF]" aria-hidden="true" />
                    Continue as guest
                  </button>
                </div>
              </form>
            ) : (
              <form
                id="panel-signup"
                role="tabpanel"
                aria-labelledby="tab-signup"
                onSubmit={handleSignUpSubmit}
                noValidate
                className="mt-6 space-y-4"
              >
                {signUpGeneralError && (
                  <div
                    role="alert"
                    className="flex items-center gap-2.5 rounded-2xl border border-[#FFB5A7]/50 bg-[#FFB5A7]/15 px-4 py-3 text-xs font-medium text-[#FFB5A7]"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{signUpGeneralError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Full Name */}
                  <div>
                    <label
                      htmlFor="signup-name"
                      className="block text-xs font-semibold uppercase tracking-wider text-[#CFCBEA]"
                    >
                      Full name
                    </label>
                    <input
                      id="signup-name"
                      type="text"
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (nameError) setNameError(null);
                      }}
                      aria-invalid={Boolean(nameError)}
                      aria-describedby={nameError ? "signup-name-error" : undefined}
                      placeholder="2–40 characters"
                      className="mt-1.5 w-full min-h-[44px] rounded-2xl border border-white/15 bg-[#0B0B1E]/75 px-4 py-2.5 text-sm text-[#EDEBFF] placeholder-[#CFCBEA]/45 focus:border-[#A2D2FF] focus:outline-none"
                    />
                    {nameError && (
                      <p
                        id="signup-name-error"
                        role="alert"
                        className="mt-1.5 text-xs font-medium text-[#FFB5A7]"
                      >
                        {nameError}
                      </p>
                    )}
                  </div>

                  {/* Username */}
                  <div>
                    <label
                      htmlFor="signup-username"
                      className="block text-xs font-semibold uppercase tracking-wider text-[#CFCBEA]"
                    >
                      Username
                    </label>
                    <input
                      id="signup-username"
                      type="text"
                      autoComplete="username"
                      value={signUpUsername}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSignUpUsername(val);
                        if (val.trim() && isUsernameTaken(val)) {
                          setUsernameError("That username is taken");
                        } else {
                          setUsernameError(null);
                        }
                      }}
                      aria-invalid={Boolean(usernameError)}
                      aria-describedby={
                        usernameError ? "signup-username-error" : "signup-username-hint"
                      }
                      placeholder="letters, numbers, _"
                      className="mt-1.5 w-full min-h-[44px] rounded-2xl border border-white/15 bg-[#0B0B1E]/75 px-4 py-2.5 text-sm text-[#EDEBFF] placeholder-[#CFCBEA]/45 focus:border-[#A2D2FF] focus:outline-none"
                    />
                    {usernameError ? (
                      <p
                        id="signup-username-error"
                        role="alert"
                        className="mt-1.5 text-xs font-medium text-[#FFB5A7]"
                      >
                        {usernameError}
                      </p>
                    ) : (
                      <p
                        id="signup-username-hint"
                        className="mt-1 text-[11px] text-[#CFCBEA]/75"
                      >
                        3–20 letters, numbers, or underscore
                      </p>
                    )}
                  </div>
                </div>

                {/* Password + Confirm Password */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="signup-password"
                      className="block text-xs font-semibold uppercase tracking-wider text-[#CFCBEA]"
                    >
                      Password
                    </label>
                    <div className="relative mt-1.5">
                      <input
                        id="signup-password"
                        type={showSignUpPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={signUpPassword}
                        onChange={(e) => {
                          setSignUpPassword(e.target.value);
                          if (passwordError) setPasswordError(null);
                        }}
                        aria-invalid={Boolean(passwordError)}
                        aria-describedby={
                          passwordError
                            ? "signup-password-error"
                            : "password-rules-checklist"
                        }
                        placeholder="Create a strong password"
                        className="w-full min-h-[44px] rounded-2xl border border-white/15 bg-[#0B0B1E]/75 pl-4 pr-12 py-2.5 text-sm text-[#EDEBFF] placeholder-[#CFCBEA]/45 focus:border-[#A2D2FF] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignUpPassword((v) => !v)}
                        aria-label={
                          showSignUpPassword ? "Hide password" : "Show password"
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#CFCBEA] transition-colors hover:bg-white/10 hover:text-[#EDEBFF]"
                      >
                        {showSignUpPassword ? (
                          <EyeOff className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                    {passwordError && (
                      <p
                        id="signup-password-error"
                        role="alert"
                        className="mt-1.5 text-xs font-medium text-[#FFB5A7]"
                      >
                        {passwordError}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="signup-confirm-password"
                      className="block text-xs font-semibold uppercase tracking-wider text-[#CFCBEA]"
                    >
                      Confirm password
                    </label>
                    <div className="relative mt-1.5">
                      <input
                        id="signup-confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (confirmError) setConfirmError(null);
                        }}
                        aria-invalid={Boolean(confirmError)}
                        aria-describedby={
                          confirmError ? "signup-confirm-error" : undefined
                        }
                        placeholder="Repeat your password"
                        className="w-full min-h-[44px] rounded-2xl border border-white/15 bg-[#0B0B1E]/75 pl-4 pr-12 py-2.5 text-sm text-[#EDEBFF] placeholder-[#CFCBEA]/45 focus:border-[#A2D2FF] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        aria-label={
                          showConfirmPassword
                            ? "Hide confirm password"
                            : "Show confirm password"
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#CFCBEA] transition-colors hover:bg-white/10 hover:text-[#EDEBFF]"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                    {confirmError && (
                      <p
                        id="signup-confirm-error"
                        role="alert"
                        className="mt-1.5 text-xs font-medium text-[#FFB5A7]"
                      >
                        {confirmError}
                      </p>
                    )}
                  </div>
                </div>

                {/* Live Password Strength Meter + Checklist */}
                <div
                  id="password-rules-checklist"
                  className="rounded-2xl border border-white/12 bg-[#0B0B1E]/55 p-3.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#CFCBEA]">
                      Password strength
                    </span>
                    <span
                      className="font-semibold"
                      style={{ color: strengthInfo.color }}
                    >
                      {strengthInfo.label}
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${strengthInfo.pct}%`,
                        backgroundColor: strengthInfo.color,
                      }}
                    />
                  </div>

                  <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {ruleResults.map((rule) => (
                      <li
                        key={rule.id}
                        className="flex items-center gap-2 text-xs"
                        style={{
                          color: rule.met ? "#B5EAD7" : "#CFCBEA",
                        }}
                      >
                        {rule.met ? (
                          <Check
                            className="h-3.5 w-3.5 shrink-0 text-[#B5EAD7]"
                            aria-hidden="true"
                          />
                        ) : (
                          <Circle
                            className="h-3.5 w-3.5 shrink-0 text-white/30"
                            aria-hidden="true"
                          />
                        )}
                        <span>{rule.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Role Picker (3 large selectable glass cards) */}
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-[#CFCBEA] mb-2">
                    Pick your role
                  </span>
                  <RolePickerCards
                    value={role}
                    onChange={setRole}
                    idPrefix="signup-role"
                  />
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingSignUp}
                    className="w-full min-h-[48px] rounded-full bg-gradient-to-r from-[#FF8A65] to-[#FFD166] px-6 py-3 font-display text-sm font-bold text-[#0B0B1E] shadow-[0_0_24px_rgba(255,138,101,0.35)] transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                  >
                    {isSubmittingSignUp ? "Creating account..." : "Create account"}
                  </button>

                  <button
                    type="button"
                    onClick={handleContinueAsGuest}
                    className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.07] px-6 py-3 font-display text-sm font-semibold text-[#EDEBFF] transition-colors hover:border-[#A2D2FF]/50 hover:bg-white/[0.12]"
                  >
                    <UserCheck className="h-4 w-4 text-[#A2D2FF]" aria-hidden="true" />
                    Continue as guest
                  </button>
                </div>
              </form>
            )}

            <p className="mt-5 text-center text-xs text-[#CFCBEA]/85">
              Demo accounts are saved only in this browser.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SigninPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl py-8">
          <div className="glass h-[520px] rounded-3xl animate-pulse" />
        </div>
      }
    >
      <SigninPageInner />
    </Suspense>
  );
}

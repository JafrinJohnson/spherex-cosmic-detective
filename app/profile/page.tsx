"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Award,
  Bookmark,
  Calendar,
  Check,
  LogOut,
  Sparkles,
  Trash2,
  Trophy,
  UserPlus,
} from "lucide-react";
import {
  PASTEL_AVATAR_COLORS,
  UserRole,
  getInitials,
  readTrainingProgressForUser,
} from "@/lib/auth";
import { useAuth } from "@/context/AuthProvider";
import { getCandidates } from "@/lib/candidates";
import { useSound } from "@/components/SoundProvider";
import { RolePickerCards } from "@/components/auth/RolePickerCards";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isGuest, hydrated, updateProfile, signOut, deleteAccount } =
    useAuth();
  const { playSound } = useSound();

  const [nameInput, setNameInput] = useState("");
  const [roleInput, setRoleInput] = useState<UserRole>("explorer");
  const [colorInput, setColorInput] = useState<string>("#C3B1E1");
  const [nameError, setNameError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [totalScore, setTotalScore] = useState(0);
  const [badgesEarned, setBadgesEarned] = useState(0);
  const [candidatesCount, setCandidatesCount] = useState(0);

  useEffect(() => {
    if (user && !user.isGuest) {
      setNameInput(user.name);
      setRoleInput(user.role);
      setColorInput(user.avatarColor || "#C3B1E1");
    }
  }, [user]);

  useEffect(() => {
    if (!hydrated) return;
    const summary = readTrainingProgressForUser(user);
    setTotalScore(summary.score);
    setBadgesEarned(summary.unlockedBadges.length);
    setCandidatesCount(getCandidates().length);
  }, [hydrated, user]);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <div className="glass h-96 rounded-3xl animate-pulse" />
      </div>
    );
  }

  // Guests or unauthenticated visitors see a friendly "Create an account to save progress" card
  if (!user || isGuest) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <div className="glass rounded-3xl border border-white/15 p-8 text-center space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#A2D2FF]/40 bg-[#A2D2FF]/15 text-[#A2D2FF]">
            <UserPlus className="h-7 w-7" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold text-[#EDEBFF] sm:text-3xl">
              Create an account to save progress
            </h1>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-[#CFCBEA]">
              You are currently exploring as a guest. Create a demo detective
              account in this browser to keep your personal training score,
              unlocked badges, and role preferences.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/signin?tab=signup&next=/profile"
              onClick={() => playSound("click")}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-gradient-to-r from-[#FF8A65] to-[#FFD166] px-6 py-3 font-display text-sm font-bold text-[#0B0B1E] shadow-[0_0_24px_rgba(255,138,101,0.35)] transition-transform hover:scale-[1.02]"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Create account
            </Link>
            <Link
              href="/signin?next=/profile"
              onClick={() => playSound("click")}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-full border border-white/20 bg-white/[0.07] px-6 py-3 font-display text-sm font-semibold text-[#EDEBFF] transition-colors hover:bg-white/[0.14]"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const joinedFormatted = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Today";

  const handleSaveChanges = (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null);
    const trimmed = nameInput.trim();
    if (trimmed.length < 2 || trimmed.length > 40) {
      setNameError("Full name must be between 2 and 40 characters.");
      return;
    }

    try {
      updateProfile({
        name: trimmed,
        role: roleInput,
        avatarColor: colorInput,
      });
      playSound("success");
      setSavedNotice(true);
      window.setTimeout(() => setSavedNotice(false), 2600);
    } catch (err) {
      setNameError(
        err instanceof Error ? err.message : "Could not update profile."
      );
    }
  };

  const handleSignOut = () => {
    playSound("click");
    signOut();
    router.push("/");
  };

  const handleConfirmDelete = () => {
    playSound("click");
    deleteAccount();
    setShowDeleteConfirm(false);
    router.push("/");
  };

  return (
    <div className="mx-auto max-w-3xl py-6 space-y-6">
      <div className="glass rounded-3xl border border-white/15 p-6 sm:p-8 space-y-7">
        {/* Header with circular pastel avatar + @username + joined date */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full font-display text-xl font-bold text-[#0B0B1E] shadow-[0_0_24px_rgba(255,255,255,0.18)]"
              style={{ backgroundColor: colorInput }}
            >
              {getInitials(nameInput || user.name)}
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-[#EDEBFF]">
                {user.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2.5 text-xs text-[#CFCBEA]">
                <span className="font-mono text-[#A2D2FF]">
                  @{user.username}
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-[#C3B1E1]" aria-hidden="true" />
                  Joined {joinedFormatted}
                </span>
              </div>
            </div>
          </div>

          {/* Pastel avatar color switcher */}
          <div className="flex items-center gap-1.5">
            {PASTEL_AVATAR_COLORS.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => {
                  playSound("click");
                  setColorInput(hex);
                }}
                aria-label={`Select avatar colour ${hex}`}
                className={`h-7 w-7 rounded-full border transition-transform ${
                  colorInput === hex
                    ? "scale-110 border-white ring-2 ring-white/40"
                    : "border-white/20 opacity-75 hover:opacity-100"
                }`}
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        </div>

        {/* Stats summary row: Total score, Badges earned, Candidates count */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/12 bg-[#0B0B1E]/55 p-4 flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFD166]/15 text-[#FFD166]">
              <Trophy className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs text-[#CFCBEA]">Total score</p>
              <p className="font-display text-xl font-bold text-[#EDEBFF]">
                {totalScore.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/12 bg-[#0B0B1E]/55 p-4 flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#B5EAD7]/15 text-[#B5EAD7]">
              <Award className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs text-[#CFCBEA]">Badges earned</p>
              <p className="font-display text-xl font-bold text-[#EDEBFF]">
                {badgesEarned} / 7
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/12 bg-[#0B0B1E]/55 p-4 flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#C3B1E1]/15 text-[#C3B1E1]">
              <Bookmark className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs text-[#CFCBEA]">Candidates saved</p>
              <p className="font-display text-xl font-bold text-[#EDEBFF]">
                {candidatesCount}
              </p>
            </div>
          </div>
        </div>

        {/* Editable Profile Form */}
        <form onSubmit={handleSaveChanges} className="space-y-5" noValidate>
          <div>
            <label
              htmlFor="profile-name"
              className="block text-xs font-medium text-[#CFCBEA]"
            >
              Display name
            </label>
            <input
              id="profile-name"
              type="text"
              value={nameInput}
              onChange={(e) => {
                setNameInput(e.target.value);
                if (nameError) setNameError(null);
              }}
              aria-invalid={Boolean(nameError)}
              aria-describedby={nameError ? "profile-name-error" : undefined}
              className="mt-1.5 w-full min-h-[44px] rounded-2xl border border-white/15 bg-[#0B0B1E]/75 px-4 py-2.5 text-sm text-[#EDEBFF] focus:border-[#A2D2FF] focus:outline-none"
            />
            {nameError && (
              <p
                id="profile-name-error"
                role="alert"
                className="mt-1.5 text-xs font-medium text-[#FFB5A7]"
              >
                {nameError}
              </p>
            )}
          </div>

          <div>
            <span className="block text-xs font-medium text-[#CFCBEA] mb-2">
              Your role
            </span>
            <RolePickerCards
              value={roleInput}
              onChange={setRoleInput}
              idPrefix="profile-role"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-gradient-to-r from-[#FF8A65] to-[#FFD166] px-6 py-2.5 font-display text-sm font-bold text-[#0B0B1E] shadow-[0_0_20px_rgba(255,138,101,0.3)] transition-transform hover:scale-[1.02]"
              >
                {savedNotice ? (
                  <>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Changes saved
                  </>
                ) : (
                  "Save changes"
                )}
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/20 bg-white/[0.07] px-5 py-2.5 font-display text-sm font-semibold text-[#EDEBFF] transition-colors hover:bg-white/[0.14]"
              >
                <LogOut className="h-4 w-4 text-[#CFCBEA]" aria-hidden="true" />
                Sign out
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                playSound("click");
                setShowDeleteConfirm(true);
              }}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#FFB5A7]/35 bg-[#FFB5A7]/10 px-4 py-2.5 text-xs font-semibold text-[#FFB5A7] transition-colors hover:bg-[#FFB5A7]/20"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete account
            </button>
          </div>
        </form>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
        >
          <div className="glass max-w-md w-full rounded-3xl border border-[#FFB5A7]/40 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-[#FFB5A7]">
              <AlertTriangle className="h-6 w-6 shrink-0" aria-hidden="true" />
              <h2
                id="delete-account-title"
                className="font-display text-lg font-bold text-[#EDEBFF]"
              >
                Delete your demo account?
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-[#CFCBEA]">
              This will permanently remove{" "}
              <span className="font-semibold text-[#EDEBFF]">
                @{user.username}
              </span>{" "}
              and its saved training score and badges from this browser.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="min-h-[44px] rounded-full border border-white/20 bg-white/[0.08] px-5 py-2 text-xs font-semibold text-[#EDEBFF] hover:bg-white/[0.15]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="min-h-[44px] rounded-full bg-[#FFB5A7] px-5 py-2 text-xs font-bold text-[#0B0B1E] hover:brightness-105"
              >
                Yes, delete account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

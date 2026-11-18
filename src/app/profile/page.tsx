"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TopHeader } from "@/components/navigation/TopHeader";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useCurrentUser } from "@/context/UserContext";
import {
  Camera,
  Check,
  Upload,
  User as UserIcon,
  Mail,
  AtSign,
  Lock,
  Key,
  LogOut,
  Loader2,
  AlertCircle,
  Sun,
  Moon,
} from "lucide-react";

export default function ProfileAccountPage() {
  const router = useRouter();
  const { user, setUser, updateProfileImage, logout, isAuthenticated, isLoading: authLoading } = useCurrentUser();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [previewImage, setPreviewImage] = useState<string>(
    user.image || `https://avatar.vercel.sh/${user.username}.svg`
  );
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(user.name);
    setUsername(user.username);
    setPreviewImage(user.image || `https://avatar.vercel.sh/${user.username}.svg`);
  }, [user]);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isPasswordSaved, setIsPasswordSaved] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Theme preference state — default Dark, system theme removed
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("evenly_theme");
      setTheme(stored === "light" ? "light" : "dark");
    }
  }, []);

  const handleThemeChange = (newTheme: "dark" | "light") => {
    setTheme(newTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("evenly_theme", newTheme);
      const isDark = newTheme === "dark";
      if (isDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      const meta = document.getElementById("theme-color-meta");
      if (meta) {
        meta.setAttribute("content", isDark ? "#0D1210" : "#F8FAF8");
      }
    }
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle local photo upload from phone / device
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, WEBP)");
      return;
    }

    // 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size should be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      if (result) {
        setPreviewImage(result);
        try {
          const res = await fetch("/api/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: result }),
          });
          const data = await res.json();
          if (res.ok && data.user) {
            setUser(data.user);
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 3000);
          }
        } catch {
          updateProfileImage(result);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, "");

    if (!cleanName) {
      setError("Name cannot be empty");
      return;
    }

    if (!cleanUsername || cleanUsername.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    setIsSaving(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          username: cleanUsername,
          image: previewImage,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update profile");
        setIsSaving(false);
        return;
      }

      if (data.user) {
        setUser(data.user);
      }

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch {
      setError("Network error updating profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError("Please enter your current password");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError("New password must be different from current password");
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || "Failed to update password");
        setIsChangingPassword(false);
        return;
      }
      setIsPasswordSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setTimeout(() => setIsPasswordSaved(false), 3000);
    } catch {
      setPasswordError("Network error. Please try again.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (authLoading && !isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#065F46]" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col pb-24">
      <TopHeader
        title="Account"
        subtitle="Manage Profile & Account"
        showBack
        backHref="/"
      />

      <div className="p-4 space-y-5">
        {/* Profile Picture Upload Section */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs text-center space-y-4">
          <div className="relative inline-block mx-auto">
            <div className="w-24 h-24 rounded-full overflow-hidden border-3 border-emerald-600/30 shadow-md bg-slate-100 mx-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImage}
                alt={name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Tap to change camera badge */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#065F46] hover:bg-[#047857] text-white flex items-center justify-center shadow-lg border-2 border-white transition active:scale-95"
              aria-label="Upload profile picture"
              title="Upload photo"
            >
              <Camera className="w-4 h-4" />
            </button>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
          </div>

          <div>
            <h2 className="text-base font-bold text-slate-900">{user.name}</h2>
            <p className="text-xs text-slate-500 font-medium">@{user.username}</p>
          </div>

          <div className="pt-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full text-xs flex items-center justify-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              Upload from Device / Gallery
            </Button>
          </div>
        </div>

        {/* Profile Information Form */}
        <form
          onSubmit={handleSaveProfile}
          className="bg-white dark:bg-[#141B18] p-5 rounded-3xl border border-slate-200/80 dark:border-[#22302A] shadow-xs space-y-4"
        >
          <div className="border-b border-slate-100 dark:border-[#22302A] pb-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">
              Personal Information
            </h3>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200/80 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isSaved && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Profile updated successfully!</span>
            </div>
          )}

          <Input
            label="Full Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            placeholder=""
            leftAddon={<UserIcon className="w-4 h-4" />}
          />

          <Input
            label="Username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""));
              if (error) setError(null);
            }}
            placeholder=""
            leftAddon={<AtSign className="w-4 h-4" />}
          />

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 block">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="text"
                disabled
                value={user.email}
                className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 cursor-not-allowed select-none"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={isSaving}
              className="w-full text-xs flex items-center justify-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <span>Save Profile Changes</span>
              )}
            </Button>
          </div>
        </form>

        {/* Change Password Section */}
        <form
          onSubmit={handleChangePassword}
          className="bg-white dark:bg-[#141B18] p-5 rounded-3xl border border-slate-200/80 dark:border-[#22302A] shadow-xs space-y-4"
        >
          <div className="border-b border-slate-100 dark:border-[#22302A] pb-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">
              Security & Password
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Change your password
            </p>
          </div>

          <Input
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              if (passwordError) setPasswordError(null);
            }}
            leftAddon={<Lock className="w-4 h-4" />}
          />

          <Input
            label="New Password (min 8 characters)"
            type="password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              if (passwordError) setPasswordError(null);
            }}
            leftAddon={<Key className="w-4 h-4" />}
          />

          <Input
            label="Confirm New Password"
            type="password"
            value={confirmNewPassword}
            onChange={(e) => {
              setConfirmNewPassword(e.target.value);
              if (passwordError) setPasswordError(null);
            }}
            leftAddon={<Key className="w-4 h-4" />}
          />

          {passwordError && (
            <p className="text-xs text-red-600 font-medium">{passwordError}</p>
          )}

          {isPasswordSaved && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-medium flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Password updated successfully!</span>
            </div>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              variant="outline"
              disabled={isChangingPassword}
              className="w-full text-xs flex items-center justify-center gap-1.5"
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <span>Change Password</span>
              )}
            </Button>
          </div>
        </form>

        {/* Appearance & Dark Mode Feature — Right after Security & Password */}
        <div className="bg-white dark:bg-[#141B18] p-5 rounded-3xl border border-slate-200/80 dark:border-[#22302A] shadow-xs space-y-3.5">
          <div className="border-b border-slate-100 dark:border-[#22302A] pb-2.5">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">
              Appearance & Theme
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Customize app theme (Dark by default)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => handleThemeChange("dark")}
              className={`p-3.5 rounded-2xl border text-center transition flex flex-col items-center gap-2 active:scale-95 ${
                theme === "dark"
                  ? "border-[#10B981] bg-emerald-950/40 text-emerald-300 font-bold shadow-xs ring-1 ring-emerald-500/50"
                  : "border-slate-200 dark:border-[#22302A] bg-slate-50 dark:bg-[#1A2420] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#22302A]"
              }`}
            >
              <Moon className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-bold">Dark</span>
            </button>

            <button
              type="button"
              onClick={() => handleThemeChange("light")}
              className={`p-3.5 rounded-2xl border text-center transition flex flex-col items-center gap-2 active:scale-95 ${
                theme === "light"
                  ? "border-[#065F46] bg-emerald-50 text-[#065F46] font-bold shadow-xs ring-1 ring-emerald-600/40"
                  : "border-slate-200 dark:border-[#22302A] bg-slate-50 dark:bg-[#1A2420] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#22302A]"
              }`}
            >
              <Sun className="w-5 h-5 text-amber-500" />
              <span className="text-xs font-bold">Light</span>
            </button>
          </div>
        </div>

        {/* Log Out Action */}
        <div className="pt-2">
          <button
            type="button"
            onClick={logout}
            className="w-full py-3 px-4 bg-white dark:bg-[#141B18] hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200/80 dark:border-red-900/50 rounded-2xl font-semibold text-xs transition flex items-center justify-center gap-2 active:scale-98 shadow-xs"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}

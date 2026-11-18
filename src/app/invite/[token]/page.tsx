"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/context/UserContext";
import { APP_CONFIG } from "@/config/app";
import {
  UserCheck,
  AlertCircle,
  Loader2,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useCurrentUser();

  interface InviteData {
    inviter: {
      id: string;
      name: string;
      username: string;
      image?: string | null;
    };
    group?: {
      id: string;
      name: string;
      description?: string | null;
    } | null;
  }

  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInvite() {
      try {
        const res = await fetch(`/api/invitations/${token}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Invalid or expired invitation");
          setLoading(false);
          return;
        }
        setInviteData(data);
      } catch {
        setError("Failed to load invitation. Please check your network.");
      } finally {
        setLoading(false);
      }
    }
    fetchInvite();
  }, [token]);

  const handleAccept = async () => {
    setAccepting(true);
    setError(null);

    try {
      const res = await fetch(`/api/invitations/${token}`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to accept invitation");
        setAccepting(false);
        return;
      }

      setSuccessMessage(data.message || "Invitation accepted!");
      setTimeout(() => {
        if (data.groupId) {
          router.push(`/groups/${data.groupId}`);
        } else {
          router.push("/friends");
        }
      }, 1500);
    } catch {
      setError("Failed to accept invitation. Please try again.");
      setAccepting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#065F46]" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-center px-4 py-8 min-h-screen bg-[#F8FAF8]">
      <div className="w-full max-w-sm mx-auto space-y-6">
        {/* Brand */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-serif font-bold text-slate-900 tracking-tight">
            {APP_CONFIG.name}
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Expense sharing with friends
          </p>
        </div>

        {/* Invite Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5 text-center">
          {error ? (
            <div className="space-y-4 py-4">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Invitation Unavailable
                </h2>
                <p className="text-xs text-slate-500 mt-1">{error}</p>
              </div>
              <Link
                href="/"
                className="inline-block px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold"
              >
                Go to Dashboard
              </Link>
            </div>
          ) : (
            <>
              {/* Inviter Avatar */}
              <div className="relative inline-block mx-auto">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-emerald-600/30 shadow-sm mx-auto bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      inviteData?.inviter.image ||
                      `https://avatar.vercel.sh/${inviteData?.inviter.username}.svg`
                    }
                    alt={inviteData?.inviter.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#065F46] text-white flex items-center justify-center shadow border-2 border-white">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {inviteData?.inviter.name}
                </h2>
                <p className="text-xs text-slate-500">
                  @{inviteData?.inviter.username}
                </p>
                <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200/60 rounded-xl py-2 px-3 mt-3 font-medium">
                  {inviteData?.group
                    ? `Invited you to join group "${inviteData.group.name}"`
                    : `Invited you to connect and share expenses!`}
                </p>
              </div>

              {successMessage ? (
                <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>{successMessage}</span>
                </div>
              ) : isAuthenticated ? (
                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={accepting}
                  className="w-full py-3 px-4 bg-[#065F46] hover:bg-[#047857] active:bg-[#064E3B] text-white rounded-xl font-semibold text-sm shadow-md shadow-emerald-950/20 transition flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                >
                  {accepting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>Accept Invitation</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="space-y-2 pt-2">
                  <Link
                    href={`/register?invite=${token}`}
                    className="w-full py-3 px-4 bg-[#065F46] hover:bg-[#047857] active:bg-[#064E3B] text-white rounded-xl font-semibold text-sm shadow-md shadow-emerald-950/20 transition flex items-center justify-center gap-2 block active:scale-98 text-center"
                  >
                    <span>Create Free Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href={`/login?invite=${token}`}
                    className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-semibold text-xs transition block text-center"
                  >
                    Already have an account? Log In
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Share2, Copy, Check, MessageSquare, Loader2 } from "lucide-react";
import { APP_CONFIG } from "@/config/app";

export interface InviteFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId?: string;
}

export function InviteFriendModal({ isOpen, onClose, groupId }: InviteFriendModalProps) {
  const [copied, setCopied] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    async function generateInviteLink() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/invitations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId }),
        });
        const data = await res.json();
        if (data.inviteUrl) {
          setInviteUrl(data.inviteUrl);
        }
      } catch (err) {
        console.error("Failed to generate invite:", err);
      } finally {
        setIsLoading(false);
      }
    }

    generateInviteLink();
  }, [isOpen, groupId]);

  const shareText = `Hey! Join me on ${APP_CONFIG.name} to easily split expenses and track balances in Indian Rupees: ${inviteUrl}`;

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleNativeShare = async () => {
    if (!inviteUrl) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Join me on ${APP_CONFIG.name}`,
          text: `Split expenses easily and fairly on ${APP_CONFIG.name}:`,
          url: inviteUrl,
        });
      } catch (err) {
        console.log("Share dismissed", err);
      }
    } else {
      handleCopy();
    }
  };

  const handleWhatsAppShare = () => {
    if (!inviteUrl) return;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invite Friends"
      description="Share your invitation link to split bills seamlessly"
    >
      <div className="space-y-4">
        <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#065F46] flex items-center justify-center mx-auto mb-2">
            <Share2 className="w-6 h-6" />
          </div>
          <p className="text-xs text-slate-600 max-w-xs mx-auto">
            Friends who join through your unique link will automatically connect with you on Evenly.
          </p>
        </div>

        <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
          {isLoading ? (
            <div className="flex-1 py-1 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-[#065F46]" />
            </div>
          ) : (
            <input
              readOnly
              value={inviteUrl}
              className="flex-1 bg-transparent text-xs text-slate-700 font-mono truncate outline-none select-all"
            />
          )}
          <Button
            size="sm"
            variant={copied ? "secondary" : "outline"}
            onClick={handleCopy}
            disabled={isLoading || !inviteUrl}
            className="shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1" />
                Copy
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <Button
            variant="primary"
            onClick={handleNativeShare}
            disabled={isLoading || !inviteUrl}
            className="w-full flex items-center justify-center gap-1.5"
          >
            <Share2 className="w-4 h-4" />
            Share Link
          </Button>
          <Button
            variant="outline"
            onClick={handleWhatsAppShare}
            disabled={isLoading || !inviteUrl}
            className="w-full flex items-center justify-center gap-1.5 text-emerald-700 hover:bg-emerald-50"
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            WhatsApp
          </Button>
        </div>
      </div>
    </Modal>
  );
}

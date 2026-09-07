"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ChangePasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(() => (
    token
      ? null
      : { type: "error", message: "Secure transaction token is missing. Please check your email recovery link." }
  ));

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;
    fetch(`/api/auth/change-password?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Invalid or expired reset link.");
        if (active) {
          setTokenValid(true);
          setStatus({ type: "success", message: "Reset link verified. Enter your new password." });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setStatus({
            type: "error",
            message: error instanceof Error ? error.message : "Invalid or expired reset link.",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !tokenValid) return;

    if (password.length < 8) {
      setStatus({ type: "error", message: "Password must be at least 8 characters long." });
      return;
    }

    if (password !== confirmPassword) {
      setStatus({ type: "error", message: "Passwords do not match. Please verify your entries." });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Password update failed.");

      setStatus({ type: "success", message: "Password updated successfully! Redirecting to login..." });
      setTimeout(() => router.push("/auth/login?reset=true"), 1500);
    } catch (error: unknown) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "An unexpected password update failure occurred.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-agri-bgLight to-[#E2EAE4] flex items-center justify-center p-4 font-body text-agri-neutral">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-md p-8 space-y-6">
        <div className="text-center">
          <span className="font-label text-xs tracking-widest text-agri-secondary uppercase font-semibold">Account Recovery</span>
          <h2 className="font-headline text-3xl font-bold text-agri-neutral tracking-tight mt-1">New Password</h2>
          <p className="text-sm text-slate-500 font-body mt-2">Verify your recovery link, then create a new administrator password.</p>
        </div>

        {status && (
          <div className={`p-4 border rounded-sm text-xs font-body text-left ${status.type === "success" ? "bg-agri-primary/10 border-agri-primary/20 text-agri-primary" : "bg-agri-tertiary/10 border-agri-tertiary/20 text-agri-tertiary"}`}>
            <p className="font-semibold">{status.type === "success" ? "Verification Status" : "Update Blocked"}</p>
            <p className="opacity-90 mt-1">{status.message}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="new-password" className="block font-label text-xs font-semibold text-slate-500 uppercase mb-1.5">Enter New Password</label>
            <input id="new-password" type="password" required disabled={loading || !tokenValid} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-sm font-body text-sm focus:outline-none focus:border-agri-primary focus:bg-white transition-all disabled:opacity-50" />
          </div>
          <div>
            <label htmlFor="confirm-password" className="block font-label text-xs font-semibold text-slate-500 uppercase mb-1.5">Confirm New Password</label>
            <input id="confirm-password" type="password" required disabled={loading || !tokenValid} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="••••••••" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-sm font-body text-sm focus:outline-none focus:border-agri-primary focus:bg-white transition-all disabled:opacity-50" />
          </div>
          <button type="submit" disabled={loading || !tokenValid} className="w-full bg-agri-primary text-white font-body text-sm font-semibold tracking-wide py-3 rounded-sm shadow-xs hover:bg-[#0d3624] transition-colors disabled:bg-slate-300">
            {loading ? "Updating Password..." : "Set New Password"}
          </button>
        </form>

        <div className="border-t border-slate-100 pt-4 text-center font-label text-[10px] uppercase text-slate-400 tracking-wider">Q8Far security network node</div>
      </div>
    </div>
  );
}

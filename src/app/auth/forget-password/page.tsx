"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgetPasswordPage() {
  const router = useRouter();
  
  // Operational UI States
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setStatus(null);

    try {
      // Connects directly to the POST endpoint we wrote for your AuthToken schema mapping
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit recovery request.");
      }

      // Display the security-safe response text from your route template script
      setStatus({
        type: "success",
        message: data.message || "If an account exists, a secure verification link has been dispatched.",
      });
      
      // Clear out inputs upon successful validation
      setEmail("");
    } catch (err: unknown) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "An expected error occurred while creating link hashes.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-agri-bgLight to-[#E2EAE4] flex items-center justify-center p-4 font-body text-agri-neutral">
      
      {/* Box Shell matching your layout sketches */}
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-md p-8 space-y-6">
        
        {/* Descriptive Branding Block */}
        <div className="text-center">
          <span className="font-label text-xs tracking-widest text-agri-secondary uppercase font-semibold">
            Account Recovery
          </span>
          <h2 className="font-headline text-3xl font-bold text-agri-neutral tracking-tight mt-1">
            Forget Password
          </h2>
          <p className="text-sm text-slate-500 font-body mt-2">
            Enter your registered email address below to receive a secure recovery magic link.
          </p>
        </div>

        {/* Dynamic Context Status Notification Banner */}
        {status && (
          <div className={`p-4 border rounded-sm text-xs font-body text-left flex items-start gap-2.5 ${
            status.type === "success"
              ? "bg-agri-primary/10 border-agri-primary/20 text-agri-primary"
              : "bg-agri-tertiary/10 border-agri-tertiary/20 text-agri-tertiary"
          }`}>
            <span className="text-sm select-none mt-0.5">
              {status.type === "success" ? "✉" : "⚠"}
            </span>
            <div>
              <p className="font-semibold mb-0.5">
                {status.type === "success" ? "Instructions Sent" : "Submission Blocked"}
              </p>
              <p className="opacity-90">{status.message}</p>
            </div>
          </div>
        )}

        {/* ✉ Recovery Submission Core Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block font-label text-xs font-semibold text-slate-500 uppercase mb-1.5">
              Procurement Center Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-sm select-none">
                📭
              </span>
              <input
                id="email"
                type="email"
                required
                disabled={loading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="center-admin@q8far.com"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-sm font-body text-sm text-agri-neutral focus:outline-none focus:border-agri-primary focus:bg-white transition-all disabled:opacity-50"
              />
            </div>
          </div>

          {/* Action Trigger Buttons Container */}
          <div className="space-y-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-agri-primary text-white font-body text-sm font-semibold tracking-wide py-3 rounded-sm shadow-xs hover:bg-[#0d3624] transition-colors disabled:bg-slate-300"
            >
              {loading ? "Sending Mail Link..." : "Request Reset Link"}
            </button>
            
            <button
              type="button"
              onClick={() => router.push("/auth/login")}
              className="w-full bg-transparent border border-slate-200 text-slate-500 font-body text-xs py-2 rounded-sm hover:bg-slate-50 transition-colors"
            >
              Cancel and Return
            </button>
          </div>
        </form>

        {/* Small Footer Branding metadata signature */}
        <div className="border-t border-slate-100 pt-4 text-center font-label text-[10px] uppercase text-slate-400 tracking-wider">
          Q8Far crop distribution framework
        </div>

      </div>
    </div>
  );
}

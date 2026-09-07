"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // States for handling manual OTP / Link code processing
  const [otp, setOtp] = useState<string[]>(new Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // Refs to control focus hopping between OTP input boxes automatically
  const inputRefs = useRef<HTMLInputElement[]>([]);

  // Handler for automated GET token verification matching your backend
  const handleMagicLinkVerification = useCallback(async (token: string) => {
    setLoading(true);
    setStatusMessage({ type: "success", text: "Processing secure magic link token..." });
    
    try {
      const res = await fetch(`/api/auth/verify?token=${token}`);
      if (res.redirected) {
        // If your backend redirects straight to /login?verified=true
        router.push(new URL(res.url).pathname + new URL(res.url).search);
        return;
      }
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Magic link verification failed.");
      
      setStatusMessage({ type: "success", text: "Account successfully activated! Redirecting..." });
      setTimeout(() => router.push("/auth/login?verified=true"), 2000);
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Invalid or expired link token.",
      });
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Automatically check if a token string was passed via magic link in the URL parameters
  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");
    if (tokenFromUrl) {
      const timer = window.setTimeout(() => {
        void handleMagicLinkVerification(tokenFromUrl);
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [handleMagicLinkVerification, searchParams]);

  // Handle manual keyboard entry into the numeric input boxes
  const handleChange = (element: HTMLInputElement, index: number) => {
    if (isNaN(Number(element.value))) return;

    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);

    // Auto-focus next input box if filled
    if (element.value !== "" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Submit manual OTP digits code string to backend validation endpoints
  const handleManualVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCode = otp.join("");
    if (finalCode.length < 6) {
      setStatusMessage({ type: "error", text: "Please enter a valid 6-digit verification code." });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: finalCode }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification code mismatch.");

      setStatusMessage({ type: "success", text: "Verification successful!" });
      
      // Check if redirect parameters exist or fallback safely to landing views
      const destination = data.redirectTo || "/login?verified=true";
      setTimeout(() => router.push(destination), 1500);
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to verify. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-agri-bgLight to-[#E2EAE4] flex items-center justify-center p-4 font-body text-agri-neutral">
      
      {/* Container Frame mimicking your visual dashboard notes design spec curves */}
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-md p-8 text-center space-y-6">
        
        {/* Header App Branding */}
        <div>
          <span className="font-label text-xs tracking-widest text-agri-secondary uppercase font-semibold">
            Secure Portal
          </span>
          <h2 className="font-headline text-3xl font-bold text-agri-neutral tracking-tight mt-1">
            Verify Identity
          </h2>
          <p className="text-sm text-slate-500 font-body mt-2">
            Used to verify while performing account registration or password reset recovery cycles.
          </p>
        </div>

        {/* Status Toast Messaging banner */}
        {statusMessage && (
          <div className={`p-3 border rounded-sm text-xs font-body text-left flex items-start gap-2 ${
            statusMessage.type === "success" 
              ? "bg-agri-primary/10 border-agri-primary/20 text-agri-primary" 
              : "bg-agri-tertiary/10 border-agri-tertiary/20 text-agri-tertiary"
          }`}>
            <span>{statusMessage.type === "success" ? "✓" : "⚠"}</span>
            <p>{statusMessage.text}</p>
          </div>
        )}

        {/* 🔢 OTP Entering Form Block */}
        <form onSubmit={handleManualVerifySubmit} className="space-y-6">
          <div className="flex justify-between items-center gap-2 max-w-xs mx-auto">
            {otp.map((data, index) => (
              <input
                key={index}
                type="text"
                maxLength={1}
                ref={(el) => { if (el) inputRefs.current[index] = el; }}
                value={data}
                onChange={(e) => handleChange(e.target, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                disabled={loading}
                className="w-11 h-12 border border-slate-300 rounded-sm text-center font-label text-lg font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-agri-primary focus:ring-1 focus:ring-agri-primary text-agri-neutral transition-all disabled:opacity-50"
              />
            ))}
          </div>

          {/* Action Trigger Buttons */}
          <div className="space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-agri-primary text-white font-body text-sm font-semibold tracking-wide py-3 rounded-sm shadow-xs hover:bg-[#0d3624] transition-colors disabled:bg-slate-300"
            >
              {loading ? "Validating Secure Link..." : "Verify Code"}
            </button>
            
            <button
              type="button"
              onClick={() => router.push("/auth/login")}
              className="w-full bg-transparent border border-slate-300 text-slate-500 font-body text-xs py-2 rounded-sm hover:bg-slate-50 transition-colors"
            >
              Back to Login
            </button>
          </div>
        </form>

        {/* Footnote Branding details */}
        <div className="border-t border-slate-100 pt-4 flex items-center justify-center gap-2 font-label text-[10px] uppercase text-slate-400">
          <span>🔒 Encryption Active</span>
          <span>•</span>
          <span>Q8Far network</span>
        </div>

      </div>
    </div>
  );
}

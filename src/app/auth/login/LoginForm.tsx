"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react"; // If using client-side auth handlers, or handle manually via your API

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 📝 Mapped explicitly to your form specifications
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(() => {
    if (searchParams.get("verified") === "true") {
      return { type: "success", message: "Email verified successfully! You can now log into your center dashboard." };
    }
    if (searchParams.get("reset") === "true") {
      return { type: "success", message: "Password updated successfully. Please enter your new credentials below." };
    }
    return null;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setLoading(true);
    setStatus(null);

    try {
      // Connects directly to your Auth.js / NextAuth infrastructure pipeline
      const res = await signIn("credentials", {
        redirect: false,
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (res?.error) {
        throw new Error(res.error || "Invalid email or password structure.");
      }

      setStatus({ type: "success", message: "Access granted. Routing to active workspace..." });
      
      // Redirect cleanly into your operational workspace dashboard
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);

    } catch (err: unknown) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Authentication failed. Ensure your email is verified.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-agri-bgLight to-[#E2EAE4] flex items-center justify-center p-6 font-body text-agri-neutral">
      
      {/* Box Shell matching your layout sketches */}
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-md p-8 space-y-6">
        
        {/* Title Branding Header */}
        <div className="text-center">
          <span className="font-label text-xs tracking-widest text-agri-secondary uppercase font-semibold">
            Authentication Gate
          </span>
          <h2 className="font-headline text-3xl font-bold text-agri-neutral tracking-tight mt-1">
            Center Login
          </h2>
          <p className="text-sm text-slate-500 font-body mt-2">
            Enter your credentials to access the procurement console.
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
              {status.type === "success" ? "✓" : "⚠"}
            </span>
            <div>
              <p className="font-semibold mb-0.5">
                {status.type === "success" ? "System Notification" : "Access Denied"}
              </p>
              <p className="opacity-90">{status.message}</p>
            </div>
          </div>
        )}

        {/* Core Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Email Input */}
          <div>
            <label className="block font-label text-xs font-semibold text-slate-500 uppercase mb-1">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-sm select-none">
                ✉
              </span>
              <input
                type="email"
                required
                disabled={loading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ops-manager@q8far.com"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-sm font-body text-sm focus:outline-none focus:border-agri-primary focus:bg-white transition-all disabled:opacity-50"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block font-label text-xs font-semibold text-slate-500 uppercase">
                Password
              </label>
              
              {/* 🔗 MATCHES YOUR SPEC: Forget Password Navigation Anchor Link */}
              <button
                type="button"
                onClick={() => router.push("/auth/forget-password")}
                className="font-body text-xs text-agri-secondary hover:underline bg-transparent border-none p-0 cursor-pointer"
              >
                Forget password?
              </button>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-sm select-none">
                🔑
              </span>
              <input
                type="password"
                required
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-sm font-body text-sm focus:outline-none focus:border-agri-primary focus:bg-white transition-all disabled:opacity-50"
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
              {loading ? "Authenticating Center..." : "Sign In"}
            </button>
            
            <button
              type="button"
              onClick={() => router.push("/auth/register")}
              className="w-full bg-transparent border border-slate-200 text-slate-500 font-body text-xs py-2 rounded-sm hover:bg-slate-50 transition-colors"
            >
              Need an account? <span className="text-agri-secondary hover:underline">Register center node</span>
            </button>
          </div>
        </form>

        {/* Small Footer Branding signature */}
        <div className="border-t border-slate-100 pt-4 text-center font-label text-[10px] uppercase text-slate-400 tracking-wider">
          Q8Far centralized distribution network
        </div>

      </div>
    </div>
  );
}

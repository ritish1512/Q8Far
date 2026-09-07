"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  // 📝 Form state mapped explicitly to your image specifications
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    pincode: "",
    landmark: "",
    fullAddress: "",
  });

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      // Connects cleanly to your registration pipeline
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed.");
      }

      // Show success state prompting them to check their inbox
      setStatus({
        type: "success",
        message: "Account submitted! A magic link verification string has been sent to your email.",
      });

      // Clear form properties on success
      setFormData({
        name: "",
        email: "",
        password: "",
        pincode: "",
        landmark: "",
        fullAddress: "",
      });
    } catch (err: any) {
      setStatus({
        type: "error",
        message: err.message || "An unexpected error occurred during profile registration.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-agri-bgLight to-[#E2EAE4] flex items-center justify-center p-6 font-body text-agri-neutral">
      
      {/* Expanded Box Layout to accommodate complete operational fields comfortably */}
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-md p-8 space-y-6">
        
        {/* Descriptive Branding Header */}
        <div className="text-center">
          <span className="font-label text-xs tracking-widest text-agri-secondary uppercase font-semibold">
            Onboarding Hub
          </span>
          <h2 className="font-headline text-3xl font-bold text-agri-neutral tracking-tight mt-1">
            Register Center
          </h2>
          <p className="text-sm text-slate-500 font-body mt-2">
            Create a node profile within the Q8Far procurement logistics network.
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
                {status.type === "success" ? "Verification Required" : "Registration Blocked"}
              </p>
              <p className="opacity-90">{status.message}</p>
            </div>
          </div>
        )}

        {/* Register Multi-Field Submission Layout Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Section 1: Basic Authentication Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-label text-xs font-semibold text-slate-500 uppercase mb-1">
                Center Name
              </label>
              <input
                type="text"
                name="name"
                required
                disabled={loading}
                value={formData.name}
                onChange={handleChange}
                placeholder="Al-Wafra North Center"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm font-body text-sm focus:outline-none focus:border-agri-primary focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block font-label text-xs font-semibold text-slate-500 uppercase mb-1">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                required
                disabled={loading}
                value={formData.email}
                onChange={handleChange}
                placeholder="ops@q8far.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm font-body text-sm focus:outline-none focus:border-agri-primary focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block font-label text-xs font-semibold text-slate-500 uppercase mb-1">
              Secure Password
            </label>
            <input
              type="password"
              name="password"
              required
              disabled={loading}
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm font-body text-sm focus:outline-none focus:border-agri-primary focus:bg-white transition-all"
            />
          </div>

          {/* Section 2: Regional Delivery Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block font-label text-xs font-semibold text-slate-500 uppercase mb-1">
                Pincode / Postal Area
              </label>
              <input
                type="text"
                name="pincode"
                required
                maxLength={6}
                disabled={loading}
                value={formData.pincode} // safe runtime lookup evaluation fallback
                onChange={handleChange}
                placeholder="E.g., 400012"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm font-body text-sm focus:outline-none focus:border-agri-primary focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block font-label text-xs font-semibold text-slate-500 uppercase mb-1">
                Landmark Reference
              </label>
              <input
                type="text"
                name="landmark"
                disabled={loading}
                value={formData.landmark}
                onChange={handleChange}
                placeholder="Near Main Silo Complex"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm font-body text-sm focus:outline-none focus:border-agri-primary focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block font-label text-xs font-semibold text-slate-500 uppercase mb-1">
              Full Physical Address Location
            </label>
            <textarea
              name="fullAddress"
              required
              rows={2}
              disabled={loading}
              value={formData.fullAddress}
              onChange={handleChange}
              placeholder="Block 4, Agricultural Zone Roadways, Al-Wafra Area, Kuwait"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm font-body text-sm focus:outline-none focus:border-agri-primary focus:bg-white transition-all resize-none"
            />
          </div>

          {/* Action Trigger Buttons Container */}
          <div className="space-y-2 pt-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-agri-primary text-white font-body text-sm font-semibold tracking-wide py-3 rounded-sm shadow-xs hover:bg-[#0d3624] transition-colors disabled:bg-slate-300"
            >
              {loading ? "Registering Node & Creating Token..." : "Register Procurement Center"}
            </button>
            
            <button
              type="button"
              onClick={() => router.push("/auth/login")}
              className="w-full bg-transparent border border-slate-200 text-slate-500 font-body text-xs py-2 rounded-sm hover:bg-slate-50 transition-colors"
            >
              Already registered? <span className="text-agri-secondary hover:underline">Proceed to Login</span>
            </button>
          </div>
        </form>

        {/* Small Footer Branding metadata signature */}
        <div className="border-t border-slate-100 pt-4 text-center font-label text-[10px] uppercase text-slate-400 tracking-wider">
                Q8Far decentralized grain network architecture
        </div>

      </div>
    </div>
  );
}

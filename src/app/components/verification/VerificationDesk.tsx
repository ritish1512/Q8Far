"use client";

import React, { useState } from "react";

interface BookingData {
  id: string;
  token: string;
  farmerName: string | null;
  farmerPhone: string;
  crop: string;
  quantity: number;
  status: string;
  allocatedStart: string | null;
  aadhaarChecked: boolean;
}

export default function VerificationDesk() {
  const [tokenInput, setTokenInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. Search Query Pipeline
  const handleTokenLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    setLoading(true);
    setError(null);
    setBooking(null);
    setSuccessMessage(null);

    try {
      // Direct lookup matching our backend index controller endpoints
      const res = await fetch(`/api/auth/procurement/verify-token?token=${encodeURIComponent(tokenInput.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Token search execution failed.");
      }

      setBooking(data.booking);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Commit Check-In State Mutation Pipeline
  const handleApproveCheckIn = async () => {
    if (!booking) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/procurement/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to commit state change.");
      }

      setSuccessMessage(`Success! Token ${booking.token} verified. Farmer moved to queue.`);
      setBooking(null);
      setTokenInput("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not log check-in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-agri-bgLight to-[#E2EAE4] p-6 font-body text-agri-neutral">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="font-headline text-3xl font-bold text-agri-neutral tracking-tight">
              Gate Gate Entry & Verification Counter
            </h1>
            <p className="text-sm text-slate-500 font-body">
              Cross-check incoming tokens with physical Aadhaar card identity.
            </p>
          </div>
          <div className="mt-2 md:mt-0 bg-agri-primary/10 text-agri-primary font-label text-xs tracking-wider font-semibold px-3 py-1.5 rounded-sm uppercase">
            Counter Desk #1
          </div>
        </div>

        {/* 🛠️ Token Input Section Box */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
          <form onSubmit={handleTokenLookup} className="flex gap-3">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 font-label text-sm">
                🔑
              </span>
              <input
                type="text"
                maxLength={6}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Enter Farmer's 6-Digit Token..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-sm font-label text-sm tracking-widest focus:outline-none focus:border-agri-primary focus:bg-white transition-all uppercase"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-agri-primary text-white font-body text-sm font-semibold px-6 py-3 rounded-sm shadow-xs hover:bg-[#0d3624] disabled:bg-slate-300 transition-colors"
            >
              {loading ? "Searching..." : "Lookup"}
            </button>
          </form>

          {/* Toast Messages Layer */}
          {error && (
            <div className="mt-4 p-3 bg-agri-tertiary/10 border border-agri-tertiary/20 text-agri-tertiary rounded-sm text-sm font-body">
              ⚠ {error}
            </div>
          )}
          {successMessage && (
            <div className="mt-4 p-3 bg-agri-primary/10 border border-agri-primary/20 text-agri-primary rounded-sm text-sm font-body">
              ✓ {successMessage}
            </div>
          )}
        </div>

        {/* 📋 Result Validation Sheet */}
        {booking && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden animate-fadeIn">
            
            {/* Quick Status Band */}
            <div className="bg-agri-neutral text-white px-6 py-3 flex justify-between items-center font-label text-xs tracking-wider">
              <span>TOKEN REFERENCE: {booking.token}</span>
              <span className="bg-white/20 px-2 py-0.5 rounded">STATUS: {booking.status}</span>
            </div>

            {/* Grid Metrics Breakdown Layout */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-slate-100">
              
              {/* Profile Verification Check Block */}
              <div className="space-y-4">
                <h3 className="font-headline font-bold text-sm tracking-wide text-slate-400 uppercase">
                  Verify Against Physical Aadhaar
                </h3>
                
                <div>
                  <label className="font-label text-xs text-slate-400 block">Farmer Name</label>
                  <p className="font-body text-lg font-bold text-slate-700">
                    {booking.farmerName || "Not Provided (USSD Quick Reg)"}
                  </p>
                </div>

                <div>
                  <label className="font-label text-xs text-slate-400 block">Registered Phone</label>
                  <p className="font-body text-md font-semibold text-slate-600 tracking-wide">
                    {booking.farmerPhone}
                  </p>
                </div>
              </div>

              {/* Crop Allocation Load Check Block */}
              <div className="space-y-4 md:border-l md:border-slate-100 md:pl-6">
                <h3 className="font-headline font-bold text-sm tracking-wide text-slate-400 uppercase">
                  Expected Delivery Payload
                </h3>

                <div>
                  <label className="font-label text-xs text-slate-400 block">Crop Type</label>
                  <span className="inline-block mt-1 bg-agri-secondary/10 border border-agri-secondary/20 text-agri-secondary font-label text-xs font-bold px-2 py-0.5 rounded">
                    {booking.crop}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-label text-xs text-slate-400 block">Estimated Bags</label>
                    <p className="font-body text-lg font-bold text-slate-700">{booking.quantity} Bags</p>
                  </div>
                  <div>
                    <label className="font-label text-xs text-slate-400 block">Arrival Window</label>
                    <p className="font-body text-sm font-semibold text-slate-600 mt-1">
                      {booking.allocatedStart 
                        ? new Date(booking.allocatedStart).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                        : "Walk-in Queue"}
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Actions Ribbon Control Block */}
            <div className="bg-slate-50 px-6 py-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-body text-slate-500">
                <input 
                  type="checkbox" 
                  id="aadhaarConfirm" 
                  className="w-4 h-4 accent-agri-primary border-slate-300 rounded focus:ring-agri-primary"
                  defaultChecked={booking.aadhaarChecked}
                />
                <label htmlFor="aadhaarConfirm" className="cursor-pointer select-none">
                  I confirm that the photo and details match the physical card.
                </label>
              </div>
              
              <div className="flex gap-2 sm:ml-auto">
                <button 
                  onClick={() => setBooking(null)}
                  className="px-4 py-2 border border-slate-200 rounded-sm font-body text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApproveCheckIn}
                  disabled={loading}
                  className="bg-agri-primary text-white font-body text-xs font-semibold px-5 py-2 rounded-sm shadow-xs hover:bg-[#0d3624] disabled:bg-slate-300 transition-colors"
                >
                  {loading ? "Processing..." : "Approve Identity & Check-In"}
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

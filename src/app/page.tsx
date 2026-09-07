"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function RootLandingPage() {
  const router = useRouter();
  const [tokenInput, setTokenInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<string | null>(null);

  const handleQuickLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    setLoading(true);
    setSearchResult(null);

    try {
      // Handshakes with your existing queue status query endpoints
      const res = await fetch(`/api/auth/procurement/verify-token?token=${encodeURIComponent(tokenInput.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        setSearchResult(`⚠ ${data.error || "Token not found. Verify your digits."}`);
      } else {
        setSearchResult(`✓ Token Status: ${data.booking.status}. Scheduled Time: ${data.booking.allocatedStart ? new Date(data.booking.allocatedStart).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "Pending Allocation"}`);
      }
    } catch {
      setSearchResult("⚠ Unable to look up status right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-agri-bgLight to-[#E2EAE4] font-body text-agri-neutral flex flex-col justify-between">
      
      {/* 🌐 Top Navigation Ribbon Header */}
      <header className="max-w-7xl w-full mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌾</span>
          <span className="font-headline font-black text-xl tracking-tight text-agri-primary">
            Q8Far
          </span>
        </div>
        
        <button
          onClick={() => router.push("/auth/login")}
          className="bg-agri-primary text-white font-body text-xs font-bold px-4 py-2 rounded-sm shadow-xs hover:bg-[#0d3624] transition-all cursor-pointer uppercase tracking-wider"
        >
          Center Management Dashboard →
        </button>
      </header>

      {/* 🚀 Main Hero Container Section */}
      <main className="max-w-5xl w-full mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-2 gap-12 items-center my-auto">
        
        {/* Left Hand: Value Proposition Copywriting */}
        <div className="space-y-6">
          <span className="font-label text-xs tracking-widest text-agri-secondary uppercase font-semibold block">
            Smart Logistics Middleware
          </span>
          <h1 className="font-headline text-4xl sm:text-5xl font-black tracking-tight text-agri-neutral leading-10">
            Connecting Farmers with Procurement Centers.
          </h1>
          <p className="text-slate-600 text-sm leading-relaxed max-w-md">
            An automated decentralized scheduling ecosystem. Farmers secure time allocations instantly via high-speed USSD channels, while hubs manage structural incoming queues, weighbridge metrics, and payment loops seamlessly.
          </p>
          
          {/* Quick Informational Pill Grid */}
          <div className="grid grid-cols-3 gap-3 max-w-sm pt-2">
            <div className="bg-white/60 border border-slate-200 p-3 rounded-lg text-center">
              <span className="block text-lg">📱</span>
              <span className="font-label text-[9px] text-slate-400 font-bold block uppercase mt-1">USSD Dialing</span>
            </div>
            <div className="bg-white/60 border border-slate-200 p-3 rounded-lg text-center">
              <span className="block text-lg">⚖️</span>
              <span className="font-label text-[9px] text-slate-400 font-bold block uppercase mt-1">Weighbridge</span>
            </div>
            <div className="bg-white/60 border border-slate-200 p-3 rounded-lg text-center">
              <span className="block text-lg">💰</span>
              <span className="font-label text-[9px] text-slate-400 font-bold block uppercase mt-1">Direct Payout</span>
            </div>
          </div>
        </div>

        {/* Right Hand: Public Web Ticket Token Quick Tracker Area */}
        <div className="bg-white border border-slate-200 shadow-md rounded-2xl p-8 space-y-6">
          <div>
            <h2 className="font-headline text-xl font-bold text-agri-neutral">
              Farmer Queue Status Checker
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Did you receive a 6-digit verification code token via phone call or SMS text loop? Enter it below to check your current station position.
            </p>
          </div>

          <form onSubmit={handleQuickLookup} className="space-y-3">
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 font-label text-sm select-none">
                🎟️
              </span>
              <input
                type="text"
                maxLength={6}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Enter Your 6-Digit Token..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-sm font-label text-sm tracking-widest focus:outline-none focus:border-agri-primary focus:bg-white transition-all uppercase"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-agri-secondary text-white font-body text-xs font-bold tracking-wider py-3 rounded-sm shadow-xs hover:brightness-95 transition-all uppercase cursor-pointer"
            >
              {loading ? "Scanning Logistics Grid..." : "Check My Position"}
            </button>
          </form>

          {/* Quick Status Output Result */}
          {searchResult && (
            <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 animate-fadeIn">
  <div className="text-xs font-semibold text-slate-400 tracking-wider uppercase mb-1">
    Search Result
  </div>
  <p className="text-sm font-normal text-slate-700 leading-relaxed">
    {searchResult}
  </p>
</div>

          )}
        </div>

      </main>

      {/* 📄 System Footer Ribbon */}
      <footer className="max-w-7xl w-full mx-auto px-6 py-4 border-t border-slate-200/50 flex flex-col sm:flex-row justify-between items-center gap-2 font-label text-[10px] text-slate-400 uppercase tracking-wider">
        <span>© 2026 Q8Far decentralized networks platform</span>
        <div className="flex gap-4">
          <span>USSD Protocol Active</span>
          <span>•</span>
          <span>PostgreSQL Grounded</span>
        </div>
      </footer>

    </div>
  );
}

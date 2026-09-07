"use client";

import React, { useState } from "react";

// Mapped structural schema types for past operations tracking
interface PastSchedule {
  id: string;
  dateString: string;
  cropsAccepted: string[];
  operatingHours: string;
  totalCapacityBags: number;
  availableCapacityBags: number;
  totalFarmersProcessed: number;
  status: "AVAILABLE" | "FULL" | "CLOSED";
}

export default function HistoryDashboardPage() {
  const [filterStatus, setFilterStatus] = useState<"ALL" | "FULL" | "CLOSED">("ALL");

  // Mock array matching your exact log summary lines: [timing, crop, capacity]
  const [pastSchedules] = useState<PastSchedule[]>([
    {
      id: "sched-1",
      dateString: "September 04, 2026",
      cropsAccepted: ["Paddy", "Wheat"],
      operatingHours: "09:00 AM - 05:00 PM",
      totalCapacityBags: 1000,
      availableCapacityBags: 0,
      totalFarmersProcessed: 24,
      status: "FULL",
    },
    {
      id: "sched-2",
      dateString: "September 02, 2026",
      cropsAccepted: ["Wheat", "Maize"],
      operatingHours: "09:00 AM - 05:00 PM",
      totalCapacityBags: 1200,
      availableCapacityBags: 340,
      totalFarmersProcessed: 18,
      status: "AVAILABLE",
    },
    {
      id: "sched-3",
      dateString: "August 28, 2026",
      cropsAccepted: ["Paddy", "Maize"],
      operatingHours: "08:00 AM - 04:00 PM",
      totalCapacityBags: 800,
      availableCapacityBags: 0,
      totalFarmersProcessed: 19,
      status: "CLOSED",
    },
  ]);

  const filteredLogs = pastSchedules.filter((log) => {
    if (filterStatus === "ALL") return true;
    return log.status === filterStatus;
  });

  return (
    <div className="min-h-screen bg-linear-to-br from-agri-bgLight to-[#E2EAE4] p-6 font-body text-agri-neutral">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Summary Metadata Block */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="font-headline text-3xl font-bold text-agri-neutral tracking-tight">
              Previous Schedules Log
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Review and audit your past operational windows, accepted crop metrics, and volume caps.
            </p>
          </div>
          
          {/* Mock Export Button for system data footprints */}
          <button 
            onClick={() => alert("Generating CSV document stream export payload...")}
            className="mt-3 sm:mt-0 bg-transparent border border-slate-300 text-slate-600 font-body text-xs font-semibold px-4 py-2 rounded-sm hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            📋 Export Logs (.CSV)
          </button>
        </div>

        {/* Tab Filters Navigation Bar */}
        <div className="flex gap-2 border-b border-slate-200 pb-1">
          {(["ALL", "FULL", "CLOSED"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-1.5 font-label text-xs font-bold tracking-wider transition-all border-b-2 cursor-pointer ${
                filterStatus === status
                  ? "border-agri-primary text-agri-primary font-black"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              {status} WINDOWS
            </button>
          ))}
        </div>

        {/* 🗃️ Historical Data Output Grid / Table Layer */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-label text-[10px] tracking-wider text-slate-400 uppercase">
                  <th className="py-3 px-6">Operational Date</th>
                  <th className="py-3 px-6">Accepted Crops</th>
                  <th className="py-3 px-6">Timing Window</th>
                  <th className="py-3 px-6">Capacity Allocation</th>
                  <th className="py-3 px-6">Processed Farmers</th>
                  <th className="py-3 px-6 text-right">Final Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-body text-xs text-slate-600">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Date */}
                      <td className="py-4 px-6 font-semibold text-slate-700">
                        {log.dateString}
                      </td>
                      
                      {/* Crops Tags */}
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-1.5">
                          {log.cropsAccepted.map((crop, i) => (
                            <span 
                              key={i} 
                              className="bg-agri-secondary/10 border border-agri-secondary/10 text-agri-secondary font-label text-[9px] font-bold px-1.5 py-0.5 rounded-xs"
                            >
                              {crop}
                            </span>
                          ))}
                        </div>
                      </td>
                      
                      {/* Timing Window */}
                      <td className="py-4 px-6 font-label font-medium opacity-90">
                        {log.operatingHours}
                      </td>
                      
                      {/* Capacity Meter Details */}
                      <td className="py-4 px-6">
                        <span className="font-bold text-slate-700">
                          {log.totalCapacityBags - log.availableCapacityBags}
                        </span>
                        <span className="text-slate-400"> / {log.totalCapacityBags} Bags</span>
                      </td>
                      
                      {/* Count of Farmers */}
                      <td className="py-4 px-6 font-label font-bold text-slate-700">
                        {log.totalFarmersProcessed} Check-ins
                      </td>
                      
                      {/* Status Badging Flag */}
                      <td className="py-4 px-6 text-right">
                        <span className={`inline-block font-label text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-sm uppercase ${
                          log.status === "FULL"
                            ? "bg-agri-primary/10 text-agri-primary border border-agri-primary/20"
                            : log.status === "CLOSED"
                            ? "bg-agri-tertiary/10 text-agri-tertiary border border-agri-tertiary/20"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                      📭 No past operational logs matched the selected filter configuration parameters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

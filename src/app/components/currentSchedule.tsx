"use client";

import { FormEvent, useEffect, useState } from "react";

type Booking = {
  id: string;
  token: string;
  farmerName: string | null;
  farmerPhone: string;
  cropName: string;
  quantity: number;
  status: string;
  allocatedStart: string | null;
  grossWeightKg: number | null;
  qualityStatus: string;
  tareWeightKg: number | null;
  netWeightKg: number | null;
  paymentStatus: string;
  finalPayout: number | null;
  paymentRefId: string | null;
};

type ScheduleData = {
  schedule: { id: string; totalCapacity: number; availableCapacity: number; isSuspended: boolean; delayMinutes: number };
  center: { currentStorageKg: number; maxStorageKg: number };
  current: Booking | null;
  upcoming: Booking[];
  pending: Booking[];
  payments: Booking[];
};

type Action = "lookup" | "approve" | "reject" | "checkIn" | "gross" | "quality" | "tare" | "accept" | "initiatePayment" | "completePayment" | "freeze" | "resume" | "delay";

export default function CurrentSchedule() {
  const [data, setData] = useState<ScheduleData | null>(null);
  const [token, setToken] = useState("");
  const [verificationPhone, setVerificationPhone] = useState("");
  const [pendingPhones, setPendingPhones] = useState<Record<string, string>>({});
  const [grossWeight, setGrossWeight] = useState("");
  const [tareWeight, setTareWeight] = useState("");
  const [lookup, setLookup] = useState<Booking | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    const response = await fetch("/api/procurement/current-schedule", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to load schedule.");
    setData(result);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load schedule."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function submitAction(action: Action, bookingId?: string, phoneOverride?: string) {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/procurement/current-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          bookingId,
          token: token.trim(),
          verificationPhone: (phoneOverride ?? verificationPhone).trim(),
          weightKg: action === "gross" ? Number(grossWeight) : action === "tare" ? Number(tareWeight) : undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The requested action could not be completed.");
      if (action === "lookup") {
        setLookup(result.booking);
        setMessage(result.message || null);
        if (result.booking.status === "ARRIVED") await refresh();
      }
      else {
        setMessage(result.message || "Schedule updated.");
        setLookup(null);
        await refresh();
      }
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "The requested action could not be completed.");
    } finally {
      setLoading(false);
    }
  }

  function handleLookup(event: FormEvent) {
    event.preventDefault();
    if (token.trim()) void submitAction("lookup");
  }

  if (!data) return <main className="p-6 text-sm text-slate-500">Loading current schedule...</main>;

  const capacityUsed = Math.max(0, data.schedule.totalCapacity - data.schedule.availableCapacity);
  const capacityPercent = data.schedule.totalCapacity > 0 ? Math.min(100, Math.round((capacityUsed / data.schedule.totalCapacity) * 100)) : 0;

  return (
    <main className="min-h-screen bg-linear-to-br from-agri-bgLight to-[#E2EAE4] p-6 font-body text-agri-neutral">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <h2 className="font-headline font-bold text-sm text-slate-400 uppercase tracking-wide mb-3">Pending phone verification</h2>
            {data.pending.length === 0 ? <p className="text-sm text-slate-500">No pending farmer bookings.</p> : <div className="space-y-3">{data.pending.map((booking) => <div key={booking.id} className="border border-slate-200 rounded-sm p-4"><div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm"><div><span className="block text-[10px] uppercase text-slate-400">Farmer</span><strong>{booking.farmerName || "Not provided"}</strong></div><div><span className="block text-[10px] uppercase text-slate-400">Phone</span><a href={`tel:${booking.farmerPhone}`} className="text-agri-primary underline">{booking.farmerPhone}</a></div><div><span className="block text-[10px] uppercase text-slate-400">Crop / capacity</span>{booking.cropName} · {booking.quantity} bags</div><div><span className="block text-[10px] uppercase text-slate-400">Token</span>{booking.token}</div></div><div className="mt-3 flex gap-2"><input value={pendingPhones[booking.id] || ""} onChange={(event) => setPendingPhones((current) => ({ ...current, [booking.id]: event.target.value }))} placeholder="Enter verified phone number" className="flex-1 px-3 py-2 border border-slate-200 rounded-sm text-sm" /><button type="button" disabled={loading} onClick={() => void submitAction("approve", booking.id, pendingPhones[booking.id])} className="bg-agri-primary text-white px-4 py-2 rounded-sm text-xs font-semibold disabled:bg-slate-300">Approve booking</button><button type="button" disabled={loading} onClick={() => void submitAction("reject", booking.id)} className="text-red-700 px-3 py-2 rounded-sm text-xs font-semibold disabled:opacity-50">Reject</button></div></div>)}</div>}
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <h2 className="font-headline font-bold text-sm text-slate-400 uppercase tracking-wide mb-3">Token entering area</h2>
            <form onSubmit={handleLookup} className="flex gap-3">
              <input value={token} onChange={(event) => setToken(event.target.value)} maxLength={6} inputMode="numeric" placeholder="Enter farmer token" className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-sm tracking-widest" />
              <button type="submit" disabled={loading} className="bg-agri-primary text-white text-xs font-semibold px-5 py-2.5 rounded-sm disabled:bg-slate-300">Check In</button>
            </form>
            {lookup && <div className="mt-4 border border-slate-200 rounded-sm p-4 text-sm space-y-3"><p><strong>{lookup.farmerName || "Farmer"}</strong> · {lookup.farmerPhone} · {lookup.cropName} · {lookup.quantity} bags · {lookup.status}</p>{lookup.status === "PENDING" && <div className="flex gap-2"><input value={verificationPhone} onChange={(event) => setVerificationPhone(event.target.value)} placeholder="Confirm farmer phone number" className="flex-1 px-3 py-2 border border-slate-200 rounded-sm" /><button type="button" onClick={() => void submitAction("approve", lookup.id)} disabled={loading} className="text-agri-primary font-semibold">Approve booking</button><button type="button" onClick={() => void submitAction("reject", lookup.id)} disabled={loading} className="text-red-700 font-semibold">Reject</button></div>}</div>}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="bg-agri-neutral text-white px-6 py-3 flex justify-between font-label text-xs tracking-wider"><span>Current booked farmer</span><span>{data.current ? `TOKEN: ${data.current.token}` : "NO ACTIVE FARMER"}</span></div>
            {data.current ? (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div><label className="text-[10px] uppercase text-slate-400 block">Farmer</label><p className="font-bold">{data.current.farmerName || "Not provided"}</p></div>
                  <div><label className="text-[10px] uppercase text-slate-400 block">Phone</label><p className="font-semibold">{data.current.farmerPhone}</p></div>
                  <div><label className="text-[10px] uppercase text-slate-400 block">Payload</label><p className="font-bold text-agri-secondary">{data.current.quantity} bags · {data.current.cropName}</p></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-sm border"><label className="text-xs font-semibold">Gross weight (kg)<input type="number" min="0.01" step="0.01" value={grossWeight} onChange={(event) => setGrossWeight(event.target.value)} disabled={loading || data.current.status !== "ARRIVED"} className="mt-2 w-full px-2 py-2 border border-slate-200 rounded-sm" /></label><button type="button" disabled={loading || data.current.status !== "ARRIVED" || !grossWeight} onClick={() => void submitAction("gross", data.current?.id)} className="mt-2 w-full font-semibold text-xs disabled:opacity-50">Save gross weight</button></div>
                  <button type="button" disabled={loading || data.current.status !== "GROSS_WEIGHED"} onClick={() => void submitAction("quality", data.current?.id)} className="p-4 rounded-sm border font-semibold text-xs disabled:opacity-50">Quality check<br /><span className="text-[10px]">{data.current.qualityStatus === "PASSED" ? "Completed" : "Pending"}</span></button>
                  <div className="p-3 rounded-sm border"><label className="text-xs font-semibold">Tare weight (kg)<input type="number" min="0.01" step="0.01" value={tareWeight} onChange={(event) => setTareWeight(event.target.value)} disabled={loading || data.current.status !== "QUALITY_CHECKED"} className="mt-2 w-full px-2 py-2 border border-slate-200 rounded-sm" /></label><button type="button" disabled={loading || data.current.status !== "QUALITY_CHECKED" || !tareWeight} onClick={() => void submitAction("tare", data.current?.id)} className="mt-2 w-full font-semibold text-xs disabled:opacity-50">Save tare weight</button></div>
                </div>
                <div className="flex gap-3"><button type="button" disabled={loading || data.current.status !== "TARE_WEIGHED"} onClick={() => void submitAction("accept", data.current?.id)} className="flex-1 bg-agri-primary text-white py-3 rounded-sm font-semibold disabled:bg-slate-300">Accept crop load and move to payment</button><button type="button" disabled={loading} onClick={() => void submitAction("reject", data.current?.id)} className="border border-red-300 text-red-700 px-4 rounded-sm font-semibold disabled:opacity-50">Reject</button></div>
              </div>
            ) : <p className="p-6 text-sm text-slate-500">No farmer is currently ready for processing.</p>}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-headline font-bold text-sm text-slate-400 uppercase tracking-wide">Payment queue</h2>
                <p className="text-xs text-slate-500 mt-1">Accepted farmer bookings awaiting payment initiation or completion.</p>
              </div>
              <span className="text-xs font-semibold text-agri-secondary">{data.payments.length} record{data.payments.length === 1 ? "" : "s"}</span>
            </div>
            {data.payments.length === 0 ? <p className="text-sm text-slate-500">No accepted bookings are waiting for payment.</p> : <div className="space-y-3">{data.payments.map((booking) => <div key={booking.id} className="border border-slate-200 rounded-sm p-4"><div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-sm"><div><span className="block text-[10px] uppercase text-slate-400">Farmer</span><strong>{booking.farmerName || "Not provided"}</strong></div><div><span className="block text-[10px] uppercase text-slate-400">Phone</span>{booking.farmerPhone}</div><div><span className="block text-[10px] uppercase text-slate-400">Token / crop</span>{booking.token} · {booking.cropName}</div><div><span className="block text-[10px] uppercase text-slate-400">Net quantity</span>{booking.netWeightKg ?? "Pending"} kg</div><div><span className="block text-[10px] uppercase text-slate-400">Payment</span>{booking.status}</div></div><div className="mt-3 flex items-center justify-between gap-3"><p className="text-sm text-slate-600">Payout: <strong>{booking.finalPayout != null ? `${booking.finalPayout.toFixed(2)} INR` : "Not calculated"}</strong>{booking.paymentRefId && <span className="ml-3 text-xs text-slate-400">Ref: {booking.paymentRefId}</span>}</p>{booking.status === "ACCEPTED" && <button type="button" disabled={loading} onClick={() => void submitAction("initiatePayment", booking.id)} className="bg-agri-primary text-white px-4 py-2 rounded-sm text-xs font-semibold disabled:bg-slate-300">Initiate payment</button>}{booking.status === "PAYMENT_INITIATED" && <button type="button" disabled={loading} onClick={() => void submitAction("completePayment", booking.id)} className="bg-agri-secondary text-white px-4 py-2 rounded-sm text-xs font-semibold disabled:bg-slate-300">Complete payment</button>}{booking.status === "MONEY_TRANSFERRED" && <span className="text-xs font-semibold text-green-700">Payment completed</span>}</div></div>)}</div>}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs text-center">
            <h2 className="font-headline font-bold text-sm text-slate-400 uppercase tracking-wide">Stack tracker</h2>
            <div className="mx-auto my-5 h-32 w-32 rounded-full border-[14px] border-slate-100 flex items-center justify-center" style={{ borderRightColor: capacityPercent > 0 ? "#134e34" : undefined, borderTopColor: capacityPercent > 25 ? "#134e34" : undefined, borderLeftColor: capacityPercent > 50 ? "#134e34" : undefined, borderBottomColor: capacityPercent > 75 ? "#134e34" : undefined }}><span className="text-2xl font-bold">{capacityPercent}%</span></div>
            <p className="text-sm font-semibold">{capacityUsed.toLocaleString()} kg / {data.schedule.totalCapacity.toLocaleString()} kg reserved</p>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <h2 className="font-headline font-bold text-sm text-slate-400 uppercase tracking-wide mb-4">Next farmers</h2>
            <div className="space-y-3">{data.upcoming.length === 0 ? <p className="text-sm text-slate-500">No upcoming farmers.</p> : data.upcoming.map((farmer) => <div key={farmer.id} className="border-b border-slate-100 pb-3 text-sm"><p className="font-semibold">{farmer.farmerName || "Not provided"}</p><p className="text-slate-500">{farmer.farmerPhone}</p><p className="text-slate-500">{farmer.allocatedStart ? new Date(farmer.allocatedStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Unscheduled"} · {farmer.quantity} bags · Token #{farmer.token}</p><button type="button" onClick={() => void submitAction("reject", farmer.id)} disabled={loading} className="mt-2 text-xs font-semibold text-red-700 disabled:opacity-50">Reject booking</button></div>)}</div>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
            <h2 className="font-headline font-bold text-sm text-slate-400 uppercase tracking-wide">SOS controls</h2>
            <p className="text-xs text-slate-500">Current delay: {data.schedule.delayMinutes} minutes</p>
            <button type="button" disabled={loading || data.schedule.isSuspended} onClick={() => void submitAction("freeze")} className="w-full bg-agri-tertiary text-white py-2.5 rounded-sm text-xs font-semibold disabled:bg-slate-300">Freeze queue</button>
            <button type="button" disabled={loading || data.schedule.isSuspended} onClick={() => void submitAction("delay")} className="w-full border border-agri-secondary text-agri-secondary py-2.5 rounded-sm text-xs font-semibold disabled:opacity-50">Add 15 minutes delay</button>
            <button type="button" disabled={loading || !data.schedule.isSuspended} onClick={() => void submitAction("resume")} className="w-full bg-agri-primary text-white py-2.5 rounded-sm text-xs font-semibold disabled:bg-slate-300">Resume queue</button>
          </section>
        </aside>
      </div>
      {(message || error) && <div className={`fixed bottom-5 right-5 p-4 rounded-sm text-sm shadow-md ${error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>{error || message}</div>}
    </main>
  );
}

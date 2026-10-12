import React, { useState } from 'react';
import { 
  Truck, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  User, 
  Navigation, 
  Store, 
  ChevronRight,
  PhoneCall
} from 'lucide-react';

export default function PharmacyDeliveryPage({ onNavigateTab }) {
  // Active Deliveries List (starts empty for manual dispatching)
  const [deliveries, setDeliveries] = useState([]);

  // In-Store Pickup Queue (starts empty for manual queue)
  const [pickups, setPickups] = useState([]);

  // Delivery Riders Fleet
  const riders = [];

  const handleMarkPickedUp = (token) => {
    setPickups(prev => prev.filter(p => p.token !== token));
    alert(`Token ${token} marked as completed & picked up in-store!`);
  };

  return (
    <div className="space-y-6 font-sans text-eg-ink">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-eg-line shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-eg-ink tracking-tight">Delivery & Dispatch Command</h1>
          <p className="text-sm text-eg-muted mt-1">
            Track active rider dispatches, live delivery ETAs, and in-store patient pickup queues.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-eg-tint text-eg-teal font-bold text-xs">
          <Truck className="w-4 h-4 text-[#4FD1A5] animate-pulse" />
          <span>Active Delivery Radius: 10km</span>
        </div>
      </div>

      {/* Delivery Performance Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-eg-line shadow-sm">
          <span className="text-xs text-eg-muted font-semibold uppercase tracking-wider block">Avg Delivery Time</span>
          <div className="text-2xl font-bold text-eg-ink mt-1">None yet</div>
          <span className="text-[11px] text-eg-muted">No completed deliveries</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-eg-line shadow-sm">
          <span className="text-xs text-eg-muted font-semibold uppercase tracking-wider block">On-Time Delivery Rate</span>
          <div className="text-2xl font-bold text-eg-ink mt-1">None yet</div>
          <span className="text-[11px] text-eg-muted">Appears after the first delivery</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-eg-line shadow-sm">
          <span className="text-xs text-eg-muted font-semibold uppercase tracking-wider block">Riders Active</span>
          <div className="text-2xl font-bold text-eg-ink mt-1">{riders.length} Couriers</div>
          <span className="text-[11px] text-eg-muted">{riders.length ? 'On the roster' : 'No riders added yet'}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-eg-line shadow-sm">
          <span className="text-xs text-eg-muted font-semibold uppercase tracking-wider block">Delayed Orders</span>
          <div className="text-2xl font-bold text-[#9A5B00] mt-1">0 Orders</div>
          <span className="text-[11px] text-eg-muted">{deliveries.length ? 'Active routes' : 'No active routes'}</span>
        </div>
      </div>

      {/* Grid: Active Deliveries & Live GPS Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active Deliveries List */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-eg-line shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-eg-line pb-3">
            <h2 className="text-lg font-bold text-eg-ink">Active Home Deliveries ({deliveries.length})</h2>
            <span className="text-xs text-eg-muted">Live GPS Telemetry</span>
          </div>

          <div className="space-y-3">
            {deliveries.map((del) => (
              <div key={del.id} className="p-4 rounded-xl bg-eg-paper border border-eg-line flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-eg-teal text-sm">{del.id}</span>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-eg-tint text-eg-teal">
                      {del.status}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-eg-ink mt-1">{del.patient}</h3>
                  <p className="text-xs text-eg-muted flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-eg-teal" />
                    <span>{del.address}</span>
                  </p>
                  <p className="text-[11px] text-eg-muted mt-0.5">Assigned: {del.rider} • Contact: {del.phone}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-eg-teal block">ETA: {del.eta}</span>
                  <button onClick={() => alert(`Pinged rider for ${del.id}`)} className="mt-2 px-3 py-1 bg-eg-ink text-white font-bold text-[10px] rounded-lg cursor-pointer">
                    Contact Rider
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live GPS Radar Visualizer Box */}
        <div className="bg-eg-ink text-white rounded-xl p-5 shadow-sm border border-eg-line/20 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-[#4FD1A5] animate-pulse" />
              <h3 className="font-bold text-sm text-white">Courier GPS Radar</h3>
            </div>
            <span className="text-[10px] text-[#4FD1A5] font-mono">LIVE DISPATCH</span>
          </div>

          <div className="w-full h-56 rounded-xl bg-[#0A1612] border border-white/10 relative overflow-hidden flex flex-col items-center justify-center p-4">
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
              <div className="w-44 h-44 rounded-full border border-[#4FD1A5]"></div>
              <div className="w-28 h-28 rounded-full border border-[#4FD1A5] absolute"></div>
            </div>
            <div className="relative z-10 text-center space-y-2">
              <div className="w-10 h-10 mx-auto rounded-full bg-eg-teal/30 border border-[#4FD1A5] flex items-center justify-center text-[#4FD1A5] animate-bounce">
                <Truck className="w-5 h-5" />
              </div>
              <span className="block text-sm text-gray-200 font-semibold">No active delivery</span>
              <span className="block text-[11px] text-gray-300">A rider appears here once an order is dispatched</span>
            </div>
          </div>

          <div className="text-[11px] text-gray-300 text-center">
            Delivery updates will appear here as they happen
          </div>
        </div>

      </div>

      {/* Grid: In-Store Pickup Queue & Riders Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* In-Store Pickup Queue */}
        <div className="bg-white rounded-xl border border-eg-line shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-eg-line pb-3">
            <h3 className="font-bold text-eg-ink text-sm flex items-center gap-2">
              <Store className="w-4 h-4 text-eg-teal" />
              <span>In-Store Patient Pickup Queue</span>
            </h3>
            <span className="text-xs text-eg-muted">Front-desk handoff</span>
          </div>

          <div className="space-y-3">
            {pickups.map((pk) => (
              <div key={pk.token} className="p-3.5 rounded-xl bg-eg-paper border border-eg-line flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-eg-teal text-sm">{pk.token}</span>
                    <span className="font-bold text-eg-ink">{pk.patient}</span>
                  </div>
                  <span className="text-eg-muted block">{pk.items} • {pk.time}</span>
                </div>
                <button
                  onClick={() => handleMarkPickedUp(pk.token)}
                  className="px-3.5 py-1.5 bg-eg-teal hover:bg-[#187E56] text-white font-bold text-xs rounded-lg transition cursor-pointer"
                >
                  Mark Picked Up
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery Partner Fleet Status */}
        <div className="bg-white rounded-xl border border-eg-line shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-eg-ink text-sm">Delivery Rider Roster</h3>
          <div className="space-y-3">
            {riders.map((r, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-eg-paper border border-eg-line flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-eg-ink">{r.name}</div>
                  <span className="text-eg-muted">{r.vehicle} • Completed today: {r.completedToday} orders</span>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-eg-tint text-eg-teal block">
                    {r.status}
                  </span>
                  <span className="text-[11px] text-eg-muted">{r.rating}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}


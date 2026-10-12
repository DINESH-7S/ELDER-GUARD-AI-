import React, { useEffect, useState } from 'react';
import { ShoppingBag, PackageCheck, AlertTriangle, Truck, IndianRupee, Clock, ArrowUpRight, Pill, RefreshCw } from 'lucide-react';
import doctorRecordsService from '../../services/doctorRecordsService';

export default function PharmacyOverviewPage({ currentUser, onNavigateTab }) {
  const [incomingOrders, setIncomingOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    doctorRecordsService.listPrescriptions()
      .then(rows => setIncomingOrders((rows || []).map((rx) => ({
        id: rx.id,
        patient: rx.patient || rx.elder_id || 'Linked elder',
        doctor: rx.doctor_id || 'Prescribing doctor',
        items: rx.medicine || 'Prescription item',
        time: rx.date || rx.created_at || '',
        status: rx.status || 'New',
        address: 'Address pending'
      }))))
      .catch(() => setIncomingOrders([]))
      .finally(() => setLoading(false));
  }, [currentUser?.id, currentUser?.user_id]);

  const stats = [
    { label: 'New Orders Today', value: `${incomingOrders.length}`, sub: 'From doctor prescriptions', trend: 'up', icon: ShoppingBag, color: 'text-eg-teal', bg: 'bg-eg-tint' },
    { label: 'Pending Fulfillment', value: `${incomingOrders.length} Orders`, sub: 'Database intake queue', trend: 'warning', icon: PackageCheck, color: 'text-[#9A5B00]', bg: 'bg-[#FEF6EC]' },
    { label: 'Low Stock SKUs', value: '0 Items', sub: 'No inventory records connected', trend: 'critical', icon: AlertTriangle, color: 'text-[#D6373F]', bg: 'bg-[#FDF2F2]' },
    { label: 'Deliveries In Transit', value: '0 Active', sub: 'No dispatch records connected', trend: 'up', icon: Truck, color: 'text-eg-teal', bg: 'bg-eg-tint' },
    { label: 'Revenue Today', value: '0', sub: 'No billing records connected', trend: 'up', icon: IndianRupee, color: 'text-eg-teal', bg: 'bg-eg-tint' }
  ];

  const activities = incomingOrders.map(order => ({ time: order.time, text: `E-Prescription ${order.id} received from doctor portal` }));

  return (
    <div className="space-y-6 font-sans text-eg-ink">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-eg-line shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-eg-ink tracking-tight">Pharmacy Operations Command</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-eg-tint text-eg-teal border border-[#4FD1A5]/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-eg-teal animate-pulse"></span>
              Live Retail Ops Active
            </span>
          </div>
          <p className="text-sm text-eg-muted mt-1">Real-time prescription fulfillment from database records.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={() => onNavigateTab('inventory')} className="px-4 py-2.5 rounded-xl bg-eg-tint hover:bg-[#d9ede2] text-eg-teal font-bold text-sm transition flex items-center gap-2 cursor-pointer">
            <Pill className="w-4 h-4" />
            <span>Check Inventory</span>
          </button>
          <button onClick={() => onNavigateTab('orders')} className="px-4 py-2.5 rounded-xl bg-eg-teal hover:bg-[#187E56] text-white font-bold text-sm transition shadow-sm flex items-center gap-2 cursor-pointer">
            <ShoppingBag className="w-4 h-4" />
            <span>Process Orders ({incomingOrders.length})</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((st, idx) => {
          const Icon = st.icon;
          return (
            <div key={idx} className="bg-white p-5 rounded-xl border border-eg-line shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-eg-muted uppercase tracking-wider">{st.label}</span>
                <div className={`p-2 rounded-lg ${st.bg} ${st.color}`}><Icon className="w-4 h-4" /></div>
              </div>
              <div>
                <div className="text-2xl font-bold text-eg-ink tracking-tight">{st.value}</div>
                <div className="text-xs text-eg-muted mt-1 font-medium flex items-center gap-1">
                  {st.trend === 'up' && <ArrowUpRight className="w-3.5 h-3.5 text-eg-teal" />}
                  {st.trend !== 'up' && <AlertTriangle className="w-3.5 h-3.5 text-[#9A5B00]" />}
                  <span>{st.sub}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-eg-line shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-eg-line pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-eg-tint text-eg-teal"><ShoppingBag className="w-5 h-5" /></div>
            <div>
              <h2 className="text-lg font-bold text-eg-ink">Incoming Order Fulfillment Queue</h2>
              <p className="text-xs text-eg-muted">Prescriptions routed to this pharmacy profile</p>
            </div>
          </div>
          <button onClick={() => onNavigateTab('orders')} className="text-xs font-bold text-eg-teal hover:text-[#187E56] flex items-center gap-1 cursor-pointer">View All Prescription Orders</button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-sm text-eg-muted">Loading pharmacy prescription intake...</div>
        ) : incomingOrders.length === 0 ? (
          <div className="text-center py-10 text-sm text-eg-muted">No prescriptions are routed to this pharmacy yet.</div>
        ) : (
          <div className="space-y-3">
            {incomingOrders.map((ord) => (
              <div key={ord.id} className="p-4 rounded-xl bg-eg-paper border border-eg-line flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono font-bold text-sm text-eg-teal">{ord.id}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-eg-tint text-eg-teal uppercase">{ord.status}</span>
                    <span className="text-xs text-eg-muted flex items-center gap-1"><Clock className="w-3.5 h-3.5" /><span>{ord.time}</span></span>
                  </div>
                  <h3 className="text-base font-bold text-eg-ink">{ord.patient}</h3>
                  <p className="text-xs text-eg-muted font-medium mt-0.5">Rx: <strong className="text-eg-ink">{ord.items}</strong></p>
                  <p className="text-[11px] text-eg-muted mt-0.5">Prescribed by: {ord.doctor} | Delivery to: {ord.address}</p>
                </div>
                <button onClick={() => onNavigateTab('orders')} className="px-4 py-2 rounded-xl bg-eg-teal hover:bg-[#187E56] text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer">
                  <PackageCheck className="w-4 h-4" />
                  <span>Process Fulfillment</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-eg-line shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-eg-line pb-3">
            <div className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-[#9A5B00]" /><h2 className="text-lg font-bold text-eg-ink">Stock & Reorder Alerts</h2></div>
            <button onClick={() => onNavigateTab('inventory')} className="text-xs font-bold text-eg-teal hover:underline cursor-pointer">Inventory Console</button>
          </div>
          <div className="text-center py-8 text-sm text-eg-muted">No inventory records are connected yet.</div>
        </div>

        <div className="bg-white rounded-xl border border-eg-line shadow-sm p-6 space-y-4">
          <div className="border-b border-eg-line pb-3 flex justify-between items-center">
            <h3 className="font-bold text-eg-ink text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4 text-eg-teal" /><span>Refills Due Today</span></h3>
            <span className="text-xs font-bold text-eg-teal bg-eg-tint px-2.5 py-0.5 rounded-full">0 Due</span>
          </div>
          <div className="text-center py-8 text-sm text-eg-muted">No refill subscriptions are connected yet.</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-eg-line shadow-sm p-6 space-y-3">
        <h3 className="font-bold text-eg-ink text-sm">Recent Operational Activity Log</h3>
        {activities.length === 0 ? (
          <div className="text-sm text-eg-muted">No pharmacy activity recorded yet.</div>
        ) : activities.map((act, idx) => (
          <div key={idx} className="flex gap-2.5 text-xs text-eg-muted"><span className="w-1.5 h-1.5 rounded-full bg-eg-teal mt-1.5 shrink-0"></span><div><span className="text-eg-ink font-medium">{act.text}</span><span className="text-[10px] text-eg-muted block">{act.time}</span></div></div>
        ))}
      </div>
    </div>
  );
}

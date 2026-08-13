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
    { label: 'New Orders Today', value: `${incomingOrders.length}`, sub: 'From doctor prescriptions', trend: 'up', icon: ShoppingBag, color: 'text-[#1E9E6B]', bg: 'bg-[#EAF5EF]' },
    { label: 'Pending Fulfillment', value: `${incomingOrders.length} Orders`, sub: 'Database intake queue', trend: 'warning', icon: PackageCheck, color: 'text-[#E8A03C]', bg: 'bg-[#FEF6EC]' },
    { label: 'Low Stock SKUs', value: '0 Items', sub: 'No inventory records connected', trend: 'critical', icon: AlertTriangle, color: 'text-[#D6373F]', bg: 'bg-[#FDF2F2]' },
    { label: 'Deliveries In Transit', value: '0 Active', sub: 'No dispatch records connected', trend: 'up', icon: Truck, color: 'text-[#1E9E6B]', bg: 'bg-[#EAF5EF]' },
    { label: 'Revenue Today', value: '0', sub: 'No billing records connected', trend: 'up', icon: IndianRupee, color: 'text-[#1E9E6B]', bg: 'bg-[#EAF5EF]' }
  ];

  const activities = incomingOrders.map(order => ({ time: order.time, text: `E-Prescription ${order.id} received from doctor portal` }));

  return (
    <div className="space-y-6 font-sans text-[#10221B]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-[#E1EDE6] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#10221B] tracking-tight">Pharmacy Operations Command</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EAF5EF] text-[#1E9E6B] border border-[#4FD1A5]/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#1E9E6B] animate-pulse"></span>
              Live Retail Ops Active
            </span>
          </div>
          <p className="text-sm text-[#5C6E64] mt-1">Real-time prescription fulfillment from database records.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={() => onNavigateTab('inventory')} className="px-4 py-2.5 rounded-xl bg-[#EAF5EF] hover:bg-[#d9ede2] text-[#1E9E6B] font-bold text-sm transition flex items-center gap-2 cursor-pointer">
            <Pill className="w-4 h-4" />
            <span>Check Inventory</span>
          </button>
          <button onClick={() => onNavigateTab('orders')} className="px-4 py-2.5 rounded-xl bg-[#1E9E6B] hover:bg-[#187E56] text-white font-bold text-sm transition shadow-sm flex items-center gap-2 cursor-pointer">
            <ShoppingBag className="w-4 h-4" />
            <span>Process Orders ({incomingOrders.length})</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((st, idx) => {
          const Icon = st.icon;
          return (
            <div key={idx} className="bg-white p-5 rounded-xl border border-[#E1EDE6] shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-[#5C6E64] uppercase tracking-wider">{st.label}</span>
                <div className={`p-2 rounded-lg ${st.bg} ${st.color}`}><Icon className="w-4 h-4" /></div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#10221B] tracking-tight">{st.value}</div>
                <div className="text-xs text-[#5C6E64] mt-1 font-medium flex items-center gap-1">
                  {st.trend === 'up' && <ArrowUpRight className="w-3.5 h-3.5 text-[#1E9E6B]" />}
                  {st.trend !== 'up' && <AlertTriangle className="w-3.5 h-3.5 text-[#E8A03C]" />}
                  <span>{st.sub}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-[#E1EDE6] shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E1EDE6] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#EAF5EF] text-[#1E9E6B]"><ShoppingBag className="w-5 h-5" /></div>
            <div>
              <h2 className="text-lg font-bold text-[#10221B]">Incoming Order Fulfillment Queue</h2>
              <p className="text-xs text-[#5C6E64]">Prescriptions routed to this pharmacy profile</p>
            </div>
          </div>
          <button onClick={() => onNavigateTab('orders')} className="text-xs font-bold text-[#1E9E6B] hover:text-[#187E56] flex items-center gap-1 cursor-pointer">View All Prescription Orders</button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-sm text-[#5C6E64]">Loading pharmacy prescription intake...</div>
        ) : incomingOrders.length === 0 ? (
          <div className="text-center py-10 text-sm text-[#5C6E64]">No prescriptions are routed to this pharmacy yet.</div>
        ) : (
          <div className="space-y-3">
            {incomingOrders.map((ord) => (
              <div key={ord.id} className="p-4 rounded-xl bg-[#F6FAF8] border border-[#E1EDE6] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono font-bold text-sm text-[#1E9E6B]">{ord.id}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EAF5EF] text-[#1E9E6B] uppercase">{ord.status}</span>
                    <span className="text-xs text-[#5C6E64] flex items-center gap-1"><Clock className="w-3.5 h-3.5" /><span>{ord.time}</span></span>
                  </div>
                  <h3 className="text-base font-bold text-[#10221B]">{ord.patient}</h3>
                  <p className="text-xs text-[#5C6E64] font-medium mt-0.5">Rx: <strong className="text-[#10221B]">{ord.items}</strong></p>
                  <p className="text-[11px] text-[#5C6E64] mt-0.5">Prescribed by: {ord.doctor} | Delivery to: {ord.address}</p>
                </div>
                <button onClick={() => onNavigateTab('orders')} className="px-4 py-2 rounded-xl bg-[#1E9E6B] hover:bg-[#187E56] text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer">
                  <PackageCheck className="w-4 h-4" />
                  <span>Process Fulfillment</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E1EDE6] shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E1EDE6] pb-3">
            <div className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-[#E8A03C]" /><h2 className="text-lg font-bold text-[#10221B]">Stock & Reorder Alerts</h2></div>
            <button onClick={() => onNavigateTab('inventory')} className="text-xs font-bold text-[#1E9E6B] hover:underline cursor-pointer">Inventory Console</button>
          </div>
          <div className="text-center py-8 text-sm text-[#5C6E64]">No inventory records are connected yet.</div>
        </div>

        <div className="bg-white rounded-xl border border-[#E1EDE6] shadow-sm p-6 space-y-4">
          <div className="border-b border-[#E1EDE6] pb-3 flex justify-between items-center">
            <h3 className="font-bold text-[#10221B] text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4 text-[#1E9E6B]" /><span>Refills Due Today</span></h3>
            <span className="text-xs font-bold text-[#1E9E6B] bg-[#EAF5EF] px-2.5 py-0.5 rounded-full">0 Due</span>
          </div>
          <div className="text-center py-8 text-sm text-[#5C6E64]">No refill subscriptions are connected yet.</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#E1EDE6] shadow-sm p-6 space-y-3">
        <h3 className="font-bold text-[#10221B] text-sm">Recent Operational Activity Log</h3>
        {activities.length === 0 ? (
          <div className="text-sm text-[#5C6E64]">No pharmacy activity recorded yet.</div>
        ) : activities.map((act, idx) => (
          <div key={idx} className="flex gap-2.5 text-xs text-[#5C6E64]"><span className="w-1.5 h-1.5 rounded-full bg-[#1E9E6B] mt-1.5 shrink-0"></span><div><span className="text-[#10221B] font-medium">{act.text}</span><span className="text-[10px] text-[#5C6E64] block">{act.time}</span></div></div>
        ))}
      </div>
    </div>
  );
}

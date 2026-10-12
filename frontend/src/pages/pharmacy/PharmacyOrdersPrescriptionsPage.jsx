import React, { useEffect, useMemo, useState } from 'react';
import { ShoppingBag, Search, CheckSquare, Square, X, Printer, AlertCircle } from 'lucide-react';
import doctorRecordsService from '../../services/doctorRecordsService';

function prescriptionToOrder(rx) {
  return {
    id: rx.id,
    patientName: rx.patient || rx.elder_id || 'Linked elder',
    age: '--',
    doctor: rx.doctor_id || 'Prescribing doctor',
    date: rx.date || rx.created_at || '',
    status: rx.status || 'New',
    totalAmount: 'Pending',
    address: 'Address pending',
    paymentStatus: 'Pending',
    avatar: '',
    medicines: [
      {
        name: rx.medicine || 'Prescription item',
        qty: 1,
        dosage: rx.sig || 'As prescribed',
        picked: false,
      },
    ],
  };
}

export default function PharmacyOrdersPrescriptionsPage({ currentUser }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedOrderModal, setSelectedOrderModal] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    doctorRecordsService.listPrescriptions()
      .then(rows => setOrders((rows || []).map(prescriptionToOrder)))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [currentUser?.id, currentUser?.user_id]);

  const incomingIntake = useMemo(() => orders.filter(order => String(order.status || '').toLowerCase().includes('active') || String(order.status || '').toLowerCase() === 'new'), [orders]);

  const toggleSelectOrder = (id) => {
    setSelectedOrders(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBulkMarkReady = () => {
    setOrders(prev => prev.map(o => selectedOrders.includes(o.id) ? { ...o, status: 'Ready' } : o));
    alert(`Marked ${selectedOrders.length} orders as Ready for Dispatch!`);
    setSelectedOrders([]);
  };

  const toggleMedicinePicked = (orderId, medIndex) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const updatedMeds = [...o.medicines];
        updatedMeds[medIndex].picked = !updatedMeds[medIndex].picked;
        return { ...o, medicines: updatedMeds };
      }
      return o;
    }));
  };

  const filteredOrders = orders.filter(o => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = o.patientName.toLowerCase().includes(query) || o.id.toLowerCase().includes(query);
    const matchesStatus = selectedStatus === 'All' || String(o.status || '').toLowerCase() === selectedStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 font-sans text-eg-ink">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-eg-line shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-eg-ink tracking-tight">Prescription Orders & Fulfillment</h1>
          <p className="text-sm text-eg-muted mt-1">Intake e-prescriptions from the database, verify dosage, pack items, and print shipping labels.</p>
        </div>
        {selectedOrders.length > 0 && (
          <div className="flex items-center gap-3 bg-eg-tint p-2 rounded-xl border border-[#4FD1A5]/40 shrink-0">
            <span className="text-xs font-bold text-eg-teal">{selectedOrders.length} Selected</span>
            <button onClick={handleBulkMarkReady} className="px-3 py-1.5 rounded-lg bg-eg-teal hover:bg-[#187E56] text-white text-xs font-bold cursor-pointer">Mark Selected as Ready</button>
          </div>
        )}
      </div>

      {incomingIntake.length > 0 && (
        <div className="bg-[#FEF6EC] border border-[#E8A03C]/40 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#9A5B00]"><AlertCircle className="w-5 h-5" /><h3 className="font-bold text-xs uppercase tracking-wider text-eg-ink">Incoming Doctor Prescriptions Intake</h3></div>
            <span className="text-xs font-bold bg-[#9A5B00] text-white px-2.5 py-0.5 rounded-full">{incomingIntake.length} New</span>
          </div>
          {incomingIntake.slice(0, 3).map((intake) => (
            <div key={intake.id} className="bg-white p-3.5 rounded-xl border border-[#E8A03C]/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
              <div>
                <span className="font-bold text-eg-ink">{intake.patientName}</span> | <span className="text-eg-muted">{intake.medicines.map(m => m.name).join(', ')}</span>
                <span className="text-[11px] text-eg-muted block">Prescribed by {intake.doctor} | {intake.date}</span>
              </div>
              <button onClick={() => setOrders(prev => prev.map(o => o.id === intake.id ? { ...o, status: 'Preparing' } : o))} className="px-3.5 py-1.5 bg-eg-teal text-white rounded-lg font-bold text-xs cursor-pointer">Verify & Approve Intake</button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white p-5 rounded-xl border border-eg-line shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-eg-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Search order ID or patient name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-xl bg-eg-paper border border-eg-line text-sm focus:outline-none focus:border-eg-teal" />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            <span className="text-xs font-semibold text-eg-muted">Status:</span>
            {['All', 'New', 'Preparing', 'Ready', 'Dispatched'].map((st) => (
              <button key={st} onClick={() => setSelectedStatus(st)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${selectedStatus === st ? 'bg-eg-teal text-white' : 'bg-eg-paper text-eg-muted hover:bg-eg-tint'}`}>{st}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-eg-line shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-eg-paper border-b border-eg-line text-xs font-semibold text-eg-muted uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 w-10">Select</th>
                <th className="py-3.5 px-4">Order ID & Patient</th>
                <th className="py-3.5 px-4">Prescribing Doctor</th>
                <th className="py-3.5 px-4">Medicines Summary</th>
                <th className="py-3.5 px-4">Order Date</th>
                <th className="py-3.5 px-4">Fulfillment Status</th>
                <th className="py-3.5 px-4">Total Price</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-eg-line">
              {loading ? (
                <tr><td colSpan="8" className="py-10 text-center text-sm text-eg-muted">Loading prescription orders from database...</td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan="8" className="py-10 text-center text-sm text-eg-muted">No prescription orders found for this pharmacy.</td></tr>
              ) : filteredOrders.map((ord) => {
                const isSelected = selectedOrders.includes(ord.id);
                return (
                  <tr key={ord.id} className="hover:bg-eg-paper/80 transition">
                    <td className="py-4 px-4"><input type="checkbox" aria-label={`Select order ${ord.id}`} checked={isSelected} onChange={() => toggleSelectOrder(ord.id)} className="w-4 h-4 accent-eg-teal cursor-pointer" /></td>
                    <td className="py-4 px-4"><div><div className="font-bold text-eg-ink hover:text-eg-teal cursor-pointer" onClick={() => setSelectedOrderModal(ord)}>{ord.patientName}</div><span className="font-mono text-xs text-eg-teal font-bold">{ord.id}</span></div></td>
                    <td className="py-4 px-4 text-eg-ink font-medium text-xs">{ord.doctor}</td>
                    <td className="py-4 px-4 text-xs text-eg-muted max-w-xs truncate">{ord.medicines.map(m => m.name).join(', ')} ({ord.medicines.length} items)</td>
                    <td className="py-4 px-4 text-xs text-eg-muted">{ord.date}</td>
                    <td className="py-4 px-4"><span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-eg-tint text-eg-teal">{ord.status}</span></td>
                    <td className="py-4 px-4 font-bold text-eg-ink">{ord.totalAmount}</td>
                    <td className="py-4 px-6 text-right"><button onClick={() => setSelectedOrderModal(ord)} className="px-3 py-1.5 rounded-lg bg-eg-tint hover:bg-[#d9ede2] text-eg-teal font-bold text-xs transition cursor-pointer">Inspect Rx</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/50  flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-eg-line max-w-2xl w-full p-6 space-y-6 shadow-sm">
            <div className="flex items-start justify-between border-b border-eg-line pb-4">
              <div>
                <div className="flex items-center gap-2"><span className="font-mono font-bold text-lg text-eg-teal">{selectedOrderModal.id}</span><span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-eg-tint text-eg-teal">{selectedOrderModal.status}</span></div>
                <h3 className="text-xl font-bold text-eg-ink mt-1">{selectedOrderModal.patientName}</h3>
                <p className="text-xs text-eg-muted">Prescribed by: {selectedOrderModal.doctor} | Payment: {selectedOrderModal.paymentStatus}</p>
              </div>
              <button onClick={() => setSelectedOrderModal(null)} className="p-2 rounded-lg bg-eg-paper text-eg-muted"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-eg-ink">Prescription Item Picking Checklist</h4>
              {selectedOrderModal.medicines.map((med, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-eg-paper border border-eg-line flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleMedicinePicked(selectedOrderModal.id, idx)} className="cursor-pointer">{med.picked ? <CheckSquare className="w-5 h-5 text-eg-teal" /> : <Square className="w-5 h-5 text-eg-muted" />}</button>
                    <div><div className={`font-bold text-sm ${med.picked ? 'line-through text-eg-muted' : 'text-eg-ink'}`}>{med.name} (Qty: {med.qty})</div><div className="text-xs text-eg-muted">Dosage instruction: {med.dosage}</div></div>
                  </div>
                  <span className="text-xs font-bold text-eg-teal">{med.picked ? 'Picked' : 'To Pick'}</span>
                </div>
              ))}
            </div>

            <div className="p-3.5 rounded-xl bg-eg-paper border border-eg-line text-xs space-y-1"><span className="font-bold text-eg-ink block">Delivery Location</span><span className="text-eg-muted">{selectedOrderModal.address}</span></div>

            <div className="pt-4 border-t border-eg-line flex justify-between items-center">
              <button onClick={() => alert(`Printed shipping label for ${selectedOrderModal.id}`)} className="px-4 py-2 rounded-xl bg-eg-paper border border-eg-line text-eg-ink font-bold text-xs flex items-center gap-1.5"><Printer className="w-4 h-4" /><span>Print Shipping Label</span></button>
              <div className="flex gap-2"><button onClick={() => setSelectedOrderModal(null)} className="px-4 py-2 rounded-xl bg-eg-paper text-eg-muted text-xs font-bold">Close</button><button onClick={() => { setOrders(prev => prev.map(o => o.id === selectedOrderModal.id ? { ...o, status: 'Ready' } : o)); setSelectedOrderModal(null); }} className="px-4 py-2 rounded-xl bg-eg-teal text-white text-xs font-bold shadow-sm">Complete Order Packing</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

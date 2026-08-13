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
    <div className="space-y-6 font-sans text-[#10221B]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-[#E1EDE6] shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-[#10221B] tracking-tight">Prescription Orders & Fulfillment</h1>
          <p className="text-sm text-[#5C6E64] mt-1">Intake e-prescriptions from the database, verify dosage, pack items, and print shipping labels.</p>
        </div>
        {selectedOrders.length > 0 && (
          <div className="flex items-center gap-3 bg-[#EAF5EF] p-2 rounded-xl border border-[#4FD1A5]/40 shrink-0">
            <span className="text-xs font-bold text-[#1E9E6B]">{selectedOrders.length} Selected</span>
            <button onClick={handleBulkMarkReady} className="px-3 py-1.5 rounded-lg bg-[#1E9E6B] hover:bg-[#187E56] text-white text-xs font-bold cursor-pointer">Mark Selected as Ready</button>
          </div>
        )}
      </div>

      {incomingIntake.length > 0 && (
        <div className="bg-[#FEF6EC] border border-[#E8A03C]/40 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#E8A03C]"><AlertCircle className="w-5 h-5" /><h3 className="font-bold text-xs uppercase tracking-wider text-[#10221B]">Incoming Doctor Prescriptions Intake</h3></div>
            <span className="text-xs font-bold bg-[#E8A03C] text-white px-2.5 py-0.5 rounded-full">{incomingIntake.length} New</span>
          </div>
          {incomingIntake.slice(0, 3).map((intake) => (
            <div key={intake.id} className="bg-white p-3.5 rounded-xl border border-[#E8A03C]/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
              <div>
                <span className="font-bold text-[#10221B]">{intake.patientName}</span> | <span className="text-[#5C6E64]">{intake.medicines.map(m => m.name).join(', ')}</span>
                <span className="text-[11px] text-[#5C6E64] block">Prescribed by {intake.doctor} | {intake.date}</span>
              </div>
              <button onClick={() => setOrders(prev => prev.map(o => o.id === intake.id ? { ...o, status: 'Preparing' } : o))} className="px-3.5 py-1.5 bg-[#1E9E6B] text-white rounded-lg font-bold text-xs cursor-pointer">Verify & Approve Intake</button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white p-5 rounded-xl border border-[#E1EDE6] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-[#5C6E64] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Search order ID or patient name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#F6FAF8] border border-[#E1EDE6] text-sm focus:outline-none focus:border-[#1E9E6B]" />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            <span className="text-xs font-semibold text-[#5C6E64]">Status:</span>
            {['All', 'New', 'Preparing', 'Ready', 'Dispatched'].map((st) => (
              <button key={st} onClick={() => setSelectedStatus(st)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${selectedStatus === st ? 'bg-[#1E9E6B] text-white' : 'bg-[#F6FAF8] text-[#5C6E64] hover:bg-[#EAF5EF]'}`}>{st}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#E1EDE6] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F6FAF8] border-b border-[#E1EDE6] text-xs font-semibold text-[#5C6E64] uppercase tracking-wider">
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
            <tbody className="divide-y divide-[#E1EDE6]">
              {loading ? (
                <tr><td colSpan="8" className="py-10 text-center text-sm text-[#5C6E64]">Loading prescription orders from database...</td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan="8" className="py-10 text-center text-sm text-[#5C6E64]">No prescription orders found for this pharmacy.</td></tr>
              ) : filteredOrders.map((ord) => {
                const isSelected = selectedOrders.includes(ord.id);
                return (
                  <tr key={ord.id} className="hover:bg-[#F6FAF8]/80 transition">
                    <td className="py-4 px-4"><input type="checkbox" checked={isSelected} onChange={() => toggleSelectOrder(ord.id)} className="w-4 h-4 accent-[#1E9E6B] cursor-pointer" /></td>
                    <td className="py-4 px-4"><div><div className="font-bold text-[#10221B] hover:text-[#1E9E6B] cursor-pointer" onClick={() => setSelectedOrderModal(ord)}>{ord.patientName}</div><span className="font-mono text-xs text-[#1E9E6B] font-bold">{ord.id}</span></div></td>
                    <td className="py-4 px-4 text-[#10221B] font-medium text-xs">{ord.doctor}</td>
                    <td className="py-4 px-4 text-xs text-[#5C6E64] max-w-xs truncate">{ord.medicines.map(m => m.name).join(', ')} ({ord.medicines.length} items)</td>
                    <td className="py-4 px-4 text-xs text-[#5C6E64]">{ord.date}</td>
                    <td className="py-4 px-4"><span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-[#EAF5EF] text-[#1E9E6B]">{ord.status}</span></td>
                    <td className="py-4 px-4 font-bold text-[#10221B]">{ord.totalAmount}</td>
                    <td className="py-4 px-6 text-right"><button onClick={() => setSelectedOrderModal(ord)} className="px-3 py-1.5 rounded-lg bg-[#EAF5EF] hover:bg-[#d9ede2] text-[#1E9E6B] font-bold text-xs transition cursor-pointer">Inspect Rx</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E1EDE6] max-w-2xl w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#E1EDE6] pb-4">
              <div>
                <div className="flex items-center gap-2"><span className="font-mono font-bold text-lg text-[#1E9E6B]">{selectedOrderModal.id}</span><span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EAF5EF] text-[#1E9E6B]">{selectedOrderModal.status}</span></div>
                <h3 className="text-xl font-bold text-[#10221B] mt-1">{selectedOrderModal.patientName}</h3>
                <p className="text-xs text-[#5C6E64]">Prescribed by: {selectedOrderModal.doctor} | Payment: {selectedOrderModal.paymentStatus}</p>
              </div>
              <button onClick={() => setSelectedOrderModal(null)} className="p-2 rounded-lg bg-[#F6FAF8] text-[#5C6E64]"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#10221B]">Prescription Item Picking Checklist</h4>
              {selectedOrderModal.medicines.map((med, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-[#F6FAF8] border border-[#E1EDE6] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleMedicinePicked(selectedOrderModal.id, idx)} className="cursor-pointer">{med.picked ? <CheckSquare className="w-5 h-5 text-[#1E9E6B]" /> : <Square className="w-5 h-5 text-[#5C6E64]" />}</button>
                    <div><div className={`font-bold text-sm ${med.picked ? 'line-through text-[#5C6E64]' : 'text-[#10221B]'}`}>{med.name} (Qty: {med.qty})</div><div className="text-xs text-[#5C6E64]">Dosage instruction: {med.dosage}</div></div>
                  </div>
                  <span className="text-xs font-bold text-[#1E9E6B]">{med.picked ? 'Picked' : 'To Pick'}</span>
                </div>
              ))}
            </div>

            <div className="p-3.5 rounded-xl bg-[#F6FAF8] border border-[#E1EDE6] text-xs space-y-1"><span className="font-bold text-[#10221B] block">Delivery Location</span><span className="text-[#5C6E64]">{selectedOrderModal.address}</span></div>

            <div className="pt-4 border-t border-[#E1EDE6] flex justify-between items-center">
              <button onClick={() => alert(`Printed shipping label for ${selectedOrderModal.id}`)} className="px-4 py-2 rounded-xl bg-[#F6FAF8] border border-[#E1EDE6] text-[#10221B] font-bold text-xs flex items-center gap-1.5"><Printer className="w-4 h-4" /><span>Print Shipping Label</span></button>
              <div className="flex gap-2"><button onClick={() => setSelectedOrderModal(null)} className="px-4 py-2 rounded-xl bg-[#F6FAF8] text-[#5C6E64] text-xs font-bold">Close</button><button onClick={() => { setOrders(prev => prev.map(o => o.id === selectedOrderModal.id ? { ...o, status: 'Ready' } : o)); setSelectedOrderModal(null); }} className="px-4 py-2 rounded-xl bg-[#1E9E6B] text-white text-xs font-bold shadow-sm">Complete Order Packing</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

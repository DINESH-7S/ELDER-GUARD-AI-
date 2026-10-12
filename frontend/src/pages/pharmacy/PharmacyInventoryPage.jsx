import React, { useState } from 'react';
import { 
  Store, 
  Search, 
  Plus, 
  QrCode, 
  AlertTriangle, 
  Clock, 
  X, 
  CheckCircle2, 
  Pill, 
  RefreshCw, 
  Tag, 
  Package,
  ChevronRight
} from 'lucide-react';

export default function PharmacyInventoryPage({ onNavigateTab }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  // Initial Inventory Stock Data (starts empty for manual addition)
  const [inventory, setInventory] = useState([]);

  // Form State for Adding Medicine
  const [newMedForm, setNewMedForm] = useState({
    name: '',
    category: 'Diabetes Care',
    stock: '',
    unitPrice: '',
    supplier: ''
  });

  const handleAddMedicine = (e) => {
    e.preventDefault();
    if (!newMedForm.name) return;

    const newMed = {
      id: `MED-${Math.floor(200 + Math.random() * 800)}`,
      name: newMedForm.name,
      category: newMedForm.category,
      stock: parseInt(newMedForm.stock || 0),
      maxStock: 150,
      unitPrice: `$${newMedForm.unitPrice || '15.00'}`,
      expiry: 'Dec 2027',
      daysToExpiry: 360,
      supplier: newMedForm.supplier,
      status: 'Optimal'
    };

    setInventory([newMed, ...inventory]);
    setShowAddMedModal(false);
    setNewMedForm({ name: '', category: 'Diabetes Care', stock: '', unitPrice: '', supplier: '' });
  };

  const filteredInventory = inventory.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          i.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'All' || i.category.toLowerCase().includes(selectedCategory.toLowerCase());
    return matchesSearch && matchesCat;
  });

  // Expiry tracker subset
  const expiringSoonList = inventory.filter(i => i.daysToExpiry <= 60);

  return (
    <div className="space-y-6 font-sans text-eg-ink">
      
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-eg-line shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-eg-ink tracking-tight">Pharmaceutical Inventory Console</h1>
          <p className="text-sm text-eg-muted mt-1">
            Track live SKU counts, reorder thresholds, batch expiry schedules, and barcode cataloging.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setShowBarcodeScanner(true)}
            className="px-3.5 py-2 rounded-xl bg-eg-paper border border-eg-line hover:bg-eg-tint text-eg-ink font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-eg-teal" />
            <span>Scan Barcode / QR</span>
          </button>
          <button
            onClick={() => setShowAddMedModal(true)}
            className="px-4 py-2 rounded-xl bg-eg-teal hover:bg-[#187E56] text-white font-bold text-sm transition shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Medicine SKU</span>
          </button>
        </div>
      </div>

      {/* Stat Strip Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-eg-line shadow-sm">
          <span className="text-xs text-eg-muted font-semibold uppercase tracking-wider block">Total Active SKUs</span>
          <div className="text-2xl font-bold text-eg-ink mt-1">{inventory.length} Items</div>
          <span className="text-[11px] text-eg-muted font-medium">{inventory.length ? 'In your catalog' : 'No catalog items yet'}</span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-eg-line shadow-sm">
          <span className="text-xs text-eg-muted font-semibold uppercase tracking-wider block">Low Stock Items</span>
          <div className="text-2xl font-bold text-[#9A5B00] mt-1">0 SKUs</div>
          <span className="text-[11px] text-eg-muted">Below reorder threshold</span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-eg-line shadow-sm">
          <span className="text-xs text-eg-muted font-semibold uppercase tracking-wider block">Expiring Within 60 Days</span>
          <div className="text-2xl font-bold text-[#9A5B00] mt-1">{expiringSoonList.length} Batches</div>
          <span className="text-[11px] text-eg-muted">Flagged for clearance</span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-eg-line shadow-sm">
          <span className="text-xs text-eg-muted font-semibold uppercase tracking-wider block">Out of Stock SKUs</span>
          <div className="text-2xl font-bold text-[#D6373F] mt-1">0 Items</div>
          <span className="text-[11px] text-eg-muted font-medium">Nothing out of stock</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-5 rounded-xl border border-eg-line shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-eg-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search medicine name, SKU ID, or supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-eg-paper border border-eg-line text-sm focus:outline-none focus:border-eg-teal"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            <span className="text-xs font-semibold text-eg-muted">Category:</span>
            {['All', 'Diabetes Care', 'Cardiovascular', 'Neurology', 'Bone Health'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                  selectedCategory === cat ? 'bg-eg-teal text-white' : 'bg-eg-paper text-eg-muted hover:bg-eg-tint'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Main Inventory Table */}
      <div className="bg-white rounded-xl border border-eg-line shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-eg-paper border-b border-eg-line text-xs font-semibold text-eg-muted uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6">SKU Code & Medicine Name</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Stock Level (Visual Progress)</th>
                <th className="py-3.5 px-4">Unit Price</th>
                <th className="py-3.5 px-4">Batch Expiry</th>
                <th className="py-3.5 px-4">Primary Supplier</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-eg-line">
              {filteredInventory.map((item) => {
                const percent = Math.round((item.stock / item.maxStock) * 100);
                const isLow = item.stock <= 45;
                const isOutOfStock = item.stock === 0;

                return (
                  <tr key={item.id} className="hover:bg-eg-paper/80 transition">
                    <td className="py-4 px-6">
                      <div className="font-bold text-eg-ink">{item.name}</div>
                      <span className="font-mono text-xs text-eg-teal font-bold">{item.id}</span>
                    </td>
                    <td className="py-4 px-4 text-xs font-semibold text-eg-muted">
                      {item.category}
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-1 w-44">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-eg-ink">{item.stock} Units</span>
                          <span className="text-[10px] text-eg-muted">{percent}%</span>
                        </div>
                        <div className="w-full h-2 bg-eg-line rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              isOutOfStock ? 'bg-[#D6373F]' : isLow ? 'bg-[#E8A03C]' : 'bg-eg-teal'
                            }`}
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-bold text-eg-ink">
                      {item.unitPrice}
                    </td>
                    <td className="py-4 px-4 text-xs">
                      <span className={`font-semibold ${item.daysToExpiry <= 60 ? 'text-[#9A5B00] font-bold' : 'text-eg-muted'}`}>
                        {item.expiry} ({item.daysToExpiry} days)
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs text-eg-muted">
                      {item.supplier}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => alert(`Reorder PO sent to ${item.supplier} for ${item.name}`)}
                        className="px-3 py-1.5 rounded-lg bg-eg-tint hover:bg-[#d9ede2] text-eg-teal font-bold text-xs transition cursor-pointer"
                      >
                        Reorder Stock
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expiry Tracker Section */}
      <div className="bg-white rounded-xl border border-eg-line shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-eg-line pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#9A5B00]" />
            <h2 className="text-lg font-bold text-eg-ink">Batch Expiry Watchlist</h2>
          </div>
          <span className="text-xs text-eg-muted">Sorted by closest expiry date</span>
        </div>

        <div className="space-y-3">
          {expiringSoonList.map((exp, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-[#FEF6EC] border border-[#E8A03C]/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
              <div>
                <span className="font-bold text-eg-ink">{exp.name}</span> (SKU: {exp.id})
                <span className="text-eg-muted block">Batch expires in {exp.daysToExpiry} days ({exp.expiry}) • {exp.stock} units remaining</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => alert(`Marked for clearance sale: ${exp.name}`)} className="px-3 py-1 bg-[#E8A03C] text-white font-bold rounded-lg cursor-pointer">
                  Mark for Clearance
                </button>
                <button onClick={() => alert(`Return request sent to ${exp.supplier}`)} className="px-3 py-1 bg-white border border-eg-line text-eg-ink font-bold rounded-lg cursor-pointer">
                  Return to Supplier
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Barcode Scanner Modal Simulation */}
      {showBarcodeScanner && (
        <div className="fixed inset-0 z-50 bg-black/50  flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-eg-line max-w-md w-full p-6 space-y-4 shadow-sm text-center">
            <div className="flex justify-between items-center border-b border-eg-line pb-3">
              <h3 className="font-bold text-eg-ink">Barcode / QR Scan Simulation</h3>
              <button onClick={() => setShowBarcodeScanner(false)} className="text-eg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="w-full h-48 bg-eg-ink rounded-xl flex flex-col items-center justify-center text-white space-y-2 relative overflow-hidden">
              <div className="w-40 h-0.5 bg-[#4FD1A5] animate-pulse"></div>
              <QrCode className="w-12 h-12 text-[#4FD1A5]" />
              <span className="text-xs font-mono text-[#4FD1A5]">SCANNING SKU BARCODE...</span>
            </div>
            <button 
              onClick={() => {
                setShowBarcodeScanner(false);
                alert('Scanned SKU MED-101: Metformin ER 500mg. Stock count updated!');
              }}
              className="w-full py-2.5 bg-eg-teal text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              Simulate Scanned Product (Metformin ER)
            </button>
          </div>
        </div>
      )}

      {/* Add New Medicine Modal */}
      {showAddMedModal && (
        <div className="fixed inset-0 z-50 bg-black/50  flex items-center justify-center p-4">
          <form onSubmit={handleAddMedicine} className="bg-white rounded-2xl border border-eg-line max-w-lg w-full p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-eg-line pb-3">
              <h3 className="text-lg font-bold text-eg-ink">Add New Pharmaceutical SKU</h3>
              <button type="button" onClick={() => setShowAddMedModal(false)} className="text-eg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-eg-ink block mb-1">Medicine Name & Strength</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Omeprazole 20mg Caps" 
                  value={newMedForm.name}
                  onChange={(e) => setNewMedForm({ ...newMedForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-eg-line bg-eg-paper text-sm focus:outline-none focus:border-eg-teal"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-eg-ink block mb-1">Category</label>
                  <select 
                    value={newMedForm.category}
                    onChange={(e) => setNewMedForm({ ...newMedForm, category: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-eg-line bg-eg-paper text-sm focus:outline-none focus:border-eg-teal"
                  >
                    <option value="Diabetes Care">Diabetes Care</option>
                    <option value="Cardiovascular">Cardiovascular</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Bone Health">Bone Health</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-eg-ink block mb-1">Initial Stock Count</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 100" 
                    value={newMedForm.stock}
                    onChange={(e) => setNewMedForm({ ...newMedForm, stock: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-eg-line bg-eg-paper text-sm focus:outline-none focus:border-eg-teal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-eg-ink block mb-1">Unit Selling Price ($)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 14.50" 
                    value={newMedForm.unitPrice}
                    onChange={(e) => setNewMedForm({ ...newMedForm, unitPrice: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-eg-line bg-eg-paper text-sm focus:outline-none focus:border-eg-teal"
                  />
                </div>
                <div>
                  <label className="font-bold text-eg-ink block mb-1">Primary Supplier</label>
                  <input
                    type="text"
                    value={newMedForm.supplier}
                    onChange={(e) => setNewMedForm({ ...newMedForm, supplier: e.target.value })}
                    placeholder="Enter supplier name"
                    className="w-full p-2.5 rounded-xl border border-eg-line bg-eg-paper text-sm focus:outline-none focus:border-eg-teal"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-eg-line flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setShowAddMedModal(false)}
                className="px-4 py-2 rounded-xl bg-eg-paper text-eg-muted font-bold text-xs"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-4 py-2 rounded-xl bg-eg-teal text-white font-bold text-xs"
              >
                Add SKU to Catalog
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}


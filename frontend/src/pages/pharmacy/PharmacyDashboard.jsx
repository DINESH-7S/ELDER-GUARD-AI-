import React, { useState } from 'react';
import { 
  Store, 
  Search, 
  Bell, 
  Pill, 
  Truck, 
  Users, 
  Settings, 
  Home, 
  ShoppingBag,
  X,
  CheckCircle2,
  Clock
} from 'lucide-react';

import PharmacyOverviewPage from './PharmacyOverviewPage';
import PharmacyOrdersPrescriptionsPage from './PharmacyOrdersPrescriptionsPage';
import PharmacyInventoryPage from './PharmacyInventoryPage';
import PharmacyDeliveryPage from './PharmacyDeliveryPage';
import PharmacySubscriptionsPage from './PharmacySubscriptionsPage';
import PharmacySettingsPage from './PharmacySettingsPage';

export default function PharmacyDashboard({ currentUser, activeTab = 'overview', onNavigateTab, onLogout }) {
  const [internalTab, setInternalTab] = useState(activeTab || 'overview');
  const [globalSearch, setGlobalSearch] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  const currentTab = onNavigateTab ? activeTab : internalTab;

  const handleTabChange = (tabId) => {
    if (onNavigateTab) {
      onNavigateTab(tabId);
    } else {
      setInternalTab(tabId);
    }
  };

  // Navigation tabs for Pharmacy Portal (Fresh Mint Retail)
  const tabs = [
    { id: 'overview', label: 'Overview Dashboard', icon: Home },
    { id: 'orders', label: 'Orders & Prescriptions', icon: Pill, badge: null },
    { id: 'inventory', label: 'Inventory Management', icon: Store },
    { id: 'delivery', label: 'Delivery & Dispatch', icon: Truck },
    { id: 'subscriptions', label: 'Patients & Subscriptions', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  // Pharmacy notifications list
  const notificationsList = [];

  // Page view switcher
  const renderCurrentPage = () => {
    switch (currentTab) {
      case 'overview':
      case 'home':
        return <PharmacyOverviewPage currentUser={currentUser} onNavigateTab={handleTabChange} />;
      case 'orders':
      case 'fulfillment':
        return <PharmacyOrdersPrescriptionsPage currentUser={currentUser} onNavigateTab={handleTabChange} />;
      case 'inventory':
        return <PharmacyInventoryPage onNavigateTab={handleTabChange} />;
      case 'delivery':
        return <PharmacyDeliveryPage onNavigateTab={handleTabChange} />;
      case 'subscriptions':
        return <PharmacySubscriptionsPage onNavigateTab={handleTabChange} />;
      case 'settings':
        return <PharmacySettingsPage currentUser={currentUser} onLogout={onLogout} />;
      default:
        return <PharmacyOverviewPage currentUser={currentUser} onNavigateTab={handleTabChange} />;
    }
  };

  return (
    <div className="space-y-6 bg-eg-paper text-eg-ink min-h-screen font-sans pb-12">
      
      {/* Top Bar Header */}
      <div className="bg-white border border-eg-line rounded-2xl p-4 md:p-5 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-4 sticky top-0 z-20">
        
        {/* Left: Search Box */}
        <div className="relative w-full lg:w-96">
          <Search className="w-4 h-4 text-eg-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search Orders, Medicines, Patients, SKUs..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-eg-paper border border-eg-line text-sm focus:outline-none focus:border-eg-teal placeholder-eg-muted"
          />
        </div>

        {/* Right: Order Status Badge, Bell, Profile */}
        <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-end">
          
          {/* Active Orders Shortcut */}
          <button
            onClick={() => handleTabChange('orders')}
            className="px-3.5 py-1.5 rounded-xl bg-eg-tint border border-[#4FD1A5]/40 text-eg-teal font-bold text-xs flex items-center gap-2 hover:bg-eg-tint/80 transition cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-eg-teal animate-pulse"></span>
            <span>ORDERS</span>
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label="Notifications" className="p-2.5 rounded-xl bg-eg-paper border border-eg-line hover:bg-eg-tint text-eg-ink transition relative cursor-pointer"
            >
              <Bell className="w-5 h-5 text-eg-teal" />
            </button>

            {/* Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-2xl border border-eg-line shadow-sm p-4 space-y-3 z-50">
                <div className="flex items-center justify-between border-b border-eg-line pb-2">
                  <h4 className="font-bold text-sm text-eg-ink">Pharmacy Notifications</h4>
                  <button onClick={() => setShowNotifications(false)} className="text-eg-muted hover:text-eg-ink">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {notificationsList.map((n) => (
                    <div key={n.id} className="p-2.5 rounded-xl bg-eg-paper border border-eg-line text-xs">
                      <p className="font-bold text-eg-ink">{n.text}</p>
                      <span className="text-[10px] text-eg-muted">{n.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Profile Header */}
          <div className="flex items-center gap-3 pl-3 border-l border-eg-line">
            <div className="w-9 h-9 rounded-xl bg-eg-teal text-white flex items-center justify-center font-bold text-sm shadow-sm">
              AP
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-sm text-eg-ink block leading-tight">
                {currentUser?.name || currentUser?.email || 'Pharmacy'}
              </span>
              <span className="text-[11px] text-eg-teal font-semibold block">
                Connected pharmacy account
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* Top Tab Bar for quick page navigation */}
      <div className="lg:hidden bg-white border border-eg-line rounded-2xl p-2 shadow-sm flex items-center gap-1.5 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id || (currentTab === 'home' && tab.id === 'overview') || (currentTab === 'fulfillment' && tab.id === 'orders');

          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                isActive 
                  ? 'bg-eg-teal text-white shadow-sm font-bold' 
                  : 'text-eg-muted hover:bg-eg-paper hover:text-eg-ink'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#4FD1A5]' : 'text-eg-muted'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold ${isActive ? 'bg-[#4FD1A5] text-eg-ink' : 'bg-eg-tint text-eg-teal'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="pt-2">
        {renderCurrentPage()}
      </div>

    </div>
  );
}


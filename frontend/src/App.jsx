// ElderGuard AI Platform Core Layout - In-Person Booking Fix
import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import DashboardLayout from './components/layout/DashboardLayout';
import ElderDashboard from './pages/elder/ElderDashboard';
import ElderMedicinesPage from './pages/elder/ElderMedicinesPage';
import ElderVitalsPage from './pages/elder/ElderVitalsPage';
import ElderAppointmentsPage from './pages/elder/ElderAppointmentsPage';
import ElderMedicalReportsPage from './pages/elder/ElderMedicalReportsPage';
import ElderCommunityEventsPage from './pages/elder/ElderCommunityEventsPage';
import ElderSettingsPage from './pages/elder/ElderSettingsPage';
import ElderAIAssistantPage from './pages/elder/ElderAIAssistantPage';
import CaregiverDashboard from './pages/caregiver/CaregiverDashboard';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import DoctorMyPatientsPage from './pages/doctor/DoctorMyPatientsPage';
import DoctorPatientDetailPage from './pages/doctor/DoctorPatientDetailPage';
import DoctorAppointmentsPage from './pages/doctor/DoctorAppointmentsPage';
import DoctorPrescriptionsPage from './pages/doctor/DoctorPrescriptionsPage';
import DoctorReportsPage from './pages/doctor/DoctorReportsPage';
import DoctorMessagesPage from './pages/doctor/DoctorMessagesPage';
import DoctorSettingsPage from './pages/doctor/DoctorSettingsPage';
import HospitalDashboard from './pages/hospital/HospitalDashboard';
import PharmacyDashboard from './pages/pharmacy/PharmacyDashboard';
import UserProfile from './components/common/UserProfile';
import ErrorBoundary from './components/common/ErrorBoundary';
import { authService } from './services/authService';
import tabStorage from './utils/tabStorage';
import './styles/index.css';

// ElderGuard - Role-based elder care platform
export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return authService.getCurrentUser();
    } catch {
      return null;
    }
  });

  const [currentView, setCurrentView] = useState(() => {
    try {
      const user = authService.getCurrentUser();
      const savedView = tabStorage.getItem('elderguard_current_view');
      if (user) {
        return savedView || 'dashboard';
      }
      return savedView && ['login', 'register', 'signup'].includes(savedView) ? savedView : 'landing';
    } catch {
      return 'landing';
    }
  });

  const [activeTab, setActiveTab] = useState(() => {
    try {
      return tabStorage.getItem('elderguard_active_tab') || 'home';
    } catch {
      return 'home';
    }
  });

  // App main state router
  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }

    const handleSessionExpired = () => {
      setCurrentUser(null);
      setCurrentView('login');
      tabStorage.removeItem('elderguard_current_view');
      tabStorage.removeItem('elderguard_active_tab');
    };
    window.addEventListener('elderguard:session-expired', handleSessionExpired);
    return () => window.removeEventListener('elderguard:session-expired', handleSessionExpired);
  }, []);

  const handleNavigate = (view) => {
    setCurrentView(view);
    tabStorage.setItem('elderguard_current_view', view);
  };

  const handleSelectTab = (tab) => {
    setActiveTab(tab);
    tabStorage.setItem('elderguard_active_tab', tab);
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    handleNavigate('dashboard');
  };

  const handleRegisterSuccess = (user) => {
    setCurrentUser(user);
    handleNavigate('dashboard');
  };

  const handleLogout = () => {
    authService.logout();
    tabStorage.removeItem('elderguard_current_view');
    tabStorage.removeItem('elderguard_active_tab');
    setCurrentUser(null);
    setCurrentView('landing');
    setActiveTab('home');
  };

  const renderDashboardContent = () => {
    const role = currentUser?.role || 'elder';
    switch (role) {
      case 'elder':
        if (activeTab === 'medicines' || activeTab === 'medicine') {
          return <ElderMedicinesPage currentUser={currentUser} onNavigateTab={handleSelectTab} />;
        }
        if (activeTab === 'aiassistant' || activeTab === 'ai') {
          return <ElderAIAssistantPage currentUser={currentUser} onNavigateTab={handleSelectTab} />;
        }
        if (activeTab === 'vitals' || activeTab === 'vital') {
          return <ElderVitalsPage currentUser={currentUser} onNavigateTab={handleSelectTab} />;
        }
        if (activeTab === 'appointments' || activeTab === 'appointment') {
          return <ElderAppointmentsPage currentUser={currentUser} onNavigateTab={handleSelectTab} />;
        }
        if (activeTab === 'reports' || activeTab === 'report') {
          return <ElderMedicalReportsPage currentUser={currentUser} onNavigateTab={handleSelectTab} />;
        }
        if (activeTab === 'community') {
          return <ElderCommunityEventsPage currentUser={currentUser} onNavigateTab={handleSelectTab} />;
        }
        if (activeTab === 'settings') {
          return <ElderSettingsPage currentUser={currentUser} onNavigateTab={handleSelectTab} onLogout={handleLogout} />;
        }
        return <ElderDashboard currentUser={currentUser} onNavigateTab={handleSelectTab} />;
      case 'caregiver':
        return <CaregiverDashboard currentUser={currentUser} activeTab={activeTab} onNavigateTab={handleSelectTab} onLogout={handleLogout} />;
      case 'doctor':
        if (activeTab === 'mypatients' || activeTab === 'patientdetail' || activeTab === 'prescriptions' || activeTab === 'reports') {
          return <DoctorMyPatientsPage currentUser={currentUser} onNavigateTab={handleSelectTab} />;
        }
        if (activeTab === 'appointments') {
          return <DoctorAppointmentsPage currentUser={currentUser} onNavigateTab={handleSelectTab} />;
        }
        if (activeTab === 'messages' || activeTab === 'careteam') {
          return <DoctorMessagesPage currentUser={currentUser} onNavigateTab={handleSelectTab} />;
        }
        if (activeTab === 'settings') {
          return <DoctorSettingsPage currentUser={currentUser} onNavigateTab={handleSelectTab} onLogout={handleLogout} />;
        }
        return <DoctorDashboard currentUser={currentUser} onNavigateTab={handleSelectTab} />;
      case 'hospital':
        return <HospitalDashboard currentUser={currentUser} activeTab={activeTab} onNavigateTab={handleSelectTab} onLogout={handleLogout} />;
      case 'pharmacy':
        return <PharmacyDashboard currentUser={currentUser} activeTab={activeTab} onNavigateTab={handleSelectTab} onLogout={handleLogout} />;
      default:
        return <ElderDashboard currentUser={currentUser} />;
    }
  };

  return (
    <ErrorBoundary>
      <main className="relative min-h-screen">
        {currentView === 'login' ? (
          <Login 
            onNavigate={handleNavigate} 
            onLoginSuccess={handleLoginSuccess} 
          />
        ) : (currentView === 'register' || currentView === 'signup') ? (
          <Register 
            onNavigate={handleNavigate} 
            onRegisterSuccess={handleRegisterSuccess} 
          />
        ) : (currentView === 'dashboard' && currentUser) ? (
          <DashboardLayout
            currentUser={currentUser}
            activeTab={activeTab}
            onSelectTab={handleSelectTab}
            onLogout={handleLogout}
          >
            {renderDashboardContent()}
          </DashboardLayout>
        ) : (
          <LandingPage 
            onNavigate={(view) => {
              if (view === 'dashboard' && currentUser) {
                handleNavigate('dashboard');
              } else {
                handleNavigate(view);
              }
            }} 
            currentUser={currentUser}
            onOpenProfile={() => handleNavigate('dashboard')}
            onLoginSuccess={handleLoginSuccess}
            onLogout={handleLogout}
          />
        )}
      </main>
    </ErrorBoundary>
  );
}

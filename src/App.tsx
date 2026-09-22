import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { LoginPage } from './components/auth/LoginPage';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './components/dashboard/Dashboard';
import { YardView } from './components/yard/YardView';
import { GateIn } from './components/operations/GateIn';
import { GateOut } from './components/operations/GateOut';
import { DeliveryOrderPage } from './components/operations/DeliveryOrderPage';
import { YardMovement } from './components/operations/YardMovement';
import { LoadingPage } from './components/operations/LoadingPage';
import { UnloadingPage } from './components/operations/UnloadingPage';
import { MasterContainer } from './components/master/MasterContainer';
import { MasterVessel } from './components/master/MasterVessel';
import { MasterCustomer } from './components/master/MasterCustomer';
import { MasterPort } from './components/master/MasterPort';
import { MasterYardLocation } from './components/master/MasterYardLocation';
import { MasterContainerType } from './components/master/MasterContainerType';
import { ReportsPage } from './components/reports/ReportsPage';
import { FirebaseStatusPage } from './components/system/FirebaseStatusPage';
import { ActiveTab, Container } from './types';
import { Ship } from 'lucide-react';

const MainApp: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedGlobalContainer, setSelectedGlobalContainer] = useState<Container | null>(null);
  const [preselectedForRelocation, setPreselectedForRelocation] = useState<Container | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 animate-pulse">
          <Ship className="w-6 h-6 text-white" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-base font-extrabold tracking-wider">HAI CONTAINER</h2>
          <p className="text-xs text-slate-400">Memuat Terminal Operating System...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const handleGlobalContainerSelect = (cnt: Container) => {
    setSelectedGlobalContainer(cnt);
    setActiveTab('yard');
  };

  const handleRelocateFromYard = (cnt: Container) => {
    setPreselectedForRelocation(cnt);
    setActiveTab('yard-movement');
  };

  return (
    <Layout
      activeTab={activeTab}
      onSelectTab={(tab) => {
        setActiveTab(tab);
        if (tab !== 'yard-movement') {
          setPreselectedForRelocation(null);
        }
      }}
      onSelectContainer={handleGlobalContainerSelect}
    >
      {activeTab === 'dashboard' && (
        <Dashboard
          onNavigate={(tab) => setActiveTab(tab)}
          onSelectContainer={handleGlobalContainerSelect}
        />
      )}
      {activeTab === 'yard' && (
        <YardView
          onRelocateContainer={handleRelocateFromYard}
          selectedContainerFromGlobal={selectedGlobalContainer}
        />
      )}
      {activeTab === 'gate-in' && <GateIn />}
      {activeTab === 'gate-out' && <GateOut />}
      {activeTab === 'delivery-order' && <DeliveryOrderPage />}
      {activeTab === 'yard-movement' && (
        <YardMovement preselectedContainer={preselectedForRelocation} />
      )}
      {activeTab === 'loading' && <LoadingPage />}
      {activeTab === 'unloading' && <UnloadingPage />}
      {activeTab === 'master-container' && <MasterContainer />}
      {activeTab === 'master-vessel' && <MasterVessel />}
      {activeTab === 'master-customer' && <MasterCustomer />}
      {activeTab === 'master-port' && <MasterPort />}
      {activeTab === 'master-yard-location' && <MasterYardLocation />}
      {activeTab === 'master-container-type' && <MasterContainerType />}
      {activeTab === 'reports' && <ReportsPage />}
      {activeTab === 'firebase-status' && <FirebaseStatusPage />}
    </Layout>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ToastProvider>
  );
}

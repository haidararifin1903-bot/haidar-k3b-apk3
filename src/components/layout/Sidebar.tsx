import React from 'react';
import {
  LayoutDashboard,
  Grid3X3,
  LogIn,
  LogOut,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  Boxes,
  Ship,
  Users,
  Anchor,
  MapPin,
  Tag,
  BarChart3,
  Flame,
  X,
} from 'lucide-react';
import { ActiveTab } from '../../types';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
}) => {
  const sections: NavSection[] = [
    {
      title: 'OPERASIONAL UTAMA',
      items: [
        { id: 'dashboard', label: 'Dashboard Operasional', icon: LayoutDashboard },
        { id: 'yard', label: 'Visualisasi Yard', icon: Grid3X3, badge: 'Interactive' },
      ],
    },
    {
      title: 'GERBANG & DELIVERY',
      items: [
        { id: 'gate-in', label: 'Gate In (Masuk)', icon: LogIn },
        { id: 'gate-out', label: 'Gate Out (Keluar)', icon: LogOut },
        { id: 'delivery-order', label: 'Delivery Order (DO)', icon: FileText },
      ],
    },
    {
      title: 'YARD & DERMAGA',
      items: [
        { id: 'yard-movement', label: 'Yard Movement', icon: ArrowRightLeft },
        { id: 'loading', label: 'Loading (Muat Kapal)', icon: ArrowUpRight },
        { id: 'unloading', label: 'Unloading (Bongkar Kapal)', icon: ArrowDownLeft },
      ],
    },
    {
      title: 'DATA MASTER',
      items: [
        { id: 'master-container', label: 'Peti Kemas', icon: Boxes },
        { id: 'master-vessel', label: 'Kapal (Vessel)', icon: Ship },
        { id: 'master-customer', label: 'Pelanggan (Customer)', icon: Users },
        { id: 'master-port', label: 'Pelabuhan (Port)', icon: Anchor },
        { id: 'master-yard-location', label: 'Lokasi Yard', icon: MapPin },
        { id: 'master-container-type', label: 'Tipe Kontainer', icon: Tag },
      ],
    },
    {
      title: 'LAPORAN & SISTEM',
      items: [
        { id: 'reports', label: 'Laporan Terminal', icon: BarChart3 },
        { id: 'firebase-status', label: 'Firebase Firestore', icon: Flame },
      ],
    },
  ];

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          id="sidebar-backdrop"
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header on mobile */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800 lg:hidden">
          <div className="flex items-center gap-2 text-white font-bold">
            <Ship className="w-5 h-5 text-blue-500" />
            <span>HAI CONTAINER</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {sections.map((sec, idx) => (
            <div key={idx} className="space-y-1">
              <h4 className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {sec.title}
              </h4>
              <div className="space-y-0.5 mt-2">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`nav-${item.id}`}
                      onClick={() => {
                        onSelectTab(item.id);
                        if (window.innerWidth < 1024) onClose();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                        isActive
                          ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 flex-shrink-0 transition-colors ${
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-tight">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-[11px] text-slate-400">
          <div className="flex items-center justify-between font-semibold text-slate-300 mb-1">
            <span>Terminal 01 Priok</span>
            <span className="text-emerald-400">ONLINE</span>
          </div>
          <p className="text-[10px] text-slate-500">Container Terminal Management System</p>
        </div>
      </aside>
    </>
  );
};

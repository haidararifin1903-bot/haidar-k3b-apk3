import React, { useState, useEffect } from 'react';
import {
  Search,
  Flame,
  Clock,
  LogOut,
  User,
  ShieldCheck,
  Menu,
  Ship,
  Radio,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { firebaseConfig } from '../../lib/firebase';
import { Container } from '../../types';
import { db } from '../../lib/database';
import { useRealtimeSubscription } from '../../hooks/useRealtime';

interface NavbarProps {
  onToggleSidebar: () => void;
  onOpenFirebaseStatus?: () => void;
  onSelectContainer?: (container: Container) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  onOpenFirebaseStatus,
  onSelectContainer,
}) => {
  const { user, logout } = useAuth();
  const [currentTime, setCurrentTime] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Container[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  const { isConnected: isRealtimeConnected } = useRealtimeSubscription();

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      await db.resetToSeed();
    } catch {
      // ignore
    } finally {
      setTimeout(() => setIsManualSyncing(false), 500);
    }
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('id-ID', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const all = await db.getContainers();
    const query = val.toUpperCase().trim();
    const results = all.filter(
      (c) =>
        c.container_number.includes(query) ||
        c.owner.toUpperCase().includes(query) ||
        c.location.toUpperCase().includes(query) ||
        c.seal_number.toUpperCase().includes(query)
    );
    setSearchResults(results.slice(0, 5));
  };

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 shadow-md">
      {/* Left: Mobile Toggle & Brand */}
      <div className="flex items-center gap-3">
        <button
          id="sidebar-toggle-btn"
          onClick={onToggleSidebar}
          className="p-2 text-slate-400 hover:text-white lg:hidden rounded-lg hover:bg-slate-800 transition"
          aria-label="Buka navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Ship className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-wider text-white">HAI CONTAINER</span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-bold bg-blue-900/60 text-blue-300 border border-blue-700/50 rounded">
                TOS v2.4
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-none hidden sm:block">Terminal Operating System</p>
          </div>
        </div>
      </div>

      {/* Middle: Global Container Quick Search */}
      <div className="hidden md:flex items-center relative max-w-md w-full mx-6">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="global-container-search"
            type="text"
            placeholder="Cari Kontainer (cth: MSKU, CMAU, B-01)..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-800/80 border border-slate-700 focus:border-blue-500 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
          />
        </div>

        {/* Search Results Dropdown */}
        {isSearching && searchResults.length > 0 && (
          <div className="absolute top-full mt-1.5 left-0 right-0 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 text-xs">
            <div className="text-[10px] text-slate-400 px-2 py-1 font-semibold uppercase tracking-wider border-b border-slate-800">
              Hasil Pencarian Peti Kemas ({searchResults.length})
            </div>
            {searchResults.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  if (onSelectContainer) onSelectContainer(c);
                  setIsSearching(false);
                  setSearchQuery('');
                }}
                className="w-full text-left px-3 py-2 hover:bg-slate-800 rounded-lg text-slate-200 transition flex items-center justify-between group mt-1"
              >
                <div>
                  <span className="font-bold text-blue-400 group-hover:text-blue-300">
                    {c.container_number}
                  </span>{' '}
                  <span className="text-slate-400">({c.size}ft {c.type})</span>
                  <div className="text-[11px] text-slate-400">
                    Lokasi: <span className="text-slate-200 font-mono">{c.location}</span> • {c.owner}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 border border-slate-700 text-slate-300">
                  {c.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: Clock, Realtime Sync pill, Database badge, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Terminal Clock & Shift */}
        <div className="hidden xl:flex items-center gap-2 text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-mono text-[11px]">{currentTime}</span>
          <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.2 rounded text-[10px] font-bold">
            SHIFT 1
          </span>
        </div>

        {/* Live Real-time Cross-Device Sync Indicator */}
        <div
          id="realtime-sync-pill"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border bg-slate-850 bg-slate-800/80 border-slate-700 text-slate-300 shadow-2xs"
          title="Sinkronisasi otomatis antar-perangkat (PC, Tablet, Smartphone) via Real-Time Server"
        >
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="hidden sm:inline font-mono text-[11px] font-semibold text-emerald-300">
            {isRealtimeConnected ? 'REALTIME SYNC' : 'SYNC CONNECTED'}
          </span>
          <button
            onClick={handleManualSync}
            title="Klik untuk Refresh Sinkronisasi"
            className="hover:text-white text-slate-400 ml-0.5"
          >
            <RefreshCw className={`w-3 h-3 ${isManualSyncing ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>

        {/* Firebase Firestore Status Button */}
        <button
          id="firebase-status-pill"
          onClick={onOpenFirebaseStatus}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border bg-amber-950/70 border-amber-700/60 text-amber-300 hover:bg-amber-900/60 transition shadow-2xs"
          title={`Terkoneksi ke Firebase Firestore (Project: ${firebaseConfig.projectId})`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline font-semibold">
            Firebase Firestore (Live)
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>

        {/* User Profile */}
        <div className="relative">
          <button
            id="user-profile-btn"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-800 transition text-left"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-300 font-bold text-xs">
              {(user?.full_name || user?.email || 'AD')
                .split(' ')
                .map((s) => s[0])
                .filter(Boolean)
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>
            <div className="hidden md:block leading-tight">
              <div className="text-xs font-semibold text-slate-100 flex items-center gap-1">
                {user?.full_name || 'Admin'}
                <ShieldCheck className="w-3 h-3 text-blue-400" />
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                {user?.role || 'Administrator'}
              </div>
            </div>
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div
              id="user-profile-dropdown"
              className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="p-3 border-b border-slate-800 text-xs text-slate-300">
                <p className="font-bold text-white">{user?.full_name}</p>
                <p className="text-slate-400 text-[11px] mt-0.5">{user?.email}</p>
                <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-900/60 text-blue-300 border border-blue-700/50">
                  {user?.terminal || 'Terminal Peti Kemas'}
                </span>
              </div>

              <div className="py-1">
                <button
                  id="menu-settings-btn"
                  onClick={() => {
                    setShowProfileMenu(false);
                    if (onOpenFirebaseStatus) onOpenFirebaseStatus();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition"
                >
                  <Flame className="w-4 h-4 text-amber-400" />
                  Status Firebase Firestore
                </button>
                <button
                  id="menu-logout-btn"
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                  Logout Sistem
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

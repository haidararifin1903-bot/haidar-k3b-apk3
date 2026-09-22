import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Grid3X3,
  LogIn,
  LogOut,
  ArrowUpRight,
  ArrowDownLeft,
  Ship,
  TrendingUp,
  Clock,
  ArrowRight,
  RefreshCw,
  Plus,
} from 'lucide-react';
import {
  OperationalStats,
  GateInTransaction,
  GateOutTransaction,
  LoadingOperation,
  UnloadingOperation,
  ActiveTab,
  Container,
} from '../../types';
import { db } from '../../lib/database';
import { useRealtimeSubscription } from '../../hooks/useRealtime';

interface DashboardProps {
  onNavigate: (tab: ActiveTab) => void;
  onSelectContainer?: (container: Container) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigate,
  onSelectContainer,
}) => {
  const [stats, setStats] = useState<OperationalStats>(db.getStats());
  const [recentGateIn, setRecentGateIn] = useState<GateInTransaction[]>([]);
  const [recentGateOut, setRecentGateOut] = useState<GateOutTransaction[]>([]);
  const [recentLoading, setRecentLoading] = useState<LoadingOperation[]>([]);
  const [recentUnloading, setRecentUnloading] = useState<UnloadingOperation[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [activeOpsTab, setActiveOpsTab] = useState<'gate-in' | 'gate-out' | 'loading' | 'unloading'>('gate-in');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
    setIsRefreshing(true);
    setStats(db.getStats());
    const [gi, go, ld, uld, cnt] = await Promise.all([
      db.getGateInList(),
      db.getGateOutList(),
      db.getLoadingOperations(),
      db.getUnloadingOperations(),
      db.getContainers(),
    ]);
    setRecentGateIn(gi.slice(0, 5));
    setRecentGateOut(go.slice(0, 5));
    setRecentLoading(ld.slice(0, 5));
    setRecentUnloading(uld.slice(0, 5));
    setContainers(cnt);
    setIsRefreshing(false);
  };

  useRealtimeSubscription(loadData);

  useEffect(() => {
    loadData();
  }, []);

  // Status breakdown calculations
  const statusCounts = containers.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusColors: Record<string, string> = {
    'In Yard': '#2563eb', // Blue
    'Gate In': '#6366f1', // Indigo
    'Empty': '#10b981', // Emerald
    'Full': '#0284c7', // Sky
    'Loading': '#f59e0b', // Amber
    'On Vessel': '#8b5cf6', // Violet
    'Discharged': '#a855f7', // Purple
    'Gate Out': '#64748b', // Slate
    'Damaged': '#ef4444', // Red
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Dashboard Operasional</h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitoring arus peti kemas, produktivitas dermaga, dan utilisasi lapangan penumpukan (Yard)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="refresh-dashboard-btn"
            onClick={loadData}
            disabled={isRefreshing}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            Perbarui Data
          </button>
          <button
            id="quick-gate-in-btn"
            onClick={() => onNavigate('gate-in')}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            Proses Gate In
          </button>
        </div>
      </div>

      {/* KPI Stats Cards Grid (8 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Containers */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Kontainer</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{stats.totalContainers}</span>
            <span className="text-[11px] font-medium text-slate-500">Unit Terdaftar</span>
          </div>
        </div>

        {/* Containers in Yard */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Peti Kemas di Yard</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Grid3X3 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-600">{stats.containersInYard}</span>
            <span className="text-[11px] font-medium text-slate-500">Dalam Penumpukan</span>
          </div>
        </div>

        {/* Gate In Today */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gate In Hari Ini</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <LogIn className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">+{stats.gateInToday}</span>
            <span className="text-[11px] font-medium text-slate-500">Truk Masuk</span>
          </div>
        </div>

        {/* Gate Out Today */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gate Out Hari Ini</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <LogOut className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600">{stats.gateOutToday}</span>
            <span className="text-[11px] font-medium text-slate-500">Peti Kemas Keluar</span>
          </div>
        </div>

        {/* Loaded to Vessel */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dimuat (Loading)</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-cyan-700">{stats.containersLoaded}</span>
            <span className="text-[11px] font-medium text-slate-500">Ke Kapal</span>
          </div>
        </div>

        {/* Discharged from Vessel */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dibongkar (Discharged)</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-700">{stats.containersDischarged}</span>
            <span className="text-[11px] font-medium text-slate-500">Dari Kapal</span>
          </div>
        </div>

        {/* Active Vessels */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kapal Aktif</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Ship className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-sky-800">{stats.activeVessels}</span>
            <span className="text-[11px] font-medium text-slate-500">Sandar / Operasi</span>
          </div>
        </div>

        {/* Yard Occupancy */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Okupansi Yard</span>
            <span className="text-xs font-bold text-blue-600">{stats.yardOccupancyRate}%</span>
          </div>
          <div className="mt-3">
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  stats.yardOccupancyRate > 80
                    ? 'bg-rose-500'
                    : stats.yardOccupancyRate > 60
                    ? 'bg-amber-500'
                    : 'bg-blue-600'
                }`}
                style={{ width: `${Math.min(stats.yardOccupancyRate, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>{stats.containersInYard} Slot Terisi</span>
              <span>Kapasitas: {stats.totalYardCapacity} TEU</span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Gate In vs Gate Out Trends */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Arus Gerbang (Gate In vs Out)</h3>
              <p className="text-[11px] text-slate-500">Perbandingan volume per jam operasional</p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> In
              </span>
              <span className="flex items-center gap-1 text-amber-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Out
              </span>
            </div>
          </div>

          {/* SVG Bar Chart */}
          <div className="h-44 w-full flex items-end justify-between gap-2 pt-6 pb-2 px-1">
            {[
              { time: '08:00', in: 12, out: 4 },
              { time: '10:00', in: 18, out: 9 },
              { time: '12:00', in: 14, out: 15 },
              { time: '14:00', in: 22, out: 19 },
              { time: '16:00', in: 16, out: 12 },
              { time: '18:00', in: 9, out: 8 },
            ].map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <div className="w-full flex items-end justify-center gap-1 h-32">
                  <div
                    className="w-3 bg-emerald-500 hover:bg-emerald-600 rounded-t transition-all cursor-pointer relative group"
                    style={{ height: `${(d.in / 25) * 100}%` }}
                  >
                    <span className="opacity-0 group-hover:opacity-100 transition absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-1 rounded whitespace-nowrap z-10">
                      In: {d.in}
                    </span>
                  </div>
                  <div
                    className="w-3 bg-amber-500 hover:bg-amber-600 rounded-t transition-all cursor-pointer relative group"
                    style={{ height: `${(d.out / 25) * 100}%` }}
                  >
                    <span className="opacity-0 group-hover:opacity-100 transition absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-1 rounded whitespace-nowrap z-10">
                      Out: {d.out}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{d.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 2: Loading vs Unloading Vessel Operations */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Operasi Dermaga (Quay Productivity)</h3>
              <p className="text-[11px] text-slate-500">Bongkar (Unloading) vs Muat (Loading)</p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-purple-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Bongkar
              </span>
              <span className="flex items-center gap-1 text-cyan-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-600" /> Muat
              </span>
            </div>
          </div>

          <div className="h-44 w-full flex items-end justify-between gap-3 pt-6 pb-2 px-1">
            {[
              { vessel: 'KM Temas', dis: 48, load: 35 },
              { vessel: 'MV Meratus', dis: 62, load: 50 },
              { vessel: 'CMA CGM', dis: 85, load: 78 },
              { vessel: 'Maersk S.', dis: 20, load: 15 },
            ].map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <div className="w-full flex items-end justify-center gap-1.5 h-32">
                  <div
                    className="w-3.5 bg-purple-500 hover:bg-purple-600 rounded-t transition-all cursor-pointer relative group"
                    style={{ height: `${(v.dis / 90) * 100}%` }}
                  >
                    <span className="opacity-0 group-hover:opacity-100 transition absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-1 rounded whitespace-nowrap z-10">
                      {v.dis} TEU
                    </span>
                  </div>
                  <div
                    className="w-3.5 bg-cyan-600 hover:bg-cyan-700 rounded-t transition-all cursor-pointer relative group"
                    style={{ height: `${(v.load / 90) * 100}%` }}
                  >
                    <span className="opacity-0 group-hover:opacity-100 transition absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-1 rounded whitespace-nowrap z-10">
                      {v.load} TEU
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-600 font-medium truncate w-16 text-center">
                  {v.vessel}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 3: Container Status Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Distribusi Status Kontainer</h3>
              <p className="text-[11px] text-slate-500">Komposisi kondisi fisik & lokasi peti kemas</p>
            </div>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-2.5 pt-1">
            {Object.entries(statusCounts).map(([statusName, count]) => {
              const pct = Math.round((Number(count) / (containers.length || 1)) * 100);
              const color = statusColors[statusName] || '#64748b';
              return (
                <div key={statusName} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-2 text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      {statusName}
                    </span>
                    <span className="text-slate-500">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Today's Operations Live Stream Feed */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Operasional Hari Ini (Today's Operations)
            </h3>
            <p className="text-[11px] text-slate-500">Catatan transaksi operasional real-time terminal peti kemas</p>
          </div>

          {/* Operation Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setActiveOpsTab('gate-in')}
              className={`px-3 py-1 rounded-md transition ${
                activeOpsTab === 'gate-in' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Gate In ({recentGateIn.length})
            </button>
            <button
              onClick={() => setActiveOpsTab('gate-out')}
              className={`px-3 py-1 rounded-md transition ${
                activeOpsTab === 'gate-out' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Gate Out ({recentGateOut.length})
            </button>
            <button
              onClick={() => setActiveOpsTab('loading')}
              className={`px-3 py-1 rounded-md transition ${
                activeOpsTab === 'loading' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Loading ({recentLoading.length})
            </button>
            <button
              onClick={() => setActiveOpsTab('unloading')}
              className={`px-3 py-1 rounded-md transition ${
                activeOpsTab === 'unloading' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Unloading ({recentUnloading.length})
            </button>
          </div>
        </div>

        {/* Tab Content Tables */}
        <div className="overflow-x-auto">
          {activeOpsTab === 'gate-in' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">No. Transaksi</th>
                  <th className="py-3 px-4">Peti Kemas</th>
                  <th className="py-3 px-4">No. Truk & Sopir</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Kondisi & Segel</th>
                  <th className="py-3 px-4">Lokasi Dituju</th>
                  <th className="py-3 px-4">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentGateIn.map((gi) => (
                  <tr key={gi.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-blue-600">{gi.transaction_number}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900">{gi.container_number}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{gi.truck_number}</div>
                      <div className="text-[11px] text-slate-400">{gi.driver}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-xs truncate">{gi.customer_name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {gi.condition}
                      </span>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">Seal: {gi.seal_number}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {gi.assigned_yard_location || gi.destination}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(gi.date_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeOpsTab === 'gate-out' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">No. Transaksi</th>
                  <th className="py-3 px-4">Peti Kemas</th>
                  <th className="py-3 px-4">No. Truk & Sopir</th>
                  <th className="py-3 px-4">No. DO</th>
                  <th className="py-3 px-4">Tujuan Pengiriman</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentGateOut.map((go) => (
                  <tr key={go.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-amber-600">{go.transaction_number}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{go.container_number}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{go.truck_number}</div>
                      <div className="text-[11px] text-slate-400">{go.driver}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{go.do_number || '-'}</td>
                    <td className="py-3 px-4 text-slate-700">{go.destination}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {go.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(go.date_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeOpsTab === 'loading' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">No. Loading</th>
                  <th className="py-3 px-4">Nama Kapal (Vessel)</th>
                  <th className="py-3 px-4">Peti Kemas</th>
                  <th className="py-3 px-4">Crane & Operator</th>
                  <th className="py-3 px-4">Posisi Stowage Kapal</th>
                  <th className="py-3 px-4">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentLoading.map((ld) => (
                  <tr key={ld.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-cyan-700">{ld.loading_number}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{ld.vessel_name}</td>
                    <td className="py-3 px-4 font-bold text-blue-600">{ld.container_number}</td>
                    <td className="py-3 px-4 text-slate-700">
                      {ld.crane} ({ld.operator})
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{ld.position}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(ld.date_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeOpsTab === 'unloading' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">No. Unloading</th>
                  <th className="py-3 px-4">Kapal (Vessel)</th>
                  <th className="py-3 px-4">Peti Kemas</th>
                  <th className="py-3 px-4">Crane & Operator</th>
                  <th className="py-3 px-4">Lokasi Penempatan Yard</th>
                  <th className="py-3 px-4">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentUnloading.map((uld) => (
                  <tr key={uld.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-purple-700">{uld.unloading_number}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{uld.vessel_name}</td>
                    <td className="py-3 px-4 font-bold text-purple-600">{uld.container_number}</td>
                    <td className="py-3 px-4 text-slate-700">
                      {uld.crane} ({uld.operator})
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-800 font-medium">{uld.position}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(uld.date_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 text-right">
          <button
            onClick={() => onNavigate(activeOpsTab)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
          >
            Lihat Semua Transaksi {activeOpsTab.replace('-', ' ').toUpperCase()} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Flame,
  CheckCircle2,
  Database,
  RefreshCw,
  Boxes,
  ShieldCheck,
  Server,
  Layers,
  Activity,
  Globe,
  HardDrive
} from 'lucide-react';
import { db } from '../../lib/database';
import { firebaseConfig } from '../../lib/firebase';
import { useToast } from '../../context/ToastContext';

export const FirebaseStatusPage: React.FC = () => {
  const { showToast } = useToast();
  const [stats, setStats] = useState({
    containers: 0,
    vessels: 0,
    customers: 0,
    ports: 0,
    yardLocations: 0,
    gateIn: 0,
    gateOut: 0,
    yardMovements: 0,
    loading: 0,
    unloading: 0,
    deliveryOrders: 0,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const loadStats = async () => {
    setIsRefreshing(true);
    try {
      const [cnts, vsls, custs, prts, locs, gi, go, ym, ld, uld, dos] = await Promise.all([
        db.getContainers(),
        db.getVessels(),
        db.getCustomers(),
        db.getPorts(),
        db.getYardLocations(),
        db.getGateInTransactions(),
        db.getGateOutTransactions(),
        db.getYardMovements(),
        db.getLoadingOperations(),
        db.getUnloadingOperations(),
        db.getDeliveryOrders(),
      ]);
      setStats({
        containers: cnts.length,
        vessels: vsls.length,
        customers: custs.length,
        ports: prts.length,
        yardLocations: locs.length,
        gateIn: gi.length,
        gateOut: go.length,
        yardMovements: ym.length,
        loading: ld.length,
        unloading: uld.length,
        deliveryOrders: dos.length,
      });
    } catch {
      // ignore
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
    const unsub = db.subscribe(() => {
      loadStats();
    });
    return unsub;
  }, []);

  const handleResyncSeed = async () => {
    if (!confirm('Apakah Anda ingin memuat ulang data seed standar ke Firestore?')) return;
    setIsResetting(true);
    try {
      await db.resetToSeed();
      showToast('success', 'Data Firestore Disinkronkan', 'Data master terminal berhasil diperbarui.');
      await loadStats();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('error', 'Gagal Sinkronisasi', msg);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/20">
              <Flame className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-wide">Firebase Firestore Database</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Koneksi Tunggal Aktif
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-1">
                Database Cloud Firestore tunggal terintegrasi untuk penyimpanan persisten & sinkronisasi real-time multi-perangkat.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadStats}
              disabled={isRefreshing}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-2 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
              Segarkan
            </button>
            <button
              onClick={handleResyncSeed}
              disabled={isResetting}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md shadow-amber-600/30 flex items-center gap-2 transition"
            >
              <Database className="w-3.5 h-3.5" />
              {isResetting ? 'Memproses...' : 'Muat Ulang Seed'}
            </button>
          </div>
        </div>
      </div>

      {/* Connection Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Server className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Project ID</div>
            <div className="text-sm font-semibold text-white font-mono truncate">{firebaseConfig.projectId}</div>
          </div>
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Firestore Database</div>
            <div className="text-xs font-semibold text-white font-mono truncate">
              {firebaseConfig.firestoreDatabaseId || '(default)'}
            </div>
          </div>
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Activity className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Metode Sinkronisasi</div>
            <div className="text-xs font-semibold text-emerald-300 font-mono">Firestore Realtime Snapshots</div>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping flex-shrink-0" />
        </div>
      </div>

      {/* Firestore Collections Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-400" />
          Koleksi Firestore Aktif ({Object.keys(stats).length} Koleksi)
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { label: 'containers', name: 'Peti Kemas (Containers)', count: stats.containers, icon: Boxes },
            { label: 'vessels', name: 'Kapal (Vessels)', count: stats.vessels, icon: Globe },
            { label: 'customers', name: 'Pelanggan (Customers)', count: stats.customers, icon: ShieldCheck },
            { label: 'ports', name: 'Pelabuhan (Ports)', count: stats.ports, icon: Server },
            { label: 'yard_locations', name: 'Slot Yard', count: stats.yardLocations, icon: HardDrive },
            { label: 'gate_in_transactions', name: 'Gate In Logs', count: stats.gateIn, icon: Activity },
            { label: 'gate_out_transactions', name: 'Gate Out Logs', count: stats.gateOut, icon: Activity },
            { label: 'yard_movements', name: 'Yard Movements', count: stats.yardMovements, icon: RefreshCw },
            { label: 'loading_operations', name: 'Loading Operations', count: stats.loading, icon: Layers },
            { label: 'unloading_operations', name: 'Unloading Operations', count: stats.unloading, icon: Layers },
            { label: 'delivery_orders', name: 'Delivery Orders', count: stats.deliveryOrders, icon: Database },
          ].map((col) => {
            const Icon = col.icon;
            return (
              <div
                key={col.label}
                className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between"
              >
                <div>
                  <div className="text-[10px] font-mono text-amber-400/80 font-bold">{col.label}</div>
                  <div className="text-xs font-semibold text-slate-200 mt-0.5">{col.name}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-xs font-mono font-bold text-white border border-slate-700">
                    {col.count}
                  </span>
                  <Icon className="w-3.5 h-3.5 text-slate-500" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

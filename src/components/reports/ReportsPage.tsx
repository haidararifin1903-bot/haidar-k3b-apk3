import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  Filter,
  Printer,
  Download,
  Boxes,
  LogIn,
  LogOut,
  Ship,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { db } from '../../lib/database';
import { Container, GateInTransaction, GateOutTransaction, LoadingOperation, UnloadingOperation } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useRealtimeSubscription } from '../../hooks/useRealtime';

interface ReportRow {
  id: string;
  time: string;
  activity: 'Gate In' | 'Gate Out' | 'Loading' | 'Unloading' | 'Movement';
  container_number: string;
  customer_or_vessel: string;
  location_or_target: string;
  operator_or_driver: string;
  status: string;
}

export const ReportsPage: React.FC = () => {
  const { showToast } = useToast();
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [activityFilter, setActivityFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const loadData = async () => {
    const [giList, goList, ldList, uldList] = await Promise.all([
      db.getGateInList(),
      db.getGateOutList(),
      db.getLoadingOperations(),
      db.getUnloadingOperations(),
    ]);

    const compiled: ReportRow[] = [];

    giList.forEach((gi) => {
      compiled.push({
        id: gi.id,
        time: gi.date_time,
        activity: 'Gate In',
        container_number: gi.container_number,
        customer_or_vessel: gi.customer_name,
        location_or_target: gi.assigned_yard_location,
        operator_or_driver: `${gi.driver} (${gi.truck_number})`,
        status: gi.condition,
      });
    });

    goList.forEach((go) => {
      compiled.push({
        id: go.id,
        time: go.date_time,
        activity: 'Gate Out',
        container_number: go.container_number,
        customer_or_vessel: go.do_number || 'Eksternal',
        location_or_target: go.destination,
        operator_or_driver: `${go.driver} (${go.truck_number})`,
        status: go.status,
      });
    });

    ldList.forEach((ld) => {
      compiled.push({
        id: ld.id,
        time: ld.date_time,
        activity: 'Loading',
        container_number: ld.container_number,
        customer_or_vessel: ld.vessel_name,
        location_or_target: ld.position,
        operator_or_driver: `${ld.operator} (${ld.crane})`,
        status: 'Loaded',
      });
    });

    uldList.forEach((uld) => {
      compiled.push({
        id: uld.id,
        time: uld.date_time,
        activity: 'Unloading',
        container_number: uld.container_number,
        customer_or_vessel: uld.vessel_name,
        location_or_target: uld.position,
        operator_or_driver: `${uld.operator} (${uld.crane})`,
        status: 'Discharged',
      });
    });

    // Sort by timestamp descending
    compiled.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    setRows(compiled);
  };

  useRealtimeSubscription(loadData);

  useEffect(() => {
    loadData();
  }, []);

  const filtered = rows.filter((r) => {
    const matchActivity = activityFilter === 'ALL' || r.activity === activityFilter;
    const matchSearch =
      search === '' ||
      r.container_number.toLowerCase().includes(search.toLowerCase()) ||
      r.customer_or_vessel.toLowerCase().includes(search.toLowerCase()) ||
      r.location_or_target.toLowerCase().includes(search.toLowerCase());

    const rDate = r.time.split('T')[0];
    const matchDate = (!startDate || rDate >= startDate) && (!endDate || rDate <= endDate);

    return matchActivity && matchSearch && matchDate;
  });

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      showToast('warning', 'Tidak Ada Data', 'Tidak ada data untuk diexport.');
      return;
    }
    const headers = ['Waktu', 'Aktivitas', 'Peti Kemas', 'Customer / Kapal', 'Lokasi / Tujuan', 'Operator / Supir', 'Status'];
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        headers.join(','),
        ...filtered.map((r) =>
          [
            `"${new Date(r.time).toLocaleString('id-ID')}"`,
            `"${r.activity}"`,
            `"${r.container_number}"`,
            `"${r.customer_or_vessel}"`,
            `"${r.location_or_target}"`,
            `"${r.operator_or_driver}"`,
            `"${r.status}"`,
          ].join(',')
        ),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Operasional_HAI_CONTAINER_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'Export Berhasil', 'Laporan CSV berhasil diunduh ke perangkat Anda.');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Laporan Terpadu Operasional Terminal
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit trail konsolidasi arus peti kemas, produktivitas throughput gerbang, dan kinerja dermaga
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs flex items-center gap-1.5 transition"
          >
            <Printer className="w-4 h-4" />
            Cetak Laporan
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 transition"
          >
            <Download className="w-4 h-4" />
            Unduh CSV
          </button>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 uppercase">Total Transaksi Log</span>
          <div className="mt-2 text-2xl font-black text-slate-900">{filtered.length}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Dalam rentang filter terpilih</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 uppercase">Rata-rata Dwell Time</span>
          <div className="mt-2 text-2xl font-black text-blue-600">2.8 Hari</div>
          <p className="text-[11px] text-emerald-600 mt-0.5">Efisiensi yard sangat baik</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 uppercase">Throughput Gerbang</span>
          <div className="mt-2 text-2xl font-black text-indigo-600">
            {filtered.filter((r) => r.activity === 'Gate In' || r.activity === 'Gate Out').length} TEU
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Arus truk masuk & keluar</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 uppercase">Quay Crane Throughput</span>
          <div className="mt-2 text-2xl font-black text-purple-600">
            {filtered.filter((r) => r.activity === 'Loading' || r.activity === 'Unloading').length} TEU
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Bongkar muat dermaga</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Cari nomor kontainer, customer, kapal, atau slot..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg"
            />
            <span>s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg"
            />
          </div>

          <select
            value={activityFilter}
            onChange={(e) => setActivityFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium"
          >
            <option value="ALL">Semua Aktivitas</option>
            <option value="Gate In">Gate In (Masuk)</option>
            <option value="Gate Out">Gate Out (Keluar)</option>
            <option value="Loading">Loading (Muat Kapal)</option>
            <option value="Unloading">Unloading (Bongkar Kapal)</option>
          </select>
        </div>
      </div>

      {/* Audit Trail Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Waktu Operasional</th>
                <th className="py-3 px-4">Jenis Aktivitas</th>
                <th className="py-3 px-4">Peti Kemas</th>
                <th className="py-3 px-4">Customer / Kapal</th>
                <th className="py-3 px-4">Lokasi / Posisi</th>
                <th className="py-3 px-4">Operator / Pengemudi</th>
                <th className="py-3 px-4">Kondisi / Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => (
                <tr key={`${r.activity}-${r.id}`} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                    {new Date(r.time).toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                        r.activity === 'Gate In'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.activity === 'Gate Out'
                          ? 'bg-amber-100 text-amber-800'
                          : r.activity === 'Loading'
                          ? 'bg-cyan-100 text-cyan-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {r.activity}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-blue-600">{r.container_number}</td>
                  <td className="py-3 px-4 font-bold text-slate-900 max-w-xs truncate">{r.customer_or_vessel}</td>
                  <td className="py-3 px-4 font-mono text-slate-700">{r.location_or_target}</td>
                  <td className="py-3 px-4 text-slate-700">{r.operator_or_driver}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

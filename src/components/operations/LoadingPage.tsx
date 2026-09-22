import React, { useState, useEffect } from 'react';
import { ArrowUpRight, Plus, Search, CheckCircle2, RefreshCw, Ship } from 'lucide-react';
import { LoadingOperation, Container, Vessel } from '../../types';
import { db } from '../../lib/database';
import { Modal } from '../common/Modal';
import { Pagination } from '../common/Pagination';
import { useToast } from '../../context/ToastContext';
import { useRealtimeSubscription } from '../../hooks/useRealtime';

export const LoadingPage: React.FC = () => {
  const { showToast } = useToast();
  const [operations, setOperations] = useState<LoadingOperation[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [yardContainers, setYardContainers] = useState<Container[]>([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    vessel_name: '',
    container_number: '',
    crane: 'Quay Crane 01 (Post Panamax)',
    operator: 'Rahmat Hidayat',
    position: 'Bay 04, Row 02, Tier 82 (On Deck)',
  });

  const loadData = async () => {
    const [ops, vs, cnts] = await Promise.all([
      db.getLoadingOperations(),
      db.getVessels(),
      db.getContainers(),
    ]);
    setOperations(ops);
    setVessels(vs);
    setYardContainers(cnts.filter((c) => c.status === 'In Yard' || c.status === 'Empty' || c.status === 'Full'));
  };

  useRealtimeSubscription(loadData);

  useEffect(() => {
    loadData();
  }, []);

  const filtered = operations.filter(
    (o) =>
      search === '' ||
      o.loading_number.toLowerCase().includes(search.toLowerCase()) ||
      o.vessel_name.toLowerCase().includes(search.toLowerCase()) ||
      o.container_number.toLowerCase().includes(search.toLowerCase()) ||
      o.crane.toLowerCase().includes(search.toLowerCase()) ||
      o.operator.toLowerCase().includes(search.toLowerCase())
  );

  const pagedItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleOpenCreate = () => {
    const targetVessel = vessels[0]?.vessel_name || 'MV Meratus Borneo';
    const targetCnt = yardContainers[0]?.container_number || '';
    setFormData({
      vessel_name: targetVessel,
      container_number: targetCnt,
      crane: 'Quay Crane 01 (Post Panamax)',
      operator: 'Rahmat Hidayat',
      position: `Bay ${Math.floor(1 + Math.random() * 20).toString().padStart(2, '0')}, Row 02, Tier 82 (On Deck)`,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.container_number.trim()) {
        showToast('warning', 'Validasi Gagal', 'Pilih peti kemas yang akan dimuat ke kapal.');
        return;
      }

      const op = await db.processLoading(formData);
      showToast(
        'success',
        'Pemuatan Berhasil (Loaded)',
        `Peti kemas ${op.container_number} berhasil dimuat ke kapal ${op.vessel_name} posisi ${op.position}.`
      );

      setIsModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      showToast('error', 'Gagal Memuat Kontainer', errMessage);
    }
  };

  return (
    <div className="space-y-5 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ArrowUpRight className="w-6 h-6 text-cyan-600" />
            Operasi Pemuatan Kapal (Loading)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pemuatan peti kemas dari lapangan (Yard) ke atas palka/dek kapal kargo menggunakan Quay Crane dermaga
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={loadData} className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            id="new-loading-btn"
            onClick={handleOpenCreate}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg shadow-sm flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            Catat Pemuatan (Loading)
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari transaksi loading, kapal, nomor kontainer, operator..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">No. Loading</th>
                <th className="py-3 px-4">Nama Kapal (Vessel)</th>
                <th className="py-3 px-4">Nomor Peti Kemas</th>
                <th className="py-3 px-4">Quay Crane</th>
                <th className="py-3 px-4">Operator Crane</th>
                <th className="py-3 px-4">Posisi Stowage Kapal</th>
                <th className="py-3 px-4">Waktu Selesai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedItems.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 font-mono font-bold text-cyan-700">{o.loading_number}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{o.vessel_name}</td>
                  <td className="py-3 px-4 font-mono font-bold text-blue-600">{o.container_number}</td>
                  <td className="py-3 px-4 text-slate-700 font-medium">{o.crane}</td>
                  <td className="py-3 px-4 text-slate-700">{o.operator}</td>
                  <td className="py-3 px-4 font-mono text-slate-800">{o.position}</td>
                  <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                    {new Date(o.date_time).toLocaleString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Pemuatan Peti Kemas ke Kapal"
        subtitle="Quay Crane loading sheet dan stowage position"
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Kapal Sandar (Vessel) *</label>
            <select
              value={formData.vessel_name}
              onChange={(e) => setFormData({ ...formData, vessel_name: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 font-bold"
            >
              {vessels.map((v) => (
                <option key={v.id} value={v.vessel_name}>
                  {v.vessel_name} ({v.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Peti Kemas di Lapangan Yard *</label>
            <select
              value={formData.container_number}
              onChange={(e) => setFormData({ ...formData, container_number: e.target.value })}
              className="w-full px-3 py-2 text-xs font-mono uppercase bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 font-bold text-blue-600"
            >
              {yardContainers.map((c) => (
                <option key={c.id} value={c.container_number}>
                  {c.container_number} ({c.size}ft {c.type} - {c.location})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Quay Crane (Dermaga) *</label>
            <select
              value={formData.crane}
              onChange={(e) => setFormData({ ...formData, crane: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
            >
              <option value="Quay Crane 01 (Post Panamax)">Quay Crane 01 (Post Panamax)</option>
              <option value="Quay Crane 02 (Super Post Panamax)">Quay Crane 02 (Super Post Panamax)</option>
              <option value="Quay Crane 03 (Feeder Crane)">Quay Crane 03 (Feeder Crane)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Operator Crane *</label>
            <input
              type="text"
              required
              placeholder="cth: Rahmat Hidayat"
              value={formData.operator}
              onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Posisi Stowage di Kapal *</label>
            <input
              type="text"
              required
              placeholder="cth: Bay 04, Row 02, Tier 82 (On Deck)"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg shadow-sm flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Selesaikan Pemuatan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { ArrowDownLeft, Plus, Search, CheckCircle2, RefreshCw } from 'lucide-react';
import { UnloadingOperation, YardLocation, Vessel, Container } from '../../types';
import { db } from '../../lib/database';
import { Modal } from '../common/Modal';
import { Pagination } from '../common/Pagination';
import { useToast } from '../../context/ToastContext';
import { useRealtimeSubscription } from '../../hooks/useRealtime';

export const UnloadingPage: React.FC = () => {
  const { showToast } = useToast();
  const [operations, setOperations] = useState<UnloadingOperation[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [availableSlots, setAvailableSlots] = useState<YardLocation[]>([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    vessel_name: '',
    container_number: '',
    crane: 'Quay Crane 02 (Super Post Panamax)',
    operator: 'Eko Prasetyo',
    position: '',
  });

  const loadData = async () => {
    const [ops, vs, locs] = await Promise.all([
      db.getUnloadingOperations(),
      db.getVessels(),
      db.getYardLocations(),
    ]);
    setOperations(ops);
    setVessels(vs);
    setAvailableSlots(locs.filter((l) => l.status === 'Available'));
  };

  useRealtimeSubscription(loadData);

  useEffect(() => {
    loadData();
  }, []);

  const filtered = operations.filter(
    (o) =>
      search === '' ||
      o.unloading_number.toLowerCase().includes(search.toLowerCase()) ||
      o.vessel_name.toLowerCase().includes(search.toLowerCase()) ||
      o.container_number.toLowerCase().includes(search.toLowerCase()) ||
      o.crane.toLowerCase().includes(search.toLowerCase()) ||
      o.operator.toLowerCase().includes(search.toLowerCase()) ||
      o.position.toLowerCase().includes(search.toLowerCase())
  );

  const pagedItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleOpenCreate = () => {
    const targetVessel = vessels[0]?.vessel_name || 'CMA CGM Palais';
    const targetSlot = availableSlots[0]?.location_code || 'B-01-01-1';
    setFormData({
      vessel_name: targetVessel,
      container_number: 'MSCU' + Math.floor(1000000 + Math.random() * 9000000),
      crane: 'Quay Crane 02 (Super Post Panamax)',
      operator: 'Eko Prasetyo',
      position: targetSlot,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.container_number.trim()) {
        showToast('warning', 'Validasi Gagal', 'Nomor kontainer wajib diisi.');
        return;
      }
      if (!formData.position) {
        showToast('warning', 'Validasi Gagal', 'Pilih slot penumpukan yard tujuan.');
        return;
      }

      const op = await db.processUnloading({
        ...formData,
        container_number: formData.container_number.toUpperCase().trim(),
      });

      showToast(
        'success',
        'Pembongkaran Selesai (Discharged)',
        `Peti kemas ${op.container_number} dari kapal ${op.vessel_name} dibongkar ke slot yard ${op.position}.`
      );

      setIsModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      showToast('error', 'Gagal Membongkar Kontainer', errMessage);
    }
  };

  return (
    <div className="space-y-5 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ArrowDownLeft className="w-6 h-6 text-purple-600" />
            Operasi Pembongkaran Kapal (Unloading / Discharging)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pembongkaran peti kemas impor/transhipment dari kapal kargo dan penempatan langsung ke slot lapangan (Yard)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={loadData} className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            id="new-unloading-btn"
            onClick={handleOpenCreate}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            Catat Pembongkaran (Unload)
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari transaksi unloading, kapal, nomor kontainer, operator, atau slot yard..."
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
                <th className="py-3 px-4">No. Unloading</th>
                <th className="py-3 px-4">Nama Kapal (Vessel)</th>
                <th className="py-3 px-4">Nomor Peti Kemas</th>
                <th className="py-3 px-4">Quay Crane</th>
                <th className="py-3 px-4">Operator Crane</th>
                <th className="py-3 px-4">Slot Penempatan Yard</th>
                <th className="py-3 px-4">Waktu Selesai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedItems.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 font-mono font-bold text-purple-700">{o.unloading_number}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{o.vessel_name}</td>
                  <td className="py-3 px-4 font-mono font-bold text-purple-600">{o.container_number}</td>
                  <td className="py-3 px-4 text-slate-700 font-medium">{o.crane}</td>
                  <td className="py-3 px-4 text-slate-700">{o.operator}</td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                    <span className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {o.position}
                    </span>
                  </td>
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
        title="Bongkar Peti Kemas dari Kapal (Unloading)"
        subtitle="Quay Crane discharge sheet dan alokasi yard"
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Kapal Pembongkaran (Vessel) *</label>
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor Peti Kemas Dibongkar *</label>
            <input
              type="text"
              required
              placeholder="cth: MSCU9182941"
              value={formData.container_number}
              onChange={(e) => setFormData({ ...formData, container_number: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 text-xs font-mono uppercase bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span>Alokasi Slot Yard Tersedia *</span>
              <span className="text-[11px] text-emerald-600 font-semibold">{availableSlots.length} slot kosong</span>
            </label>
            <select
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              className="w-full px-3 py-2 text-xs font-mono bg-emerald-50/50 border border-emerald-300 rounded-lg focus:ring-1 focus:ring-blue-500 font-bold text-emerald-800"
            >
              {availableSlots.map((s) => (
                <option key={s.id} value={s.location_code}>
                  {s.location_code} ({s.block} - Row {s.row} Bay {s.bay} Tier {s.tier})
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
              <option value="Quay Crane 02 (Super Post Panamax)">Quay Crane 02 (Super Post Panamax)</option>
              <option value="Quay Crane 01 (Post Panamax)">Quay Crane 01 (Post Panamax)</option>
              <option value="Quay Crane 03 (Feeder Crane)">Quay Crane 03 (Feeder Crane)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Operator Crane *</label>
            <input
              type="text"
              required
              placeholder="cth: Eko Prasetyo"
              value={formData.operator}
              onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
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
              className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Selesaikan Pembongkaran
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

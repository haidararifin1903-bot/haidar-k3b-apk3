import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, Plus, Search, CheckCircle2, RefreshCw } from 'lucide-react';
import { YardMovementTransaction, Container, YardLocation } from '../../types';
import { db } from '../../lib/database';
import { Modal } from '../common/Modal';
import { Pagination } from '../common/Pagination';
import { useToast } from '../../context/ToastContext';
import { useRealtimeSubscription } from '../../hooks/useRealtime';

interface YardMovementProps {
  preselectedContainer?: Container | null;
}

export const YardMovementPage: React.FC<YardMovementProps> = ({ preselectedContainer }) => {
  const { showToast } = useToast();
  const [movements, setMovements] = useState<YardMovementTransaction[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [availableSlots, setAvailableSlots] = useState<YardLocation[]>([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    container_number: '',
    from_location: '',
    to_location: '',
    equipment: 'RTG Crane 01',
    operator: 'Supriyanto',
    reason: 'Restacking & Segregasi Yard',
  });

  const loadData = async () => {
    const [mv, cnts, locs] = await Promise.all([
      db.getYardMovements(),
      db.getContainers(),
      db.getYardLocations(),
    ]);
    setMovements(mv);
    const inYard = cnts.filter((c) => c.status !== 'Gate Out' && c.location.includes('-'));
    setContainers(inYard);
    setAvailableSlots(locs.filter((l) => l.status === 'Available'));
  };

  useRealtimeSubscription(loadData);

  useEffect(() => {
    loadData();
  }, []);

  // Handle preselected container from Yard View
  useEffect(() => {
    if (preselectedContainer) {
      handleOpenCreate(preselectedContainer);
    }
  }, [preselectedContainer]);

  const filtered = movements.filter(
    (m) =>
      search === '' ||
      m.movement_number.toLowerCase().includes(search.toLowerCase()) ||
      m.container_number.toLowerCase().includes(search.toLowerCase()) ||
      m.origin_location.toLowerCase().includes(search.toLowerCase()) ||
      m.destination_location.toLowerCase().includes(search.toLowerCase()) ||
      m.equipment.toLowerCase().includes(search.toLowerCase()) ||
      m.operator.toLowerCase().includes(search.toLowerCase())
  );

  const pagedItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleOpenCreate = (target?: Container) => {
    const defaultCnt = target || containers[0];
    const defaultTo = availableSlots[0]?.location_code || 'B-01-01-1';

    setFormData({
      container_number: defaultCnt?.container_number || '',
      from_location: defaultCnt?.location || 'A-01-01-1',
      to_location: defaultTo,
      equipment: 'RTG Crane 01',
      operator: 'Supriyanto',
      reason: 'Restacking & Segregasi Yard',
    });
    setIsModalOpen(true);
  };

  const handleContainerChange = (cntNumber: string) => {
    const found = containers.find((c) => c.container_number === cntNumber);
    setFormData({
      ...formData,
      container_number: cntNumber,
      from_location: found?.location || '',
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.container_number.trim()) {
        showToast('warning', 'Validasi Gagal', 'Pilih nomor kontainer yang akan dipindahkan.');
        return;
      }
      if (formData.from_location === formData.to_location) {
        showToast('warning', 'Validasi Gagal', 'Lokasi tujuan tidak boleh sama dengan lokasi asal.');
        return;
      }

      const mv = await db.processYardMovement({
        container_number: formData.container_number,
        destination_location: formData.to_location,
        equipment: formData.equipment,
        operator: formData.operator,
        notes: formData.reason,
      });

      showToast(
        'success',
        'Peti Kemas Berhasil Dipindahkan',
        `Peti kemas ${mv.container_number} dipindahkan dari ${mv.origin_location} ke ${mv.destination_location} menggunakan ${mv.equipment}.`
      );

      setIsModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      showToast('error', 'Gagal Memindahkan Peti Kemas', errMessage);
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6 text-blue-600" />
            Perpindahan Lapangan (Yard Movement)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log pergerakan peti kemas antar slot, optimalisasi restacking, dan penyiapan jalur muat dermaga (Quay Crane)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={loadData} className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            id="new-yard-move-btn"
            onClick={() => handleOpenCreate()}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            Catat Pemindahan Baru
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nomor pemindahan, peti kemas, slot asal, tujuan, alat berat RTG..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">No. Movement</th>
                <th className="py-3 px-4">Peti Kemas</th>
                <th className="py-3 px-4">Dari Lokasi (Origin)</th>
                <th className="py-3 px-4">Ke Lokasi (Destination)</th>
                <th className="py-3 px-4">Alat Berat (Equipment)</th>
                <th className="py-3 px-4">Operator</th>
                <th className="py-3 px-4">Alasan / Catatan</th>
                <th className="py-3 px-4">Waktu Eksekusi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedItems.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 font-mono font-bold text-blue-600">{m.movement_number}</td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{m.container_number}</td>
                  <td className="py-3 px-4 font-mono text-slate-700">
                    <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {m.origin_location}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                    <span className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {m.destination_location}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{m.equipment}</td>
                  <td className="py-3 px-4 text-slate-700">{m.operator}</td>
                  <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{m.notes || '-'}</td>
                  <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                    {new Date(m.date_time).toLocaleString('id-ID', {
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

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Formulir Pemindahan Slot Yard"
        subtitle="Otorisasi pemindahan peti kemas oleh operator RTG / Reach Stacker"
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pilih Peti Kemas yang Dipindahkan *
              </label>
              <select
                value={formData.container_number}
                onChange={(e) => handleContainerChange(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono uppercase bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 font-bold text-blue-600"
              >
                {containers.map((c) => (
                  <option key={c.id} value={c.container_number}>
                    {c.container_number} (Saat ini di {c.location})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lokasi Asal (Origin Slot)</label>
              <input
                type="text"
                disabled
                value={formData.from_location}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-100 border border-slate-300 rounded-lg text-slate-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Pilih Slot Baru yang Tersedia (Available Target) *</span>
                <span className="text-[11px] text-emerald-600 font-semibold">
                  {availableSlots.length} slot kosong siap ditempati
                </span>
              </label>
              <select
                value={formData.to_location}
                onChange={(e) => setFormData({ ...formData, to_location: e.target.value })}
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Alat Berat (Equipment) *</label>
              <select
                value={formData.equipment}
                onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
              >
                <option value="RTG Crane 01">RTG Crane 01 (Rubber Tired Gantry)</option>
                <option value="RTG Crane 02">RTG Crane 02</option>
                <option value="Reach Stacker 01">Reach Stacker 01 (Konecranes)</option>
                <option value="Reach Stacker 02">Reach Stacker 02 (Kalmar)</option>
                <option value="Side Loader 01">Side Loader 01 (Empty Handler)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Operator Alat *</label>
              <input
                type="text"
                required
                placeholder="cth: Supriyanto"
                value={formData.operator}
                onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Alasan Pemindahan (Reason) *</label>
              <select
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
              >
                <option value="Restacking & Segregasi Lapangan">Restacking & Segregasi Lapangan</option>
                <option value="Persiapan Muat Kapal (Loading Prep)">Persiapan Muat Kapal (Loading Prep)</option>
                <option value="Pemeriksaan Bea Cukai (Customs Inspection)">Pemeriksaan Bea Cukai (Customs Inspection)</option>
                <option value="Perbaikan Peti Kemas (Repair Depo)">Perbaikan Peti Kemas (Repair Depo)</option>
                <option value="Pemisahan Kargo Berbahaya (DG Segregation)">Pemisahan Kargo Berbahaya (DG Segregation)</option>
              </select>
            </div>
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
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Konfirmasi Pemindahan Slot
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export const YardMovement = YardMovementPage;

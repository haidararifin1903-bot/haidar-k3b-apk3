import React, { useState, useEffect } from 'react';
import { Ship, Plus, Search, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { Vessel } from '../../types';
import { db } from '../../lib/database';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Pagination } from '../common/Pagination';
import { useToast } from '../../context/ToastContext';
import { useRealtimeSubscription } from '../../hooks/useRealtime';

export const MasterVessel: React.FC = () => {
  const { showToast } = useToast();
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vessel | null>(null);

  const [formData, setFormData] = useState({
    vessel_name: '',
    imo: '',
    call_sign: '',
    capacity: 2500,
    status: 'Expected' as Vessel['status'],
  });

  const loadData = async () => {
    const data = await db.getVessels();
    setVessels(data);
  };

  useRealtimeSubscription(loadData);

  useEffect(() => {
    loadData();
  }, []);

  const filtered = vessels.filter((v) => {
    const matchSearch =
      search === '' ||
      v.vessel_name.toLowerCase().includes(search.toLowerCase()) ||
      v.imo.toLowerCase().includes(search.toLowerCase()) ||
      v.call_sign.toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter === 'ALL' || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pagedItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      vessel_name: '',
      imo: `IMO ${Math.floor(9000000 + Math.random() * 900000)}`,
      call_sign: 'PK' + Math.random().toString(36).substring(2, 4).toUpperCase(),
      capacity: 2500,
      status: 'Expected',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v: Vessel) => {
    setEditingId(v.id);
    setFormData({
      vessel_name: v.vessel_name,
      imo: v.imo,
      call_sign: v.call_sign,
      capacity: v.capacity,
      status: v.status,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.vessel_name.trim()) {
        showToast('warning', 'Validasi Gagal', 'Nama kapal wajib diisi.');
        return;
      }

      if (editingId) {
        await db.updateVessel(editingId, formData);
        showToast('success', 'Kapal Diperbarui', `Data kapal ${formData.vessel_name} berhasil disimpan.`);
      } else {
        await db.createVessel(formData);
        showToast('success', 'Kapal Didaftarkan', `Kapal ${formData.vessel_name} berhasil ditambahkan.`);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      showToast('error', 'Gagal Menyimpan', errMessage);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await db.deleteVessel(deleteTarget.id);
      showToast('success', 'Kapal Dihapus', `Data kapal ${deleteTarget.vessel_name} telah dihapus.`);
      loadData();
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      showToast('error', 'Gagal Menghapus', errMessage);
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-5 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Ship className="w-6 h-6 text-blue-600" />
            Master Kapal (Vessels)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registrasi armada kapal peti kemas pelayaran domestik dan internasional yang berlabuh di terminal
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            Tambah Kapal
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama kapal, nomor IMO, atau call sign..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium"
        >
          <option value="ALL">Semua Status Sandar</option>
          <option value="Expected">Expected (Ditunggu)</option>
          <option value="Arrived">Arrived (Tiba di Labuh)</option>
          <option value="Berthed">Berthed (Sandar di Dermaga)</option>
          <option value="Operation">Operation (Bongkar/Muat)</option>
          <option value="Departed">Departed (Berangkat)</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Nama Kapal (Vessel Name)</th>
                <th className="py-3 px-4">Nomor IMO</th>
                <th className="py-3 px-4">Call Sign</th>
                <th className="py-3 px-4">Kapasitas (TEU)</th>
                <th className="py-3 px-4">Status Sandar</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedItems.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 font-bold text-slate-900">{v.vessel_name}</td>
                  <td className="py-3 px-4 font-mono font-semibold text-blue-600">{v.imo}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{v.call_sign}</td>
                  <td className="py-3 px-4 font-mono text-slate-800">{v.capacity.toLocaleString()} TEU</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                        v.status === 'Berthed' || v.status === 'Operation'
                          ? 'bg-emerald-100 text-emerald-800'
                          : v.status === 'Arrived'
                          ? 'bg-blue-100 text-blue-800'
                          : v.status === 'Expected'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {v.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(v)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(v)}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
        title={editingId ? 'Edit Data Kapal' : 'Daftarkan Kapal Baru'}
        subtitle="Data teknis kapal untuk operasional dermaga peti kemas"
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Kapal (Vessel Name) *</label>
            <input
              type="text"
              required
              placeholder="cth: MV Meratus Borneo"
              value={formData.vessel_name}
              onChange={(e) => setFormData({ ...formData, vessel_name: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor IMO (International Maritime Org) *</label>
            <input
              type="text"
              required
              placeholder="cth: IMO 9482176"
              value={formData.imo}
              onChange={(e) => setFormData({ ...formData, imo: e.target.value })}
              className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Call Sign *</label>
            <input
              type="text"
              required
              placeholder="cth: PKMB"
              value={formData.call_sign}
              onChange={(e) => setFormData({ ...formData, call_sign: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Kapasitas Muat (TEU) *</label>
            <input
              type="number"
              required
              min={100}
              max={30000}
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
              className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Status Keberadaan *</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as Vessel['status'] })}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
            >
              <option value="Expected">Expected</option>
              <option value="Arrived">Arrived</option>
              <option value="Berthed">Berthed</option>
              <option value="Operation">Operation</option>
              <option value="Departed">Departed</option>
            </select>
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
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
            >
              Simpan Data Kapal
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Kapal"
        message={`Hapus data kapal ${deleteTarget?.vessel_name}?`}
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Anchor, Plus, Search, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { Port } from '../../types';
import { db } from '../../lib/database';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Pagination } from '../common/Pagination';
import { useToast } from '../../context/ToastContext';

export const MasterPort: React.FC = () => {
  const { showToast } = useToast();
  const [ports, setPorts] = useState<Port[]>([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Port | null>(null);

  const [formData, setFormData] = useState({
    port_name: '',
    port_code: '',
    country: 'Indonesia',
    status: 'Active' as Port['status'],
  });

  const loadData = async () => {
    const data = await db.getPorts();
    setPorts(data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = ports.filter(
    (p) =>
      search === '' ||
      p.port_name.toLowerCase().includes(search.toLowerCase()) ||
      p.port_code.toLowerCase().includes(search.toLowerCase()) ||
      p.country.toLowerCase().includes(search.toLowerCase())
  );

  const pagedItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      port_name: '',
      port_code: '',
      country: 'Indonesia',
      status: 'Active',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Port) => {
    setEditingId(p.id);
    setFormData({
      port_name: p.port_name,
      port_code: p.port_code,
      country: p.country,
      status: p.status,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.port_name.trim() || !formData.port_code.trim()) {
        showToast('warning', 'Validasi Gagal', 'Nama pelabuhan dan kode pelabuhan wajib diisi.');
        return;
      }

      if (editingId) {
        await db.updatePort(editingId, formData);
        showToast('success', 'Pelabuhan Diperbarui', `Pelabuhan ${formData.port_name} berhasil disimpan.`);
      } else {
        await db.createPort(formData);
        showToast('success', 'Pelabuhan Ditambahkan', `Pelabuhan ${formData.port_name} (${formData.port_code}) berhasil didaftarkan.`);
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
      await db.deletePort(deleteTarget.id);
      showToast('success', 'Pelabuhan Dihapus', `Pelabuhan ${deleteTarget.port_name} telah dihapus.`);
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
            <Anchor className="w-6 h-6 text-blue-600" />
            Master Pelabuhan (Ports)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar pelabuhan asal (Port of Loading) dan tujuan (Port of Discharge) rute pelayaran peti kemas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={loadData} className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            Tambah Pelabuhan
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama pelabuhan, kode (cth: IDTPP), atau negara..."
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
                <th className="py-3 px-4">Nama Pelabuhan (Port Name)</th>
                <th className="py-3 px-4">Kode Pelabuhan (UN/LOCODE)</th>
                <th className="py-3 px-4">Negara</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedItems.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 font-bold text-slate-900">{p.port_name}</td>
                  <td className="py-3 px-4 font-mono font-bold text-blue-600">{p.port_code}</td>
                  <td className="py-3 px-4 text-slate-700 font-medium">{p.country}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(p)}
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Data Pelabuhan' : 'Tambah Pelabuhan Baru'}
        subtitle="Data pelabuhan pelayaran peti kemas"
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Pelabuhan *</label>
            <input
              type="text"
              required
              placeholder="cth: Pelabuhan Tanjung Priok"
              value={formData.port_name}
              onChange={(e) => setFormData({ ...formData, port_name: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Kode UN/LOCODE *</label>
            <input
              type="text"
              required
              placeholder="cth: IDTPP, IDSUB, SGSIN"
              value={formData.port_code}
              onChange={(e) => setFormData({ ...formData, port_code: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 text-xs font-mono uppercase bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Negara *</label>
            <input
              type="text"
              required
              placeholder="cth: Indonesia, Singapore, Malaysia"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Status Keaktifan *</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as Port['status'] })}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
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
              Simpan Data Pelabuhan
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Pelabuhan"
        message={`Hapus data pelabuhan ${deleteTarget?.port_name} (${deleteTarget?.port_code})?`}
      />
    </div>
  );
};

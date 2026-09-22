import React, { useState, useEffect } from 'react';
import { Tag, Plus, Search, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { ContainerType, ContainerSize } from '../../types';
import { db } from '../../lib/database';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Pagination } from '../common/Pagination';
import { useToast } from '../../context/ToastContext';

export const MasterContainerType: React.FC = () => {
  const { showToast } = useToast();
  const [types, setTypes] = useState<ContainerType[]>([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContainerType | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    size: '40' as ContainerSize,
    description: '',
    is_dangerous_goods: false,
    is_reefer: false,
  });

  const loadData = async () => {
    const data = await db.getContainerTypes();
    setTypes(data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = types.filter(
    (t) =>
      search === '' ||
      t.code.toLowerCase().includes(search.toLowerCase()) ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase())
  );

  const pagedItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      code: '',
      name: '',
      size: '40',
      description: '',
      is_dangerous_goods: false,
      is_reefer: false,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: ContainerType) => {
    setEditingId(t.id);
    setFormData({
      code: t.code,
      name: t.name,
      size: t.size,
      description: t.description,
      is_dangerous_goods: t.is_dangerous_goods,
      is_reefer: t.is_reefer,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.code.trim() || !formData.name.trim()) {
        showToast('warning', 'Validasi Gagal', 'Kode dan nama tipe peti kemas wajib diisi.');
        return;
      }

      if (editingId) {
        await db.updateContainerType(editingId, formData);
        showToast('success', 'Tipe Diperbarui', `Tipe ${formData.name} berhasil disimpan.`);
      } else {
        await db.createContainerType(formData);
        showToast('success', 'Tipe Ditambahkan', `Tipe ${formData.name} berhasil dibuat.`);
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
      await db.deleteContainerType(deleteTarget.id);
      showToast('success', 'Tipe Dihapus', `Tipe ${deleteTarget.name} telah dihapus.`);
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
            <Tag className="w-6 h-6 text-blue-600" />
            Master Tipe Peti Kemas (Container Types)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Klasifikasi tipe peti kemas standar ISO (20ft, 40ft, 45ft, Dry, Reefer, DG, Flat Rack, dsb)
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
            Tambah Tipe
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari kode tipe, nama, atau deskripsi..."
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
                <th className="py-3 px-4">Kode Tipe</th>
                <th className="py-3 px-4">Nama Klasifikasi</th>
                <th className="py-3 px-4">Ukuran Standar</th>
                <th className="py-3 px-4">Deskripsi Fungsi</th>
                <th className="py-3 px-4">Kategori Khusus</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedItems.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 font-mono font-bold text-blue-600">{t.code}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{t.name}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{t.size} Feet</td>
                  <td className="py-3 px-4 text-slate-600 max-w-sm truncate">{t.description}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      {t.is_reefer && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-800">
                          Reefer
                        </span>
                      )}
                      {t.is_dangerous_goods && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          Hazard / DG
                        </span>
                      )}
                      {!t.is_reefer && !t.is_dangerous_goods && (
                        <span className="text-slate-400 text-[11px]">Standard General Cargo</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(t)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(t)}
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
        title={editingId ? 'Edit Tipe Kontainer' : 'Tambah Tipe Kontainer'}
        subtitle="Spesifikasi klasifikasi peti kemas"
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Tipe (ISO Code) *</label>
            <input
              type="text"
              required
              placeholder="cth: 20GP, 40HC, 40RF"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 text-xs font-mono uppercase bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Tipe *</label>
            <input
              type="text"
              required
              placeholder="cth: 40 Feet High Cube Dry Container"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ukuran *</label>
            <select
              value={formData.size}
              onChange={(e) => setFormData({ ...formData, size: e.target.value as ContainerSize })}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
            >
              <option value="20">20 Feet</option>
              <option value="40">40 Feet</option>
              <option value="45">45 Feet</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi *</label>
            <textarea
              required
              rows={2}
              placeholder="Karakteristik kargo..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={formData.is_reefer}
                onChange={(e) => setFormData({ ...formData, is_reefer: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              Peti Kemas Pendingin (Reefer / Memerlukan Daya Listrik Plug)
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={formData.is_dangerous_goods}
                onChange={(e) => setFormData({ ...formData, is_dangerous_goods: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              Muatan Berbahaya (Dangerous Goods / B3 / Hazardous Material)
            </label>
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
              Simpan Tipe
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Tipe"
        message={`Hapus tipe peti kemas ${deleteTarget?.name}?`}
      />
    </div>
  );
};

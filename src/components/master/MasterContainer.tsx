import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { Container, ContainerStatus, ContainerSize, ContainerTypeCategory } from '../../types';
import { db } from '../../lib/database';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Pagination } from '../common/Pagination';
import { useToast } from '../../context/ToastContext';
import { useRealtimeSubscription } from '../../hooks/useRealtime';

export const MasterContainer: React.FC = () => {
  const { showToast } = useToast();
  const [containers, setContainers] = useState<Container[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sizeFilter, setSizeFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Container | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    container_number: '',
    iso_code: '42G1',
    size: '40' as ContainerSize,
    type: 'Dry' as ContainerTypeCategory,
    owner: '',
    weight: 24000,
    tare_weight: 3740,
    max_payload: 28760,
    status: 'In Yard' as ContainerStatus,
    location: 'A-01-01-1',
    seal_number: '',
  });

  const loadData = async () => {
    const data = await db.getContainers();
    setContainers(data);
  };

  useRealtimeSubscription(loadData);

  useEffect(() => {
    loadData();
  }, []);

  // Filter & Search
  const filtered = containers.filter((c) => {
    const matchSearch =
      search === '' ||
      c.container_number.toLowerCase().includes(search.toLowerCase()) ||
      c.owner.toLowerCase().includes(search.toLowerCase()) ||
      c.location.toLowerCase().includes(search.toLowerCase()) ||
      c.seal_number.toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const matchSize = sizeFilter === 'ALL' || c.size === sizeFilter;
    const matchType = typeFilter === 'ALL' || c.type === typeFilter;

    return matchSearch && matchStatus && matchSize && matchType;
  });

  const pagedItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      container_number: '',
      iso_code: '42G1',
      size: '40',
      type: 'Dry',
      owner: 'Maersk Line',
      weight: 24000,
      tare_weight: 3740,
      max_payload: 28760,
      status: 'In Yard',
      location: 'A-01-01-1',
      seal_number: `SL-${Math.floor(100000 + Math.random() * 900000)}`,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Container) => {
    setEditingId(c.id);
    setFormData({
      container_number: c.container_number,
      iso_code: c.iso_code,
      size: c.size,
      type: c.type,
      owner: c.owner,
      weight: c.weight,
      tare_weight: c.tare_weight || 3740,
      max_payload: c.max_payload || 28000,
      status: c.status,
      location: c.location,
      seal_number: c.seal_number,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cleanNumber = formData.container_number.toUpperCase().trim();
      if (!cleanNumber || cleanNumber.length < 5) {
        showToast('warning', 'Validasi Gagal', 'Nomor kontainer wajib diisi minimal 5 karakter (cth: MSKU1234567).');
        return;
      }

      if (editingId) {
        await db.updateContainer(editingId, {
          ...formData,
          container_number: cleanNumber,
        });
        showToast('success', 'Data Diperbarui', `Peti kemas ${cleanNumber} berhasil diperbarui.`);
      } else {
        await db.createContainer({
          ...formData,
          container_number: cleanNumber,
        });
        showToast('success', 'Peti Kemas Didaftarkan', `Peti kemas ${cleanNumber} berhasil ditambahkan.`);
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      showToast('error', 'Gagal Menyimpan Data', errMessage);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await db.deleteContainer(deleteTarget.id);
      showToast('success', 'Data Dihapus', `Peti kemas ${deleteTarget.container_number} berhasil dihapus.`);
      loadData();
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      showToast('error', 'Gagal Menghapus Peti Kemas', errMessage);
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Boxes className="w-6 h-6 text-blue-600" />
            Master Peti Kemas (Containers)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen inventaris fisik peti kemas terminal, nomor ISO, spesifikasi ukuran, dan riwayat lokasi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 transition"
            title="Muat Ulang"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            id="add-container-btn"
            onClick={handleOpenCreate}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            Tambah Peti Kemas
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nomor kontainer, pemilik, lokasi, atau seal..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium"
          >
            <option value="ALL">Semua Status</option>
            <option value="In Yard">In Yard</option>
            <option value="Empty">Empty</option>
            <option value="Full">Full</option>
            <option value="Gate In">Gate In</option>
            <option value="Gate Out">Gate Out</option>
            <option value="Loading">Loading</option>
            <option value="On Vessel">On Vessel</option>
            <option value="Discharged">Discharged</option>
            <option value="Damaged">Damaged</option>
          </select>

          <select
            value={sizeFilter}
            onChange={(e) => {
              setSizeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium"
          >
            <option value="ALL">Semua Ukuran</option>
            <option value="20">20 Feet</option>
            <option value="40">40 Feet</option>
            <option value="45">45 Feet</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium"
          >
            <option value="ALL">Semua Tipe</option>
            <option value="Dry">Dry</option>
            <option value="Reefer">Reefer</option>
            <option value="Dangerous Goods">Dangerous Goods</option>
            <option value="Open Top">Open Top</option>
            <option value="Flat Rack">Flat Rack</option>
            <option value="Tank">Tank</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">No. Kontainer</th>
                <th className="py-3 px-4">Ukuran & Tipe</th>
                <th className="py-3 px-4">Kode ISO</th>
                <th className="py-3 px-4">Pemilik (Owner)</th>
                <th className="py-3 px-4">Berat (Gross)</th>
                <th className="py-3 px-4">Lokasi Saat Ini</th>
                <th className="py-3 px-4">No. Segel (Seal)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedItems.length > 0 ? (
                pagedItems.map((cnt) => (
                  <tr key={cnt.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">{cnt.container_number}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800">{cnt.size} Feet</span>{' '}
                      <span className="text-slate-500">({cnt.type})</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{cnt.iso_code}</td>
                    <td className="py-3 px-4 text-slate-800 font-medium max-w-[150px] truncate">{cnt.owner}</td>
                    <td className="py-3 px-4 text-slate-700 font-mono">{cnt.weight.toLocaleString()} kg</td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-800">
                      <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {cnt.location}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">{cnt.seal_number || '-'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          cnt.status === 'In Yard'
                            ? 'bg-blue-100 text-blue-800'
                            : cnt.status === 'Empty'
                            ? 'bg-emerald-100 text-emerald-800'
                            : cnt.status === 'Damaged'
                            ? 'bg-rose-100 text-rose-800'
                            : cnt.status === 'Gate Out'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {cnt.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(cnt)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(cnt)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded transition"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                    Tidak ada data peti kemas yang cocok dengan filter.
                  </td>
                </tr>
              )}
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

      {/* Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Data Peti Kemas' : 'Tambah Peti Kemas Baru'}
        subtitle="Masukkan spesifikasi teknis dan lokasi peti kemas terminal"
        maxWidth="2xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor Peti Kemas (Container Number) *
              </label>
              <input
                type="text"
                required
                placeholder="cth: MSKU2938471"
                value={formData.container_number}
                onChange={(e) => setFormData({ ...formData, container_number: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 text-xs font-mono uppercase bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kode ISO *
              </label>
              <input
                type="text"
                required
                placeholder="cth: 42G1, 22G1, 45R1"
                value={formData.iso_code}
                onChange={(e) => setFormData({ ...formData, iso_code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ukuran (Size) *
              </label>
              <select
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value as ContainerSize })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option value="20">20 Feet</option>
                <option value="40">40 Feet</option>
                <option value="45">45 Feet</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tipe Kargo (Type) *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as ContainerTypeCategory })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option value="Dry">Dry</option>
                <option value="Reefer">Reefer</option>
                <option value="Dangerous Goods">Dangerous Goods</option>
                <option value="Open Top">Open Top</option>
                <option value="Flat Rack">Flat Rack</option>
                <option value="Tank">Tank</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pemilik (Owner / Shipping Line) *
              </label>
              <input
                type="text"
                required
                placeholder="cth: Maersk Line, CMA CGM, ONE"
                value={formData.owner}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Berat Kotor (Gross Weight kg) *
              </label>
              <input
                type="number"
                required
                min={1000}
                max={40000}
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status Operasional *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as ContainerStatus })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option value="In Yard">In Yard</option>
                <option value="Empty">Empty</option>
                <option value="Full">Full</option>
                <option value="Gate In">Gate In</option>
                <option value="Gate Out">Gate Out</option>
                <option value="Loading">Loading</option>
                <option value="On Vessel">On Vessel</option>
                <option value="Discharged">Discharged</option>
                <option value="Damaged">Damaged</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lokasi Slot (Yard Code / Lane) *
              </label>
              <input
                type="text"
                required
                placeholder="cth: A-01-01-1 atau Gate In Lane 01"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor Segel Pelayaran (Seal Number)
              </label>
              <input
                type="text"
                placeholder="cth: ML-992831"
                value={formData.seal_number}
                onChange={(e) => setFormData({ ...formData, seal_number: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
            >
              {editingId ? 'Simpan Perubahan' : 'Tambahkan Peti Kemas'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Peti Kemas"
        message={`Apakah Anda yakin ingin menghapus data peti kemas ${deleteTarget?.container_number}? Data yang telah memiliki transaksi operasional tidak dapat dihapus.`}
        confirmText="Hapus Permanen"
      />
    </div>
  );
};

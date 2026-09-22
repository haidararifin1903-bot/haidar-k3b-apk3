import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Search, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { YardLocation } from '../../types';
import { db } from '../../lib/database';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Pagination } from '../common/Pagination';
import { useToast } from '../../context/ToastContext';

export const MasterYardLocation: React.FC = () => {
  const { showToast } = useToast();
  const [locations, setLocations] = useState<YardLocation[]>([]);
  const [search, setSearch] = useState('');
  const [blockFilter, setBlockFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<YardLocation | null>(null);

  const [formData, setFormData] = useState({
    block: 'Block A',
    row: '01',
    bay: '01',
    tier: 1,
    location_code: 'A-01-01-1',
    status: 'Available' as YardLocation['status'],
    max_weight: 35000,
  });

  const loadData = async () => {
    const data = await db.getYardLocations();
    setLocations(data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = locations.filter((l) => {
    const matchSearch =
      search === '' ||
      l.location_code.toLowerCase().includes(search.toLowerCase()) ||
      (l.current_container_number && l.current_container_number.toLowerCase().includes(search.toLowerCase()));

    const matchBlock = blockFilter === 'ALL' || l.block === blockFilter;
    const matchStatus = statusFilter === 'ALL' || l.status === statusFilter;
    return matchSearch && matchBlock && matchStatus;
  });

  const pagedItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      block: 'Block A',
      row: '01',
      bay: '01',
      tier: 1,
      location_code: 'A-01-01-1',
      status: 'Available',
      max_weight: 35000,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (l: YardLocation) => {
    setEditingId(l.id);
    setFormData({
      block: l.block,
      row: l.row,
      bay: l.bay,
      tier: l.tier,
      location_code: l.location_code,
      status: l.status,
      max_weight: l.max_weight,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // derive code
      const blockLetter = formData.block.split(' ')[1] || formData.block;
      const computedCode = `${blockLetter}-${formData.row.padStart(2, '0')}-${formData.bay.padStart(2, '0')}-${formData.tier}`;

      if (editingId) {
        await db.updateYardLocation(editingId, {
          ...formData,
          location_code: computedCode,
        });
        showToast('success', 'Lokasi Diperbarui', `Slot ${computedCode} berhasil diperbarui.`);
      } else {
        await db.createYardLocation({
          ...formData,
          location_code: computedCode,
        });
        showToast('success', 'Lokasi Ditambahkan', `Slot ${computedCode} berhasil ditambahkan.`);
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
      await db.deleteYardLocation(deleteTarget.id);
      showToast('success', 'Lokasi Dihapus', `Slot ${deleteTarget.location_code} telah dihapus.`);
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
            <MapPin className="w-6 h-6 text-blue-600" />
            Master Lokasi Lapangan (Yard Locations)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen slot penumpukan kontainer (Block, Row, Bay, Tier) dan status keterisian lapangan
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
            Tambah Slot Lokasi
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari kode lokasi (cth: A-01-01-1) atau no. kontainer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={blockFilter}
            onChange={(e) => setBlockFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium"
          >
            <option value="ALL">Semua Blok</option>
            <option value="Block A">Block A</option>
            <option value="Block B">Block B</option>
            <option value="Block C">Block C</option>
            <option value="Block D">Block D</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium"
          >
            <option value="ALL">Semua Status</option>
            <option value="Available">Available (Kosong)</option>
            <option value="Occupied">Occupied (Terisi)</option>
            <option value="Reserved">Reserved (Dipesan)</option>
            <option value="Maintenance">Maintenance</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Kode Lokasi (Location Code)</th>
                <th className="py-3 px-4">Blok</th>
                <th className="py-3 px-4">Row</th>
                <th className="py-3 px-4">Bay</th>
                <th className="py-3 px-4">Tier (Tingkat)</th>
                <th className="py-3 px-4">Status Slot</th>
                <th className="py-3 px-4">Peti Kemas di Slot</th>
                <th className="py-3 px-4">Beban Max</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedItems.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 font-mono font-bold text-blue-600">{l.location_code}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{l.block}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">Row {l.row}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">Bay {l.bay}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">Tier {l.tier}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        l.status === 'Available'
                          ? 'bg-emerald-100 text-emerald-800'
                          : l.status === 'Occupied'
                          ? 'bg-blue-100 text-blue-800'
                          : l.status === 'Reserved'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {l.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">
                    {l.current_container_number ? (
                      <span className="text-blue-600">{l.current_container_number}</span>
                    ) : (
                      <span className="text-slate-400 font-normal italic">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">{(l.max_weight / 1000).toFixed(0)} Ton</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(l)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(l)}
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
        title={editingId ? 'Edit Lokasi Yard' : 'Tambah Lokasi Yard Baru'}
        subtitle="Konfigurasi koordinat spasial lapangan penumpukan"
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Blok Yard *</label>
              <select
                value={formData.block}
                onChange={(e) => setFormData({ ...formData, block: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
              >
                <option value="Block A">Block A</option>
                <option value="Block B">Block B</option>
                <option value="Block C">Block C</option>
                <option value="Block D">Block D</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor Row (01 - 10) *</label>
              <input
                type="text"
                required
                maxLength={2}
                placeholder="01"
                value={formData.row}
                onChange={(e) => setFormData({ ...formData, row: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor Bay (01 - 20) *</label>
              <input
                type="text"
                required
                maxLength={2}
                placeholder="01"
                value={formData.bay}
                onChange={(e) => setFormData({ ...formData, bay: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tier (Tingkat 1 - 5) *</label>
              <input
                type="number"
                required
                min={1}
                max={5}
                value={formData.tier}
                onChange={(e) => setFormData({ ...formData, tier: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Status Ketersediaan *</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as YardLocation['status'] })}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
            >
              <option value="Available">Available (Kosong)</option>
              <option value="Occupied">Occupied (Terisi)</option>
              <option value="Reserved">Reserved (Dipesan)</option>
              <option value="Maintenance">Maintenance (Perbaikan)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Beban Maksimum Lantai (kg) *</label>
            <input
              type="number"
              required
              min={10000}
              max={60000}
              value={formData.max_weight}
              onChange={(e) => setFormData({ ...formData, max_weight: Number(e.target.value) })}
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
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
            >
              Simpan Slot Lokasi
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Lokasi Yard"
        message={`Hapus slot lokasi ${deleteTarget?.location_code}?`}
      />
    </div>
  );
};

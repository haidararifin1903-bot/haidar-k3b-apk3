import React, { useState, useEffect } from 'react';
import { FileText, Plus, Search, CheckCircle2, RefreshCw } from 'lucide-react';
import { DeliveryOrder, Container, Customer } from '../../types';
import { db } from '../../lib/database';
import { Modal } from '../common/Modal';
import { Pagination } from '../common/Pagination';
import { useToast } from '../../context/ToastContext';
import { useRealtimeSubscription } from '../../hooks/useRealtime';

export const DeliveryOrderPage: React.FC = () => {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    customer_id: '',
    container_number: '',
    destination: 'Depo Pergudangan Marunda',
    truck_number: 'B 9182 XX',
    driver: 'Joko Widodo',
    expiry_date: '',
  });

  const loadData = async () => {
    const [dos, cnts, custs] = await Promise.all([
      db.getDeliveryOrders(),
      db.getContainers(),
      db.getCustomers(),
    ]);
    setOrders(dos);
    setContainers(cnts);
    setCustomers(custs);
  };

  useRealtimeSubscription(loadData);

  useEffect(() => {
    loadData();
  }, []);

  const filtered = orders.filter((o) => {
    const matchSearch =
      search === '' ||
      o.do_number.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      o.container_number.toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pagedItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleOpenCreate = () => {
    const targetCnt = containers[0];
    const targetCust = customers[0];
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 14);

    setFormData({
      customer_id: targetCust?.id || '',
      container_number: targetCnt?.container_number || '',
      destination: 'Depo Pergudangan Marunda',
      truck_number: 'B ' + Math.floor(1000 + Math.random() * 9000) + ' XX',
      driver: 'Joko Widodo',
      expiry_date: nextMonth.toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.customer_id) {
        showToast('warning', 'Validasi Gagal', 'Pilih customer penerima barang.');
        return;
      }
      if (!formData.container_number.trim()) {
        showToast('warning', 'Validasi Gagal', 'Pilih nomor kontainer.');
        return;
      }

      const created = await db.createDeliveryOrder(formData);
      showToast(
        'success',
        'Delivery Order Diterbitkan',
        `DO ${created.do_number} untuk ${created.customer_name} berhasil disimpan.`
      );
      setIsModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      showToast('error', 'Gagal Menerbitkan DO', errMessage);
    }
  };

  return (
    <div className="space-y-5 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Dokumen Delivery Order (DO)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengelolaan surat penyerahan barang / izin pengambilan peti kemas oleh pihak pelayaran & customer
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
            Terbitkan Delivery Order (DO)
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nomor DO, customer, atau nomor peti kemas..."
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
          <option value="ALL">Semua Status DO</option>
          <option value="Active">Active (Berlaku)</option>
          <option value="Used">Used (Telah Dipakai)</option>
          <option value="Expired">Expired (Kadaluarsa)</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Nomor DO (Delivery Order)</th>
                <th className="py-3 px-4">Customer / Shipper</th>
                <th className="py-3 px-4">Nomor Peti Kemas</th>
                <th className="py-3 px-4">Tujuan Pengiriman</th>
                <th className="py-3 px-4">Masa Berlaku</th>
                <th className="py-3 px-4">Status Izin</th>
                <th className="py-3 px-4">Tanggal Dibuat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedItems.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 font-mono font-bold text-blue-600">{o.do_number}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{o.customer_name}</td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">{o.container_number}</td>
                  <td className="py-3 px-4 text-slate-700">{o.destination}</td>
                  <td className="py-3 px-4 font-mono text-slate-700">{o.expiry_date || '-'}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                        o.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : o.status === 'Used'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                    {new Date(o.created_at).toLocaleDateString('id-ID')}
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

      {/* Modal Create DO */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Terbitkan Delivery Order (DO) Baru"
        subtitle="Otorisasi pelepasan barang oleh agen pelayaran"
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Customer Penerima *</label>
            <select
              value={formData.customer_id}
              onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 font-medium"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name} ({c.contact_person})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Peti Kemas yang Berhak Dikeluarkan *</label>
            <select
              value={formData.container_number}
              onChange={(e) => setFormData({ ...formData, container_number: e.target.value })}
              className="w-full px-3 py-2 text-xs font-mono uppercase bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 font-bold"
            >
              {containers.map((c) => (
                <option key={c.id} value={c.container_number}>
                  {c.container_number} ({c.owner} - {c.location})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tujuan Pengiriman *</label>
            <input
              type="text"
              required
              placeholder="cth: Depo Pergudangan Marunda"
              value={formData.destination}
              onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Plat Truk Armada</label>
              <input
                type="text"
                placeholder="B 9182 XX"
                value={formData.truck_number}
                onChange={(e) => setFormData({ ...formData, truck_number: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Supir</label>
              <input
                type="text"
                placeholder="Joko Widodo"
                value={formData.driver}
                onChange={(e) => setFormData({ ...formData, driver: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Masa Berlaku (Expiry Date) *</label>
            <input
              type="date"
              required
              value={formData.expiry_date}
              onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
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
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Terbitkan Dokumen DO
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

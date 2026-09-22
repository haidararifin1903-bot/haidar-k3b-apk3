import React, { useState, useEffect } from 'react';
import { LogOut, Plus, Search, Printer, CheckCircle2, RefreshCw } from 'lucide-react';
import { GateOutTransaction, Container, DeliveryOrder } from '../../types';
import { db } from '../../lib/database';
import { Modal } from '../common/Modal';
import { Pagination } from '../common/Pagination';
import { useToast } from '../../context/ToastContext';
import { useRealtimeSubscription } from '../../hooks/useRealtime';

export const GateOut: React.FC = () => {
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState<GateOutTransaction[]>([]);
  const [yardContainers, setYardContainers] = useState<Container[]>([]);
  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrder[]>([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [printedPass, setPrintedPass] = useState<GateOutTransaction | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    container_number: '',
    truck_number: '',
    driver: '',
    do_number: '',
    destination: 'Depo Marunda Logistics Hub',
    status: 'Completed' as GateOutTransaction['status'],
    notes: '',
  });

  const loadData = async () => {
    const [go, cnts, dos] = await Promise.all([
      db.getGateOutList(),
      db.getContainers(),
      db.getDeliveryOrders(),
    ]);
    setTransactions(go);
    // Containers that are in yard (not yet gate out)
    const inYard = cnts.filter((c) => c.status !== 'Gate Out');
    setYardContainers(inYard);
    setDeliveryOrders(dos.filter((d) => d.status === 'Active'));
  };

  useRealtimeSubscription(loadData);

  useEffect(() => {
    loadData();
  }, []);

  const filtered = transactions.filter(
    (t) =>
      search === '' ||
      t.transaction_number.toLowerCase().includes(search.toLowerCase()) ||
      t.container_number.toLowerCase().includes(search.toLowerCase()) ||
      t.truck_number.toLowerCase().includes(search.toLowerCase()) ||
      (t.do_number && t.do_number.toLowerCase().includes(search.toLowerCase())) ||
      t.driver.toLowerCase().includes(search.toLowerCase())
  );

  const pagedItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleOpenCreate = () => {
    const targetCnt = yardContainers[0];
    const targetDO = deliveryOrders[0];
    setFormData({
      container_number: targetCnt?.container_number || '',
      truck_number: 'B ' + Math.floor(1000 + Math.random() * 9000) + ' ZZ',
      driver: 'Joko Widodo',
      do_number: targetDO?.do_number || 'DO-2025001',
      destination: 'Depo Pergudangan Marunda',
      status: 'Completed',
      notes: 'Surat jalan dan DO lengkap diserahkan ke pos gerbang.',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.container_number.trim()) {
        showToast('warning', 'Validasi Gagal', 'Pilih nomor kontainer yang akan dikeluarkan.');
        return;
      }
      if (!formData.truck_number.trim() || !formData.driver.trim()) {
        showToast('warning', 'Validasi Gagal', 'Nomor plat armada dan pengemudi wajib diisi.');
        return;
      }

      const newTx = await db.processGateOut({
        ...formData,
        container_number: formData.container_number.toUpperCase().trim(),
        truck_number: formData.truck_number.toUpperCase().trim(),
      });

      showToast(
        'success',
        'Gate Out Berhasil Diproses',
        `Peti kemas ${newTx.container_number} telah keluar dari terminal. Slot yard kini telah bebas.`
      );

      setIsModalOpen(false);
      loadData();
      setPrintedPass(newTx);
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      showToast('error', 'Gagal Memproses Gate Out', errMessage);
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <LogOut className="w-6 h-6 text-amber-600" />
            Transaksi Gerbang Keluar (Gate Out)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pemeriksaan Delivery Order (DO), verifikasi nomor peti kemas, dan penerbitan Surat Jalan (Gate Pass)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={loadData} className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            id="new-gate-out-btn"
            onClick={handleOpenCreate}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            Proses Gate Out Baru
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nomor transaksi, nomor kontainer, plat truk, atau nomor DO..."
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
                <th className="py-3 px-4">No. Transaksi</th>
                <th className="py-3 px-4">Peti Kemas</th>
                <th className="py-3 px-4">Nomor Polisi & Supir</th>
                <th className="py-3 px-4">Nomor DO (Delivery Order)</th>
                <th className="py-3 px-4">Tujuan Pengiriman</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Waktu Keluar</th>
                <th className="py-3 px-4 text-center">Gate Pass</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedItems.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 font-mono font-bold text-amber-600">{t.transaction_number}</td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{t.container_number}</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800">{t.truck_number}</div>
                    <div className="text-[11px] text-slate-500">{t.driver}</div>
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-blue-600">{t.do_number || '-'}</td>
                  <td className="py-3 px-4 text-slate-700">{t.destination}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {t.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                    {new Date(t.date_time).toLocaleString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => setPrintedPass(t)}
                      className="p-1 text-slate-600 hover:text-amber-600 hover:bg-slate-100 rounded transition"
                      title="Cetak Surat Jalan Keluar"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
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

      {/* Modal Gate Out Entry */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Formulir Pengeluaran Kontainer (Gate Out)"
        subtitle="Verifikasi izin pelepasan peti kemas dan surat jalan resmi"
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pilih Peti Kemas di Lapangan *
              </label>
              <select
                value={formData.container_number}
                onChange={(e) => setFormData({ ...formData, container_number: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono uppercase bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
              >
                {yardContainers.map((c) => (
                  <option key={c.id} value={c.container_number}>
                    {c.container_number} ({c.size}ft {c.type} - {c.location})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor Delivery Order (DO) *
              </label>
              <select
                value={formData.do_number}
                onChange={(e) => setFormData({ ...formData, do_number: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
              >
                {deliveryOrders.map((d) => (
                  <option key={d.id} value={d.do_number}>
                    {d.do_number} - {d.customer_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor Polisi Truk Pengangkut *
              </label>
              <input
                type="text"
                required
                placeholder="cth: B 9912 XZ"
                value={formData.truck_number}
                onChange={(e) => setFormData({ ...formData, truck_number: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Pengemudi (Driver) *
              </label>
              <input
                type="text"
                required
                placeholder="cth: Joko Widodo"
                value={formData.driver}
                onChange={(e) => setFormData({ ...formData, driver: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tujuan Pengiriman Luar Terminal *
              </label>
              <input
                type="text"
                required
                placeholder="cth: Depo Pergudangan Marunda / Pabrik Cikarang"
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Gate Operator</label>
              <input
                type="text"
                placeholder="Dokumen delivery order diverifikasi valid..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
              />
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
              className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Selesaikan Gate Out & Terbitkan Surat Jalan
            </button>
          </div>
        </form>
      </Modal>

      {/* Printable Gate Pass */}
      <Modal
        isOpen={!!printedPass}
        onClose={() => setPrintedPass(null)}
        title="SURAT JALAN / GATE PASS PENGELUARAN PETI KEMAS"
        subtitle="Izin Resmi Pelepasan Peti Kemas Keluar Terminal"
        maxWidth="md"
      >
        {printedPass && (
          <div className="space-y-4 font-mono text-xs">
            <div className="border-2 border-dashed border-slate-300 p-4 rounded-xl bg-slate-50 space-y-3">
              <div className="text-center border-b border-slate-300 pb-2">
                <div className="text-sm font-black text-slate-900 tracking-wider">HAI CONTAINER TERMINAL</div>
                <div className="text-[10px] text-slate-500">SURAT JALAN GERBANG KELUAR RESMI (GATE PASS)</div>
                <div className="text-xs font-bold text-amber-600 mt-1">
                  NO: {printedPass.transaction_number}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[9px]">NOMOR PETI KEMAS:</span>
                  <span className="font-extrabold text-sm text-slate-900">{printedPass.container_number}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px]">NOMOR DO:</span>
                  <span className="font-extrabold text-sm text-blue-600">{printedPass.do_number || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px]">NO. POLISI TRUK:</span>
                  <span className="font-bold text-slate-800">{printedPass.truck_number}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px]">NAMA PENGEMUDI:</span>
                  <span className="font-bold text-slate-800">{printedPass.driver}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[9px]">TUJUAN PENGIRIMAN:</span>
                  <span className="font-bold text-slate-800">{printedPass.destination}</span>
                </div>
                <div className="col-span-2 text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                  Waktu Validasi Gerbang: {new Date(printedPass.date_time).toLocaleString('id-ID')}
                </div>
              </div>

              <div className="pt-2 text-center text-[9px] text-slate-400 italic">
                Surat jalan ini adalah bukti sah bahwa kontainer di atas telah menyelesaikan seluruh kewajiban administrasi terminal.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setPrintedPass(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Tutup
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Gate Pass
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

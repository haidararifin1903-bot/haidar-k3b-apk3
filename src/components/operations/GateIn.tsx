import React, { useState, useEffect } from 'react';
import { LogIn, Plus, Search, Printer, CheckCircle2, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { GateInTransaction, Container, YardLocation, Customer } from '../../types';
import { db } from '../../lib/database';
import { Modal } from '../common/Modal';
import { Pagination } from '../common/Pagination';
import { useToast } from '../../context/ToastContext';
import { useRealtimeSubscription } from '../../hooks/useRealtime';

export const GateIn: React.FC = () => {
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState<GateInTransaction[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [availableSlots, setAvailableSlots] = useState<YardLocation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [printedSlip, setPrintedSlip] = useState<GateInTransaction | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    container_number: '',
    size: '40' as '20' | '40' | '45',
    type: 'Dry' as 'Dry' | 'Reefer' | 'Open Top' | 'Flat Rack' | 'Tank' | 'Dangerous Goods',
    weight: 24500,
    truck_number: '',
    driver: '',
    seal_number: '',
    condition: 'Good' as GateInTransaction['condition'],
    customer_name: '',
    destination: 'Yard Stacking Block A',
    assigned_yard_location: '',
    notes: '',
  });

  const loadData = async () => {
    const [gi, cnts, locs, custs] = await Promise.all([
      db.getGateInList(),
      db.getContainers(),
      db.getYardLocations(),
      db.getCustomers(),
    ]);
    setTransactions(gi);
    setContainers(cnts);
    setAvailableSlots(locs.filter((l) => l.status === 'Available'));
    setCustomers(custs);
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
      t.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      t.driver.toLowerCase().includes(search.toLowerCase())
  );

  const pagedItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleOpenCreate = () => {
    const defaultSlot = availableSlots[0]?.location_code || 'A-01-01-1';
    const defaultCust = customers[0]?.company_name || 'PT Samudera Logistik';
    setFormData({
      container_number: '',
      truck_number: 'B ' + Math.floor(1000 + Math.random() * 9000) + ' UY',
      driver: 'Agus Santoso',
      seal_number: 'SL-' + Math.floor(100000 + Math.random() * 900000),
      condition: 'Good',
      customer_name: defaultCust,
      destination: `Yard Block ${defaultSlot.charAt(0)}`,
      assigned_yard_location: defaultSlot,
      notes: 'Pemeriksaan fisik gate in dan segel utuh.',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cleanContainerNo = formData.container_number.toUpperCase().trim();
      if (!cleanContainerNo) {
        showToast('warning', 'Validasi Gagal', 'Nomor kontainer wajib diisi.');
        return;
      }
      if (!formData.truck_number.trim() || !formData.driver.trim()) {
        showToast('warning', 'Validasi Gagal', 'Nomor truk dan nama pengemudi wajib diisi.');
        return;
      }

      const newTx = await db.processGateIn({
        ...formData,
        container_number: cleanContainerNo,
        truck_number: formData.truck_number.toUpperCase().trim(),
      });

      showToast(
        'success',
        'Gate In Berhasil Disimpan',
        `Peti kemas ${cleanContainerNo} masuk terminal dan dialokasikan ke slot ${newTx.assigned_yard_location}.`
      );

      setIsModalOpen(false);
      loadData();
      setPrintedSlip(newTx);
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      showToast('error', 'Gagal Memproses Gate In', errMessage);
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <LogIn className="w-6 h-6 text-emerald-600" />
            Transaksi Gerbang Masuk (Gate In)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan truk masuk, inspeksi fisik peti kemas, verifikasi nomor segel, dan alokasi slot penumpukan yard
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={loadData} className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            id="new-gate-in-btn"
            onClick={handleOpenCreate}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            Proses Gate In Baru
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari transaksi gate in, nomor kontainer, plat truk, customer..."
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
                <th className="py-3 px-4">Armada Truk & Supir</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Kondisi Fisik</th>
                <th className="py-3 px-4">Segel Pelayaran</th>
                <th className="py-3 px-4">Slot Dituju</th>
                <th className="py-3 px-4">Waktu Masuk</th>
                <th className="py-3 px-4 text-center">Slip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedItems.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 font-mono font-bold text-blue-600">{t.transaction_number}</td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{t.container_number}</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800">{t.truck_number}</div>
                    <div className="text-[11px] text-slate-500">{t.driver}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-700 max-w-xs truncate">{t.customer_name}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.condition === 'Good'
                          ? 'bg-emerald-100 text-emerald-800'
                          : t.condition === 'Damaged'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {t.condition}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">{t.seal_number || '-'}</td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">
                    <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                      {t.assigned_yard_location || t.destination}
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
                      onClick={() => setPrintedSlip(t)}
                      className="p-1 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded transition"
                      title="Cetak Slip Gate In"
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

      {/* Gate In Entry Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Formulir Transaksi Gate In"
        subtitle="Registrasi truk masuk gerbang terminal dan penempatan peti kemas"
        maxWidth="xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor Peti Kemas (Container) *
              </label>
              <input
                type="text"
                required
                placeholder="cth: MSKU9182345"
                value={formData.container_number}
                onChange={(e) => setFormData({ ...formData, container_number: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 text-xs font-mono uppercase bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ukuran (Size)
                </label>
                <select
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value as '20' | '40' | '45' })}
                  className="w-full px-2 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                >
                  <option value="20">20 Feet (1 TEU)</option>
                  <option value="40">40 Feet (2 TEU)</option>
                  <option value="45">45 Feet High Cube</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipe Peti Kemas
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-2 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                >
                  <option value="Dry">Dry (General)</option>
                  <option value="Reefer">Reefer (Pendingin)</option>
                  <option value="Open Top">Open Top</option>
                  <option value="Flat Rack">Flat Rack</option>
                  <option value="Tank">ISO Tank</option>
                  <option value="Dangerous Goods">Dangerous Goods (DG)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Berat Kotor / Gross Weight (kg)
              </label>
              <input
                type="number"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor Segel (Seal Number) *
              </label>
              <input
                type="text"
                required
                placeholder="cth: SL-884920"
                value={formData.seal_number}
                onChange={(e) => setFormData({ ...formData, seal_number: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor Polisi Truk *
              </label>
              <input
                type="text"
                required
                placeholder="cth: B 9283 UY"
                value={formData.truck_number}
                onChange={(e) => setFormData({ ...formData, truck_number: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Supir (Driver) *
              </label>
              <input
                type="text"
                required
                placeholder="cth: Agus Santoso"
                value={formData.driver}
                onChange={(e) => setFormData({ ...formData, driver: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pelanggan (Customer / Shipper) *
              </label>
              <select
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.company_name}>
                    {c.company_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kondisi Fisik Peti Kemas *
              </label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value as GateInTransaction['condition'] })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
              >
                <option value="Good">Good (Kondisi Baik & Bersih)</option>
                <option value="Damaged">Damaged (Penyok / Rusak)</option>
                <option value="Dirty">Dirty (Kotor / Butuh Cuci)</option>
                <option value="Seal Broken">Seal Broken (Segel Rusak)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Alokasi Slot Penumpukan Lapangan (Yard Slot) *</span>
                <span className="text-[11px] text-blue-600 font-normal">
                  {availableSlots.length} slot kosong siap dialokasikan
                </span>
              </label>
              <select
                value={formData.assigned_yard_location}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    assigned_yard_location: e.target.value,
                    destination: `Yard Block ${e.target.value.charAt(0)}`,
                  })
                }
                className="w-full px-3 py-2 text-xs font-mono bg-blue-50/50 border border-blue-300 rounded-lg focus:ring-1 focus:ring-blue-500 text-slate-900 font-bold"
              >
                {availableSlots.map((s) => (
                  <option key={s.id} value={s.location_code}>
                    {s.location_code} ({s.block} - Row {s.row} Bay {s.bay} Tier {s.tier})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Gate Operator</label>
              <input
                type="text"
                placeholder="cth: Segel dicek utuh, tidak ada kebocoran atau karat."
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
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Selesaikan Proses Masuk & Cetak Slip
            </button>
          </div>
        </form>
      </Modal>

      {/* Slip Gate In Modal */}
      <Modal
        isOpen={!!printedSlip}
        onClose={() => setPrintedSlip(null)}
        title="KARTU MASUK / SLIP GATE IN RESMI"
        subtitle="Terminal Peti Kemas HAI CONTAINER - Port Operating System"
        maxWidth="md"
      >
        {printedSlip && (
          <div className="space-y-4 font-mono text-xs">
            <div className="border-2 border-dashed border-slate-300 p-4 rounded-xl bg-slate-50 space-y-3">
              <div className="text-center border-b border-slate-300 pb-2">
                <div className="text-sm font-black text-slate-900 tracking-wider">HAI CONTAINER TERMINAL</div>
                <div className="text-[10px] text-slate-500">TERMINAL OPERATING SYSTEM (TOS)</div>
                <div className="text-xs font-bold text-blue-600 mt-1">
                  NO: {printedSlip.transaction_number}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[9px]">NO. PETI KEMAS:</span>
                  <span className="font-extrabold text-sm text-slate-900">{printedSlip.container_number}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px]">SLOT PENUMPUKAN:</span>
                  <span className="font-extrabold text-sm text-emerald-600">{printedSlip.assigned_yard_location}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px]">NO. POLISI TRUK:</span>
                  <span className="font-bold text-slate-800">{printedSlip.truck_number}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px]">PENGEMUDI (DRIVER):</span>
                  <span className="font-bold text-slate-800">{printedSlip.driver}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px]">SEAL PELAYARAN:</span>
                  <span className="font-bold text-slate-800">{printedSlip.seal_number || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px]">KONDISI FISIK:</span>
                  <span className="font-bold text-slate-800">{printedSlip.condition}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[9px]">CUSTOMER:</span>
                  <span className="font-bold text-slate-800">{printedSlip.customer_name}</span>
                </div>
                <div className="col-span-2 text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                  Waktu: {new Date(printedSlip.date_time).toLocaleString('id-ID')}
                </div>
              </div>

              <div className="pt-2 text-center text-[9px] text-slate-400 italic">
                Harap ikuti jalur marka dan panduan RTG operator di lapangan penumpukan.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setPrintedSlip(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Tutup
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Slip
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Grid3X3,
  Search,
  Filter,
  ArrowRightLeft,
  Info,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
} from 'lucide-react';
import { YardLocation, Container, ContainerStatus } from '../../types';
import { db } from '../../lib/database';
import { Modal } from '../common/Modal';
import { useToast } from '../../context/ToastContext';
import { useRealtimeSubscription } from '../../hooks/useRealtime';

interface YardViewProps {
  onRelocateContainer?: (container: Container) => void;
  selectedContainerFromGlobal?: Container | null;
}

export const YardView: React.FC<YardViewProps> = ({
  onRelocateContainer,
  selectedContainerFromGlobal,
}) => {
  const { showToast } = useToast();
  const [selectedBlock, setSelectedBlock] = useState<'Block A' | 'Block B' | 'Block C' | 'Block D'>('Block A');
  const [locations, setLocations] = useState<YardLocation[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedSlot, setSelectedSlot] = useState<YardLocation | null>(null);
  const [inspectedContainer, setInspectedContainer] = useState<Container | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const loadYardData = async () => {
    const [allLocs, allCnts] = await Promise.all([
      db.getYardLocations(),
      db.getContainers(),
    ]);
    setLocations(allLocs);
    setContainers(allCnts);
  };

  useRealtimeSubscription(loadYardData);

  useEffect(() => {
    loadYardData();
  }, []);

  // Handle container selected from global navbar search
  useEffect(() => {
    if (selectedContainerFromGlobal && selectedContainerFromGlobal.location.includes('-')) {
      const parts = selectedContainerFromGlobal.location.split('-');
      const blockLetter = parts[0];
      const targetBlock = `Block ${blockLetter}` as 'Block A' | 'Block B' | 'Block C' | 'Block D';
      setSelectedBlock(targetBlock);
      setSearchQuery(selectedContainerFromGlobal.container_number);
    }
  }, [selectedContainerFromGlobal]);

  // Current block locations
  const blockLocations = locations.filter((l) => l.block === selectedBlock);

  // Group by Row (1..4) and Bay (1..6)
  const rows = [1, 2, 3, 4];
  const bays = [1, 2, 3, 4, 5, 6];
  const tiers = [3, 2, 1]; // Render top tier first

  const getContainerAt = (locCode: string): Container | undefined => {
    return containers.find((c) => c.location === locCode);
  };

  const handleSlotClick = (loc: YardLocation) => {
    setSelectedSlot(loc);
    const cnt = getContainerAt(loc.location_code);
    if (cnt) {
      setInspectedContainer(cnt);
      setIsDetailModalOpen(true);
    } else {
      setInspectedContainer(null);
      setIsDetailModalOpen(true);
    }
  };

  // Color mapping based on container status and type
  const getContainerVisual = (cnt?: Container) => {
    if (!cnt) {
      return {
        bg: 'bg-slate-50 hover:bg-blue-50 border-dashed border-slate-300 text-slate-400',
        label: 'Kosong',
        tag: 'SLOT KOSONG',
      };
    }

    if (cnt.status === 'Damaged') {
      return {
        bg: 'bg-rose-500 hover:bg-rose-600 text-white border-rose-600 shadow-xs',
        label: 'Rusak',
        tag: 'DAMAGED',
      };
    }
    if (cnt.type === 'Dangerous Goods') {
      return {
        bg: 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-xs',
        label: 'DG / Hazard',
        tag: 'DG CARGO',
      };
    }
    if (cnt.type === 'Reefer') {
      return {
        bg: 'bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-700 shadow-xs',
        label: 'Reefer',
        tag: 'REEFER',
      };
    }
    if (cnt.status === 'Empty') {
      return {
        bg: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-xs',
        label: 'Empty',
        tag: 'EMPTY',
      };
    }
    if (cnt.status === 'Discharged') {
      return {
        bg: 'bg-purple-600 hover:bg-purple-700 text-white border-purple-700 shadow-xs',
        label: 'Discharged',
        tag: 'DISCHARGED',
      };
    }

    // Default Full / Dry
    return {
      bg: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700 shadow-xs',
      label: 'Full / Dry',
      tag: `${cnt.size}ft FULL`,
    };
  };

  const blockOccupied = blockLocations.filter((l) => l.status === 'Occupied').length;
  const blockCapacity = blockLocations.length || 72;
  const blockOccupancyRate = Math.round((blockOccupied / blockCapacity) * 100);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Grid3X3 className="w-6 h-6 text-blue-600" />
            Visualisasi Lapangan Penumpukan (Yard View)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitoring spatial penumpukan peti kemas interaktif berdasarkan Blok, Row, Bay, dan Tier
          </p>
        </div>

        {/* Legend pills */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
          <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-blue-100 text-blue-800">
            <span className="w-2.5 h-2.5 rounded bg-blue-600" /> Full (Dry)
          </span>
          <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-100 text-emerald-800">
            <span className="w-2.5 h-2.5 rounded bg-emerald-600" /> Empty
          </span>
          <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-cyan-100 text-cyan-800">
            <span className="w-2.5 h-2.5 rounded bg-cyan-600" /> Reefer
          </span>
          <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-100 text-amber-800">
            <span className="w-2.5 h-2.5 rounded bg-amber-600" /> Dangerous Goods
          </span>
          <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-rose-100 text-rose-800">
            <span className="w-2.5 h-2.5 rounded bg-rose-500" /> Damaged
          </span>
          <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 text-slate-700">
            <span className="w-2.5 h-2.5 rounded border border-dashed border-slate-400 bg-white" /> Kosong
          </span>
        </div>
      </div>

      {/* Block Selector & Filters Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Block Selector Buttons */}
        <div className="flex items-center gap-2">
          {(['Block A', 'Block B', 'Block C', 'Block D'] as const).map((block) => (
            <button
              key={block}
              id={`yard-tab-${block.replace(' ', '-').toLowerCase()}`}
              onClick={() => setSelectedBlock(block)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                selectedBlock === block
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>{block}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                  selectedBlock === block ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {locations.filter((l) => l.block === block && l.status === 'Occupied').length}/72
              </span>
            </button>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari No. Kontainer / Slot..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 font-medium"
            >
              <option value="ALL">Semua Status</option>
              <option value="In Yard">In Yard</option>
              <option value="Empty">Empty</option>
              <option value="Full">Full</option>
              <option value="Damaged">Damaged</option>
              <option value="Available">Slot Kosong</option>
            </select>
          </div>
        </div>
      </div>

      {/* Block Information Strip */}
      <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-base">
            {selectedBlock.split(' ')[1]}
          </div>
          <div>
            <h2 className="font-extrabold text-base leading-tight">{selectedBlock} Terminal Stacking</h2>
            <p className="text-xs text-slate-400">
              Konfigurasi: 4 Rows × 6 Bays × 3 Tiers (Maksimum 72 Ground Slots & Stacks)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Terisi (Occupied)</span>
            <span className="font-bold text-emerald-400 text-sm font-mono">{blockOccupied} TEU</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Tersedia (Available)</span>
            <span className="font-bold text-blue-400 text-sm font-mono">{blockCapacity - blockOccupied} TEU</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Tingkat Okupansi</span>
            <span className="font-bold text-white text-sm font-mono">{blockOccupancyRate}%</span>
          </div>
        </div>
      </div>

      {/* Yard Matrix Visualizer: Row-by-Row Stacks */}
      <div className="space-y-6">
        {rows.map((rowNum) => {
          const rowStr = rowNum.toString().padStart(2, '0');
          return (
            <div
              key={rowNum}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3 overflow-hidden"
            >
              {/* Row Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded bg-slate-800 text-white font-mono font-bold text-xs">
                    ROW {rowStr}
                  </span>
                  <span className="text-xs text-slate-500">
                    Sisi Dermaga / Jalur RTG ({selectedBlock}-ROW {rowStr})
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">Bays 01 s/d 06</span>
              </div>

              {/* Bays Columns Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-1">
                {bays.map((bayNum) => {
                  const bayStr = bayNum.toString().padStart(2, '0');
                  return (
                    <div
                      key={bayNum}
                      className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200 space-y-2"
                    >
                      <div className="text-center font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wider pb-1 border-b border-slate-200">
                        BAY {bayStr}
                      </div>

                      {/* Tiers Stack: Tier 3 at top, Tier 2 middle, Tier 1 ground */}
                      <div className="flex flex-col gap-1.5">
                        {tiers.map((tierNum) => {
                          const locCode = `${selectedBlock.split(' ')[1]}-${rowStr}-${bayStr}-${tierNum}`;
                          const loc = blockLocations.find((l) => l.location_code === locCode);
                          const cnt = getContainerAt(locCode);
                          const visual = getContainerVisual(cnt);

                          // Highlight match if searched
                          const isSearchMatch =
                            searchQuery &&
                            ((cnt && cnt.container_number.includes(searchQuery.toUpperCase())) ||
                              locCode.includes(searchQuery.toUpperCase()));

                          // Filter condition
                          if (statusFilter !== 'ALL') {
                            if (statusFilter === 'Available' && cnt) return null;
                            if (statusFilter !== 'Available' && (!cnt || cnt.status !== statusFilter)) return null;
                          }

                          return (
                            <button
                              key={tierNum}
                              id={`slot-${locCode}`}
                              onClick={() => loc && handleSlotClick(loc)}
                              className={`w-full text-left p-2 rounded-md border text-[11px] transition-all relative ${
                                visual.bg
                              } ${
                                isSearchMatch
                                  ? 'ring-3 ring-amber-400 scale-[1.03] z-10 shadow-lg'
                                  : 'hover:scale-[1.02]'
                              }`}
                            >
                              <div className="flex items-center justify-between leading-none">
                                <span className="font-mono text-[9px] opacity-75 font-semibold">
                                  T{tierNum}
                                </span>
                                <span className="font-mono text-[9px] font-bold opacity-90">
                                  {locCode}
                                </span>
                              </div>

                              {cnt ? (
                                <div className="mt-1">
                                  <div className="font-mono font-bold tracking-tight truncate leading-snug">
                                    {cnt.container_number}
                                  </div>
                                  <div className="flex items-center justify-between text-[9px] opacity-90 mt-0.5">
                                    <span>{cnt.size}ft {cnt.type}</span>
                                    <span>{(cnt.weight / 1000).toFixed(1)}t</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-400 italic py-1 text-center font-medium">
                                  Kosong
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Container Slot Detail Modal */}
      <Modal
        id="yard-slot-detail-modal"
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={inspectedContainer ? `Informasi Peti Kemas: ${inspectedContainer.container_number}` : `Detail Slot: ${selectedSlot?.location_code}`}
        subtitle={inspectedContainer ? `Lokasi Stacking: ${inspectedContainer.location}` : 'Slot penumpukan ini sedang kosong dan siap digunakan.'}
        maxWidth="lg"
      >
        {inspectedContainer ? (
          <div className="space-y-5">
            {/* Top Badge */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Nomor Peti Kemas</span>
                <div className="text-xl font-mono font-extrabold text-blue-600">
                  {inspectedContainer.container_number}
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                {inspectedContainer.status}
              </span>
            </div>

            {/* Container Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Ukuran (Size)</span>
                <span className="font-bold text-slate-800 text-sm">{inspectedContainer.size} Feet</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Tipe Kargo</span>
                <span className="font-bold text-slate-800 text-sm">{inspectedContainer.type}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Kode ISO</span>
                <span className="font-bold font-mono text-slate-800 text-sm">{inspectedContainer.iso_code}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Berat Total (Gross)</span>
                <span className="font-bold text-slate-800 text-sm">{inspectedContainer.weight.toLocaleString()} kg</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Nomor Segel (Seal)</span>
                <span className="font-bold font-mono text-slate-800 text-sm">{inspectedContainer.seal_number || '-'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Pemilik (Owner)</span>
                <span className="font-bold text-slate-800 text-sm truncate block">{inspectedContainer.owner}</span>
              </div>
            </div>

            {/* Spatial Location Info */}
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between">
              <div>
                <span className="font-bold block text-sm">Posisi Lapangan: {inspectedContainer.location}</span>
                <span className="text-blue-700 text-[11px]">
                  Tercatat sejak: {new Date(inspectedContainer.created_at).toLocaleString('id-ID')}
                </span>
              </div>
              <Layers className="w-6 h-6 text-blue-500" />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                Tutup
              </button>
              {onRelocateContainer && (
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    onRelocateContainer(inspectedContainer);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 transition"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  Pindahkan Kontainer (Yard Movement)
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-center py-6">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-800">Slot Siap Digunakan</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Lokasi <span className="font-mono font-bold text-slate-900">{selectedSlot?.location_code}</span> saat ini tidak ditempati peti kemas. Anda dapat mengarahkan transaksi Gate In, Yard Movement, atau Bongkar Kapal (Unloading) ke slot ini.
              </p>
            </div>
            <button
              onClick={() => setIsDetailModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg"
            >
              Tutup
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};

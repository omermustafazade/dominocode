import { useMemo, useState } from 'react';
import {
  Activity,
  Flame,
  FolderTree,
  GitBranch,
  Repeat,
  Search,
  ShieldCheck,
} from 'lucide-react';
import type { AnalysisResponse, HealthGrade, RiskLevel } from '../types';

interface LeftSidebarProps {
  data: AnalysisResponse;
  selectedIds: string[];
  directCount: number;
  indirectCount: number;
  blastPercentage: number;
  onFocusNode: (id: string) => void;
}

const GRADE_CONFIG: Record<
  HealthGrade,
  { badge: string; bar: string; label: string }
> = {
  A: {
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    bar: 'bg-emerald-400',
    label: 'Çok Sağlıklı Mimari',
  },
  B: {
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    bar: 'bg-cyan-400',
    label: 'Dengeli Modüler Yapı',
  },
  C: {
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    bar: 'bg-amber-400',
    label: 'Orta Bağımlılık Riski',
  },
  D: {
    badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    bar: 'bg-orange-400',
    label: 'Yüksek Kırılganlık',
  },
  F: {
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    bar: 'bg-rose-500',
    label: 'Kritik Mimari Borç',
  },
};

const RISK_DOT: Record<RiskLevel, string> = {
  critical: 'bg-rose-500',
  high: 'bg-amber-400',
  medium: 'bg-sky-400',
  low: 'bg-zinc-600',
};

export function LeftSidebar({
  data,
  selectedIds,
  directCount,
  indirectCount,
  blastPercentage,
  onFocusNode,
}: LeftSidebarProps) {
  const [activeTab, setActiveTab] = useState<'hotspots' | 'files'>('hotspots');
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'critical' | 'circular'>('all');

  const healthScore = data.repo.healthScore ?? 80;
  const healthGrade = data.repo.healthGrade ?? 'B';
  const gradeInfo = GRADE_CONFIG[healthGrade];

  const totalFiles = Math.max(data.repo.totalFiles, 1);
  const directPct = Math.min(100, Math.round((directCount / totalFiles) * 100));
  const indirectPct = Math.min(100 - directPct, Math.round((indirectCount / totalFiles) * 100));

  const filteredNodes = useMemo(() => {
    return data.nodes
      .filter((n) => {
        if (riskFilter === 'critical' && n.risk !== 'critical' && n.risk !== 'high') {
          return false;
        }
        if (riskFilter === 'circular' && n.circularPartners.length === 0) {
          return false;
        }
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return n.label.toLowerCase().includes(q) || n.folder.toLowerCase().includes(q);
      })
      .sort((a, b) => b.totalImpact - a.totalImpact);
  }, [data.nodes, riskFilter, searchQuery]);

  const jumpToFirstCircular = () => {
    const circularNode = data.nodes.find((n) => n.circularPartners.length > 0);
    if (circularNode) {
      onFocusNode(circularNode.id);
    }
  };

  return (
    <aside className="w-76 border-r border-zinc-800/90 bg-zinc-950/90 p-3.5 flex flex-col gap-3.5 overflow-hidden shrink-0">
      {/* 1. Mimari Sağlık Karnesi */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              Mimari Sağlık Karnesi
            </div>
            <div className="text-xs font-semibold text-zinc-100 mt-1">
              {gradeInfo.label}
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">
              Skor: <span className="text-zinc-300 font-semibold">{healthScore}</span> / 100
            </div>
          </div>

          <div
            className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center text-xl font-black shrink-0 ${gradeInfo.badge}`}
          >
            {healthGrade}
          </div>
        </div>

        <div className="mt-3 h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${gradeInfo.bar}`}
            style={{ width: `${healthScore}%` }}
          />
        </div>
      </div>

      {/* 2. Kompakt Repo Metrik Şeridi */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-xl p-2.5 text-center">
          <div className="text-[10px] text-zinc-500 uppercase font-semibold">Dosya</div>
          <div className="text-base font-bold text-zinc-100 mt-0.5">{data.repo.totalFiles}</div>
        </div>
        <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-xl p-2.5 text-center">
          <div className="text-[10px] text-zinc-500 uppercase font-semibold">Bağlantı</div>
          <div className="text-base font-bold text-cyan-400 mt-0.5">{data.edges.length}</div>
        </div>
        <button
          type="button"
          onClick={jumpToFirstCircular}
          disabled={data.repo.circularCount === 0}
          title={
            data.repo.circularCount > 0
              ? 'Döngüsel bağımlılığa sahip dosyaya git'
              : 'Döngüsel bağımlılık bulunmadı'
          }
          className={`border rounded-xl p-2.5 text-center transition ${
            data.repo.circularCount > 0
              ? 'bg-purple-950/35 border-purple-500/40 hover:bg-purple-950/60 cursor-pointer'
              : 'bg-zinc-900/80 border-zinc-800/90 cursor-default'
          }`}
        >
          <div className="text-[10px] text-zinc-400 uppercase font-semibold">Döngü</div>
          <div
            className={`text-base font-bold mt-0.5 ${
              data.repo.circularCount > 0 ? 'text-purple-400' : 'text-zinc-500'
            }`}
          >
            {data.repo.circularCount}
          </div>
        </button>
      </div>

      {/* 3. Canlı Domino Etki Alanı Çubuğu */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            Etki Dalga Alanı
          </span>
          <span className="text-sm font-black text-cyan-400">%{blastPercentage}</span>
        </div>

        {/* Çok renkli etki barı */}
        <div className="mt-2.5 h-2 w-full bg-zinc-800 rounded-full overflow-hidden flex">
          <div
            className="bg-rose-500 h-full transition-all duration-300"
            style={{ width: `${directPct}%` }}
            title={`Doğrudan etki: ${directCount} dosya`}
          />
          <div
            className="bg-amber-400 h-full transition-all duration-300"
            style={{ width: `${indirectPct}%` }}
            title={`Dolaylı domino: ${indirectCount} dosya`}
          />
        </div>

        <div className="mt-2.5 flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5 text-rose-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Doğrudan: {directCount}
          </span>
          <span className="flex items-center gap-1.5 text-amber-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Dolaylı: {indirectCount}
          </span>
        </div>
      </div>

      {/* 4. Sekmeli Alt Alan (Hotspots vs Tüm Dosyalar) */}
      <div className="flex-1 flex flex-col min-h-0 bg-zinc-900/60 border border-zinc-800/90 rounded-2xl p-2.5">
        <div className="grid grid-cols-2 gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800/80 mb-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('hotspots')}
            className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition ${
              activeTab === 'hotspots'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            Kritik ({data.hotspots.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition ${
              activeTab === 'files'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5 text-cyan-400" />
            Dosyalar ({data.nodes.length})
          </button>
        </div>

        {activeTab === 'hotspots' ? (
          <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
            {data.hotspots.length === 0 ? (
              <div className="text-xs text-zinc-500 text-center py-6">
                Bağımlılık oluşturan kritik dosya bulunamadı.
              </div>
            ) : (
              data.hotspots.map((spot, index) => {
                const isSelected = selectedIds.includes(spot.id);
                const maxImpact = Math.max(data.hotspots[0]?.totalImpact || 1, 1);
                const barWidth = Math.max(15, Math.round((spot.totalImpact / maxImpact) * 100));

                return (
                  <button
                    key={spot.id}
                    type="button"
                    onClick={() => onFocusNode(spot.id)}
                    className={`w-full text-left p-2.5 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-400/60 shadow-[0_0_15px_rgba(34,211,238,0.12)]'
                        : 'bg-zinc-900/90 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-black text-zinc-500 bg-zinc-950 border border-zinc-800 w-5 h-5 rounded-md flex items-center justify-center shrink-0">
                          #{index + 1}
                        </span>
                        <span className="text-xs font-semibold text-zinc-100 truncate">
                          {spot.label}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-rose-400 shrink-0">
                        {spot.totalImpact} etki
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500">
                      <span className="truncate max-w-[140px] font-mono">{spot.id}</span>
                      <span>{spot.directCount} doğrudan</span>
                    </div>

                    <div className="mt-1.5 h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-rose-500 to-amber-400 rounded-full"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="relative mb-2 shrink-0">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Dosya veya klasör ara..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/60"
              />
            </div>

            <div className="flex items-center gap-1 mb-2 shrink-0">
              {[
                { id: 'all', label: 'Tümü' },
                { id: 'critical', label: 'Yüksek Risk' },
                { id: 'circular', label: 'Döngüsel' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setRiskFilter(pill.id as 'all' | 'critical' | 'circular')}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold cursor-pointer transition ${
                    riskFilter === pill.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-zinc-950 text-zinc-500 border border-zinc-800 hover:text-zinc-300'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
              {filteredNodes.map((n) => {
                const isSelected = selectedIds.includes(n.id);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => onFocusNode(n.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-cyan-500/15 text-cyan-200 border border-cyan-500/40'
                        : 'hover:bg-zinc-800/80 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${RISK_DOT[n.risk]}`} />
                      <span className="truncate">{n.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {n.circularPartners.length > 0 && (
                        <Repeat className="w-3 h-3 text-purple-400" />
                      )}
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {n.totalImpact}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
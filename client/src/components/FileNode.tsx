import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { Clock, FileCode2, Flame, Repeat, User } from 'lucide-react';
import type { FileHeatStats, HeatLevel, RiskLevel } from '../types';

export type ImpactState = 'selected' | 'direct' | 'indirect' | 'dimmed' | 'normal';

export type FileNodeData = {
  label: string;
  folder: string;
  lines: number;
  risk: RiskLevel;
  totalImpact: number;
  hasCircular: boolean;
  impactState: ImpactState;
  heatmapMode: boolean;
  heat?: FileHeatStats;
} & Record<string, unknown>;

export type CustomFileNode = Node<FileNodeData, 'fileNode'>;

const STATE_STYLES: Record<ImpactState, string> = {
  selected:
    'border-cyan-400 bg-zinc-900 shadow-[0_0_28px_rgba(34,211,238,0.4)] scale-[1.03]',
  direct:
    'border-rose-500/90 bg-rose-950/75 shadow-[0_0_20px_rgba(244,63,94,0.3)]',
  indirect:
    'border-amber-500/85 bg-amber-950/65 shadow-[0_0_16px_rgba(245,158,11,0.22)]',
  dimmed: 'border-zinc-800/80 bg-zinc-900/35 opacity-30',
  normal: 'border-zinc-800 bg-zinc-900/95 hover:border-zinc-600',
};

const HEAT_CARD_STYLES: Record<HeatLevel, string> = {
  burning:
    'border-rose-500 bg-gradient-to-br from-rose-950/90 via-orange-950/75 to-zinc-900 shadow-[0_0_26px_rgba(244,63,94,0.38)]',
  hot:
    'border-orange-500/90 bg-gradient-to-br from-orange-950/80 to-zinc-900 shadow-[0_0_18px_rgba(249,115,22,0.26)]',
  warm:
    'border-amber-400/70 bg-gradient-to-br from-amber-950/55 to-zinc-900',
  cold:
    'border-sky-500/40 bg-gradient-to-br from-sky-950/45 to-zinc-900/95',
};

const HEAT_BADGE: Record<HeatLevel, { text: string; style: string }> = {
  burning: { text: 'ÇOK SICAK', style: 'bg-rose-500 text-white' },
  hot: { text: 'SICAK', style: 'bg-orange-500 text-zinc-950' },
  warm: { text: 'ILIK', style: 'bg-amber-400 text-zinc-950' },
  cold: { text: 'STABİL', style: 'bg-sky-500/25 text-sky-300 border border-sky-500/40' },
};

const RISK_BADGE: Record<RiskLevel, string> = {
  critical: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  high: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  medium: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  low: 'bg-zinc-800/90 text-zinc-400 border-zinc-700/80',
};

const STATE_TAG: Partial<Record<ImpactState, { text: string; style: string }>> = {
  selected: { text: 'ODAK', style: 'bg-cyan-400 text-zinc-950' },
  direct: { text: 'DOĞRUDAN', style: 'bg-rose-500 text-white' },
  indirect: { text: 'DOLAYLI', style: 'bg-amber-500 text-zinc-950' },
};

function getLayerAccent(folder: string): string {
  const lower = folder.toLowerCase();
  if (lower.includes('service') || lower.includes('api')) return 'border-l-cyan-400';
  if (lower.includes('page') || lower.includes('component') || lower.includes('view')) {
    return 'border-l-violet-400';
  }
  if (lower.includes('util') || lower.includes('helper') || lower.includes('lib')) {
    return 'border-l-emerald-400';
  }
  if (lower.includes('store') || lower.includes('core') || lower.includes('math')) {
    return 'border-l-amber-400';
  }
  return 'border-l-zinc-600';
}

function formatShortTime(isoDate?: string): string {
  if (!isoDate) return '-';
  const diffMs = Date.now() - new Date(isoDate).getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return 'Az önce';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${Math.max(1, mins)} dk`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} gün`;
  return `${Math.floor(days / 30)} ay`;
}

export function FileNode({ data }: NodeProps<CustomFileNode>) {
  const tag = STATE_TAG[data.impactState];
  const layerAccent = getLayerAccent(data.folder);
  const heatLevel: HeatLevel = data.heat?.heatLevel ?? 'cold';
  const heatBadge = HEAT_BADGE[heatLevel];

  const cardStyle = data.heatmapMode
    ? `${HEAT_CARD_STYLES[heatLevel]} ${
        data.impactState === 'selected' ? 'ring-2 ring-cyan-400 scale-[1.03]' : ''
      }`
    : `${layerAccent} ${STATE_STYLES[data.impactState]}`;

  return (
    <div
      className={`w-[238px] rounded-xl border ${
        data.heatmapMode ? '' : 'border-l-4'
      } px-3.5 py-2.5 transition-all duration-200 cursor-pointer backdrop-blur-sm ${cardStyle}`}
    >
      <Handle type="target" position={Position.Left} className="!bg-zinc-500 !w-2 !h-2 !border-zinc-900" />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {data.heatmapMode ? (
            <Flame
              className={`w-3.5 h-3.5 shrink-0 ${
                heatLevel === 'burning'
                  ? 'text-rose-400'
                  : heatLevel === 'hot'
                  ? 'text-orange-400'
                  : heatLevel === 'warm'
                  ? 'text-amber-300'
                  : 'text-sky-400'
              }`}
            />
          ) : (
            <FileCode2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          )}
          <span className="text-xs font-semibold text-zinc-100 truncate">{data.label}</span>
        </div>

        {data.heatmapMode ? (
          <span className={`text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded shrink-0 ${heatBadge.style}`}>
            {heatBadge.text}
          </span>
        ) : tag ? (
          <span className={`text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded ${tag.style}`}>
            {tag.text}
          </span>
        ) : (
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${RISK_BADGE[data.risk]}`}
          >
            {data.totalImpact} etki
          </span>
        )}
      </div>

      {data.heatmapMode ? (
        <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-300 gap-1.5">
          <span className="flex items-center gap-1 truncate max-w-[125px]" title={data.heat?.lastAuthor}>
            <User className="w-3 h-3 text-zinc-400 shrink-0" />
            <span className="truncate">{data.heat?.lastAuthor ?? 'Bilinmiyor'}</span>
          </span>
          <span className="flex items-center gap-1.5 shrink-0 text-zinc-400 font-mono">
            <span className="flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {formatShortTime(data.heat?.lastModified)}
            </span>
            <span>·</span>
            <span className="text-zinc-200 font-semibold">{data.heat?.commitCount ?? 0}c</span>
          </span>
        </div>
      ) : (
        <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400">
          <span className="truncate max-w-[140px] font-mono text-[10px] text-zinc-500">
            {data.folder}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {data.hasCircular && (
              <span title="Döngüsel bağımlılık içerir" className="text-purple-400">
                <Repeat className="w-3 h-3" />
              </span>
            )}
            <span className="text-[10px] text-zinc-500">{data.lines} satır</span>
          </div>
        </div>
      )}

      <Handle type="source" position={Position.Right} className="!bg-zinc-500 !w-2 !h-2 !border-zinc-900" />
    </div>
  );
}
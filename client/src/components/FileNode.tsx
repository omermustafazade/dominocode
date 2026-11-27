import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { FileCode2, Repeat } from 'lucide-react';
import type { RiskLevel } from '../types';

export type ImpactState = 'selected' | 'direct' | 'indirect' | 'dimmed' | 'normal';

export type FileNodeData = {
  label: string;
  folder: string;
  lines: number;
  risk: RiskLevel;
  totalImpact: number;
  hasCircular: boolean;
  impactState: ImpactState;
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

export function FileNode({ data }: NodeProps<CustomFileNode>) {
  const tag = STATE_TAG[data.impactState];
  const layerAccent = getLayerAccent(data.folder);

  return (
    <div
      className={`w-[232px] rounded-xl border border-l-4 px-3.5 py-2.5 transition-all duration-200 cursor-pointer backdrop-blur-sm ${layerAccent} ${STATE_STYLES[data.impactState]}`}
    >
      <Handle type="target" position={Position.Left} className="!bg-zinc-500 !w-2 !h-2 !border-zinc-900" />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <FileCode2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="text-xs font-semibold text-zinc-100 truncate">{data.label}</span>
        </div>

        {tag ? (
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

      <Handle type="source" position={Position.Right} className="!bg-zinc-500 !w-2 !h-2 !border-zinc-900" />
    </div>
  );
}
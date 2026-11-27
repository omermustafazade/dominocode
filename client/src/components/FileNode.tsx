import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { FileCode2 } from 'lucide-react';
import type { RiskLevel } from '../types';

export type ImpactState = 'selected' | 'direct' | 'indirect' | 'dimmed' | 'normal';

export type FileNodeData = {
  label: string;
  folder: string;
  lines: number;
  risk: RiskLevel;
  totalImpact: number;
  impactState: ImpactState;
} & Record<string, unknown>;

export type CustomFileNode = Node<FileNodeData, 'fileNode'>;

const STATE_STYLES: Record<ImpactState, string> = {
  selected: 'border-cyan-400 bg-zinc-900 shadow-[0_0_24px_rgba(34,211,238,0.45)] scale-105',
  direct: 'border-rose-500 bg-rose-950/70 shadow-[0_0_18px_rgba(244,63,94,0.35)]',
  indirect: 'border-amber-500 bg-amber-950/60 shadow-[0_0_14px_rgba(245,158,11,0.25)]',
  dimmed: 'border-zinc-800 bg-zinc-900/40 opacity-35',
  normal: 'border-zinc-700 bg-zinc-900 hover:border-zinc-500',
};

const RISK_BADGE: Record<RiskLevel, string> = {
  critical: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  high: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  medium: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  low: 'bg-zinc-800 text-zinc-400 border-zinc-700',
};

export function FileNode({ data }: NodeProps<CustomFileNode>) {
  return (
    <div
      className={`w-[220px] rounded-xl border-2 px-3.5 py-2.5 transition-all duration-200 cursor-pointer ${STATE_STYLES[data.impactState]}`}
    >
      <Handle type="target" position={Position.Left} className="!bg-zinc-500 !w-2 !h-2" />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <FileCode2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-xs font-semibold text-zinc-100 truncate">{data.label}</span>
        </div>
        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${RISK_BADGE[data.risk]}`}>
          {data.totalImpact} etki
        </span>
      </div>

      <div className="mt-1.5 flex items-center justify-between text-[11px] text-zinc-400">
        <span className="truncate max-w-[145px]">{data.folder}</span>
        <span>{data.lines} satır</span>
      </div>

      <Handle type="source" position={Position.Right} className="!bg-zinc-500 !w-2 !h-2" />
    </div>
  );
}
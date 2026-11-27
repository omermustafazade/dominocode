import { useEffect, useState } from 'react';
import { AlertOctagon, CheckCircle2, FileWarning, Sparkles } from 'lucide-react';
import type { DominoNode, XRayResponse } from '../types';

interface XRayDrawerProps {
  apiUrl: string;
  repoUrl: string;
  selectedNodes: DominoNode[];
  directCount: number;
  indirectCount: number;
  blastPercentage: number;
}

export function XRayDrawer({
  apiUrl,
  repoUrl,
  selectedNodes,
  directCount,
  indirectCount,
  blastPercentage,
}: XRayDrawerProps) {
  const [xray, setXray] = useState<XRayResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const primaryNode = selectedNodes.length === 1 ? selectedNodes[0] : null;

  useEffect(() => {
    if (!primaryNode) {
      setXray(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`${apiUrl}/api/xray`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repoUrl,
        filePath: primaryNode.id,
        directDependents: primaryNode.directDependents,
        totalImpact: primaryNode.totalImpact,
      }),
    })
      .then((res) => res.json())
      .then((data: XRayResponse) => {
        if (!cancelled) setXray(data);
      })
      .catch(() => {
        if (!cancelled) {
          setXray({
            summary: `${primaryNode.label} dosyası ${primaryNode.directDependents.length} modüle doğrudan bağımlılık sağlar.`,
            riskReason: `Değişiklik yapılması durumunda toplam ${primaryNode.totalImpact} dosya etkilenecektir.`,
            checklist: [
              'Export edilen fonksiyon imzalarını koru.',
              'Doğrudan bağımlı dosyaları derleme testinden geçir.',
              'Null / undefined dönüş durumlarını kontrol et.',
            ],
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiUrl, repoUrl, primaryNode]);

  if (selectedNodes.length === 0) {
    return (
      <aside className="w-80 border-l border-zinc-800 bg-zinc-900/50 p-5 flex flex-col items-center justify-center text-center shrink-0">
        <Sparkles className="w-8 h-8 text-zinc-600 mb-3" />
        <div className="text-sm font-medium text-zinc-300">Dosya Seçilmedi</div>
        <p className="text-xs text-zinc-500 mt-1">
          Haritadan herhangi bir dosyaya tıklayarak domino etkisini ve AI X-Ray risk analizini görüntüleyin.
        </p>
      </aside>
    );
  }

  if (selectedNodes.length > 1) {
    return (
      <aside className="w-80 border-l border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
        <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
          <FileWarning className="w-4 h-4" />
          Çoklu PR Etki Simülasyonu
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5">
          <div className="text-xs text-zinc-400">Seçili Dosya Sayısı</div>
          <div className="text-2xl font-bold text-zinc-100 mt-0.5">{selectedNodes.length} dosya</div>
          <div className="mt-3 pt-3 border-t border-zinc-800 flex justify-between text-xs">
            <span className="text-zinc-400">Toplam Kod Tabanı Etkisi</span>
            <span className="font-bold text-rose-400">%{blastPercentage}</span>
          </div>
          <div className="mt-1.5 flex justify-between text-xs">
            <span className="text-rose-400">Doğrudan: {directCount}</span>
            <span className="text-amber-400">Dolaylı: {indirectCount}</span>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-zinc-400 mb-2">PR Kapsamındaki Dosyalar</div>
          <div className="space-y-1.5">
            {selectedNodes.map((n) => (
              <div
                key={n.id}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 truncate"
              >
                {n.id}
              </div>
            ))}
          </div>
        </div>
      </aside>
    );
  }

  const node = primaryNode!;

  return (
    <aside className="w-80 border-l border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          AI X-Ray Raporu
        </span>
        <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
          {node.lines} satır
        </span>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
        <div className="text-sm font-bold text-zinc-100 break-all">{node.label}</div>
        <div className="text-[11px] text-zinc-400 mt-0.5 break-all">{node.id}</div>
      </div>

      {loading ? (
        <div className="space-y-2.5 animate-pulse">
          <div className="h-16 bg-zinc-800/80 rounded-xl" />
          <div className="h-24 bg-zinc-800/80 rounded-xl" />
          <div className="h-28 bg-zinc-800/80 rounded-xl" />
        </div>
      ) : (
        xray && (
          <>
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3">
              <div className="text-[11px] font-semibold uppercase text-zinc-400 mb-1">Modül Görevi</div>
              <p className="text-xs text-zinc-200 leading-relaxed">{xray.summary}</p>
            </div>

            <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-3">
              <div className="text-[11px] font-semibold uppercase text-rose-400 flex items-center gap-1 mb-1">
                <AlertOctagon className="w-3.5 h-3.5" />
                Neden Riskli?
              </div>
              <p className="text-xs text-rose-100/90 leading-relaxed">{xray.riskReason}</p>
            </div>

            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3">
              <div className="text-[11px] font-semibold uppercase text-cyan-400 mb-2">
                Dokunmadan Önce Kontrol Et
              </div>
              <ul className="space-y-2">
                {xray.checklist.map((item, idx) => (
                  <li key={idx} className="text-xs text-zinc-300 flex items-start gap-2 leading-snug">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )
      )}
    </aside>
  );
}
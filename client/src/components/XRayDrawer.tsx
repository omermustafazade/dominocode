import { useEffect, useState } from 'react';
import {
  AlertOctagon,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Circle,
  ClipboardCopy,
  Clock,
  FileCode2,
  FileWarning,
  GitCommit,
  GitPullRequest,
  History,
  ListChecks,
  Network,
  Repeat,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  User,
} from 'lucide-react';
import type {
  DominoNode,
  FileHeatStats,
  HealthGrade,
  HeatLevel,
  PrInfo,
  PrReviewResponse,
  RiskLevel,
  XRayResponse,
} from '../types';

interface XRayDrawerProps {
  apiUrl: string;
  repoUrl: string;
  repoName: string;
  repoBranch: string;
  healthGrade: HealthGrade;
  circularCount: number;
  prInfo?: PrInfo;
  selectedNodes: DominoNode[];
  directList: string[];
  indirectList: string[];
  blastPercentage: number;
  onFocusNode: (id: string) => void;
  onClearSelection: () => void;
}

const VERDICT_BADGE: Record<PrReviewResponse['verdict'], string> = {
  'DÜŞÜK RİSK': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  'DİKKATLİ OL': 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  'YÜKSEK RİSK': 'bg-rose-500/20 text-rose-300 border-rose-500/40',
};

const RISK_LABEL: Record<RiskLevel, { text: string; badge: string }> = {
  critical: { text: 'KRİTİK RİSK', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  high: { text: 'YÜKSEK RİSK', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  medium: { text: 'ORTA RİSK', badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
  low: { text: 'DÜŞÜK RİSK', badge: 'bg-zinc-800 text-zinc-300 border-zinc-700' },
};

const HEAT_LABEL: Record<HeatLevel, { text: string; badge: string }> = {
  burning: { text: 'ÇOK SICAK', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  hot: { text: 'SICAK', badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
  warm: { text: 'ILIK', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  cold: { text: 'STABİL', badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
};

function formatRelativeTimeTr(isoDate?: string): string {
  if (!isoDate) return 'Bilinmiyor';
  const diffMs = Date.now() - new Date(isoDate).getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return 'Az önce';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Az önce';
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} gün önce`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ay önce`;
  return `${Math.floor(months / 12)} yıl önce`;
}

export function XRayDrawer({
  apiUrl,
  repoUrl,
  repoName,
  repoBranch,
  healthGrade,
  circularCount,
  prInfo,
  selectedNodes,
  directList,
  indirectList,
  blastPercentage,
  onFocusNode,
  onClearSelection,
}: XRayDrawerProps) {
  const [xray, setXray] = useState<XRayResponse | null>(null);
  const [prReview, setPrReview] = useState<PrReviewResponse | null>(null);
  const [fileHeat, setFileHeat] = useState<FileHeatStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [commitsLoading, setCommitsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'ai' | 'chain' | 'commits'>('ai');
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  const isPrOrMulti = Boolean(prInfo) || selectedNodes.length > 1;
  const primaryNode = !isPrOrMulti && selectedNodes.length === 1 ? selectedNodes[0] : null;

  useEffect(() => {
    setCheckedItems({});
  }, [primaryNode?.id]);

  // Tekil dosya AI X-Ray analizi
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
        circularPartners: primaryNode.circularPartners ?? [],
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
            circularFix:
              (primaryNode.circularPartners ?? []).length > 0
                ? `${primaryNode.label} ile ${(primaryNode.circularPartners ?? []).join(', ')} arasındaki ortak tipleri ayrı bir types.ts dosyasına çıkararak döngüyü kırın.`
                : undefined,
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

  // Seçili dosyanın Git Commit ve Yazar geçmişi
  useEffect(() => {
    if (!primaryNode) {
      setFileHeat(null);
      return;
    }

    if (primaryNode.heat && primaryNode.heat.recentCommits.length > 0) {
      setFileHeat(primaryNode.heat);
      return;
    }

    let cancelled = false;
    setCommitsLoading(true);

    fetch(`${apiUrl}/api/file-commits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repoUrl,
        branch: repoBranch,
        filePath: primaryNode.id,
      }),
    })
      .then((res) => res.json())
      .then((stats: FileHeatStats) => {
        if (!cancelled) setFileHeat(stats);
      })
      .catch(() => {
        if (!cancelled) setFileHeat(primaryNode.heat ?? null);
      })
      .finally(() => {
        if (!cancelled) setCommitsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiUrl, repoUrl, repoBranch, primaryNode]);

  // Çoklu PR analizi
  useEffect(() => {
    if (!isPrOrMulti || selectedNodes.length === 0) {
      setPrReview(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const title = prInfo ? `PR #${prInfo.number}: ${prInfo.title}` : 'Çoklu PR Etki Simülasyonu';
    const changedFiles = selectedNodes.map((n) => n.id);

    fetch(`${apiUrl}/api/pr-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prTitle: title,
        changedFiles,
        directCount: directList.length,
        indirectCount: indirectList.length,
        blastPercentage,
        circularCount,
      }),
    })
      .then((res) => res.json())
      .then((data: PrReviewResponse) => {
        if (!cancelled) setPrReview(data);
      })
      .catch(() => {
        if (!cancelled) {
          setPrReview({
            verdict: blastPercentage >= 25 ? 'YÜKSEK RİSK' : 'DİKKATLİ OL',
            reason: `Seçili ${changedFiles.length} dosya kod tabanının %${blastPercentage}'lik bölümünü etkiliyor.`,
            reviewComment: `DominoCode Etki Raporu: Bu PR kod tabanının %${blastPercentage}'ini etkiliyor. Etkilenen üst katman modülleri test edin.`,
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    apiUrl,
    isPrOrMulti,
    prInfo,
    selectedNodes,
    directList.length,
    indirectList.length,
    blastPercentage,
    circularCount,
  ]);

  const copyMarkdownReport = () => {
    let md = '';

    if (isPrOrMulti) {
      const title = prInfo ? `PR #${prInfo.number} — ${prInfo.title}` : 'Çoklu PR Etki Analizi';
      md = [
        `### DominoCode Etki Raporu (${repoName})`,
        `**Kapsam:** ${title}`,
        `**Merge Kararı:** ${prReview?.verdict ?? 'İNCELENİYOR'} | **Mimari Sağlık Notu:** ${healthGrade}`,
        ``,
        `| Metrik | Değer |`,
        `| :--- | :--- |`,
        `| Değişen Dosya | ${selectedNodes.length} |`,
        `| Doğrudan Etki | ${directList.length} dosya |`,
        `| Dolaylı Domino Etkisi | ${indirectList.length} dosya |`,
        `| Toplam Etki Alanı | **%${blastPercentage}** |`,
        ``,
        `**AI Değerlendirmesi:** ${prReview?.reviewComment ?? ''}`,
      ].join('\n');
    } else if (primaryNode) {
      md = [
        `### DominoCode X-Ray Raporu: \`${primaryNode.id}\``,
        `**Risk Seviyesi:** ${primaryNode.risk.toUpperCase()} | **Etki Alanı:** %${blastPercentage} (${primaryNode.totalImpact} dosya) | **Mimari Sağlık:** ${healthGrade}`,
        fileHeat
          ? `**Son Güncelleme:** ${fileHeat.lastAuthor} (${formatRelativeTimeTr(fileHeat.lastModified)})`
          : '',
        ``,
        `**Modül Görevi:** ${xray?.summary ?? ''}`,
        `**Neden Riskli?** ${xray?.riskReason ?? ''}`,
        ``,
        `**Merge Öncesi Kontrol Listesi:**`,
        ...(xray?.checklist.map((item) => `- [ ] ${item}`) ?? []),
      ]
        .filter(Boolean)
        .join('\n');
    }

    if (!md) return;
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (selectedNodes.length === 0) {
    return (
      <aside className="w-88 border-l border-zinc-800/90 bg-zinc-950/90 p-6 flex flex-col items-center justify-center text-center shrink-0">
        <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3.5">
          <Sparkles className="w-5 h-5 text-cyan-400" />
        </div>
        <div className="text-sm font-semibold text-zinc-200">AI X-Ray Hazır</div>
        <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed max-w-[230px]">
          Haritadan herhangi bir dosyaya tıklayarak mimari görevini, domino zincirini ve commit geçmişini inceleyin.
        </p>
        <div className="mt-5 w-full bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-3 text-left space-y-2 text-[11px] text-zinc-400">
          <div className="font-semibold text-zinc-300">Hızlı İpuçları</div>
          <div>• Üstten <span className="text-orange-300">Isı Haritası</span> açarak en sık değişen dosyaları görün.</div>
          <div>• Üstten <span className="text-amber-300">Çoklu PR</span> açıp birden fazla dosya seçin.</div>
          <div>• <span className="text-cyan-300">Esc</span> tuşu ile seçimi sıfırlayın.</div>
        </div>
      </aside>
    );
  }

  const toggleChecklist = (idx: number) => {
    setCheckedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const renderImpactChain = () => (
    <div className="space-y-3">
      <div className="bg-zinc-900/85 border border-zinc-800 rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Doğrudan Etkilenenler ({directList.length})
          </span>
          <span className="text-[10px] text-zinc-500">Derinlik 1</span>
        </div>
        {directList.length === 0 ? (
          <p className="text-xs text-zinc-500">Bu dosyayı doğrudan import eden modül yok.</p>
        ) : (
          <div className="space-y-1 max-h-40 overflow-y-auto pr-0.5">
            {directList.map((filePath) => (
              <button
                key={filePath}
                type="button"
                onClick={() => onFocusNode(filePath)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg bg-rose-950/25 hover:bg-rose-950/50 border border-rose-500/25 text-xs text-rose-100 flex items-center justify-between gap-2 cursor-pointer transition group"
              >
                <span className="truncate font-mono text-[11px]">{filePath}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-rose-400 opacity-60 group-hover:opacity-100 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-zinc-900/85 border border-zinc-800 rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Dolaylı Domino Etkisi ({indirectList.length})
          </span>
          <span className="text-[10px] text-zinc-500">Derinlik 2+</span>
        </div>
        {indirectList.length === 0 ? (
          <p className="text-xs text-zinc-500">Üst katmanlara sıçrayan dolaylı etki yok.</p>
        ) : (
          <div className="space-y-1 max-h-44 overflow-y-auto pr-0.5">
            {indirectList.map((filePath) => (
              <button
                key={filePath}
                type="button"
                onClick={() => onFocusNode(filePath)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg bg-amber-950/20 hover:bg-amber-950/45 border border-amber-500/20 text-xs text-amber-100 flex items-center justify-between gap-2 cursor-pointer transition group"
              >
                <span className="truncate font-mono text-[11px]">{filePath}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-amber-400 opacity-60 group-hover:opacity-100 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderCommitHistory = () => {
    if (commitsLoading) {
      return (
        <div className="space-y-2.5 animate-pulse">
          <div className="h-16 bg-zinc-900 rounded-xl" />
          <div className="h-20 bg-zinc-900 rounded-xl" />
          <div className="h-20 bg-zinc-900 rounded-xl" />
        </div>
      );
    }

    const commits = fileHeat?.recentCommits ?? [];
    const heatMeta = HEAT_LABEL[fileHeat?.heatLevel ?? 'cold'];

    return (
      <div className="space-y-3">
        {/* Son Değiştiren Kişi ve Sıcaklık Özeti */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase text-zinc-400">
              Dosya Sıcaklığı & Sahiplik
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${heatMeta.badge}`}>
              {heatMeta.text}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs mt-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-bold text-xs shrink-0">
                {(fileHeat?.lastAuthor ?? 'G')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-zinc-100 truncate">
                  {fileHeat?.lastAuthor ?? 'Bilinmiyor'}
                </div>
                <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatRelativeTimeTr(fileHeat?.lastModified)}</span>
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-sm font-black text-orange-400">
                {fileHeat?.commitCount ?? 0}
              </div>
              <div className="text-[10px] text-zinc-500">son commit</div>
            </div>
          </div>
        </div>

        {/* Commit Listesi */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase text-zinc-400 px-0.5">
            Son Değişiklik Geçmişi ({commits.length})
          </div>

          {commits.length === 0 ? (
            <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-500 text-center">
              Bu dosya için commit kaydı bulunamadı.
            </div>
          ) : (
            commits.map((c) => (
              <div
                key={c.sha + c.date}
                className="bg-zinc-900/90 border border-zinc-800/90 rounded-xl p-2.5 space-y-1.5"
              >
                <div className="text-xs text-zinc-200 font-medium leading-snug">
                  {c.message}
                </div>
                <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-800/70">
                  <span className="flex items-center gap-1 font-medium text-zinc-300 truncate max-w-[130px]">
                    <User className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span className="truncate">{c.author}</span>
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0 font-mono text-zinc-500">
                    <span>{formatRelativeTimeTr(c.date)}</span>
                    <span className="bg-zinc-950 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 flex items-center gap-0.5">
                      <GitCommit className="w-2.5 h-2.5" />
                      {c.sha}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  if (isPrOrMulti) {
    return (
      <aside className="w-88 border-l border-zinc-800/90 bg-zinc-950/90 p-3.5 flex flex-col gap-3 overflow-hidden shrink-0">
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-bold uppercase tracking-wider">
            {prInfo ? <GitPullRequest className="w-4 h-4" /> : <FileWarning className="w-4 h-4" />}
            {prInfo ? `PR #${prInfo.number} Analizi` : 'Çoklu PR Simülasyonu'}
          </div>
          <div className="flex items-center gap-1.5">
            {prReview && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${VERDICT_BADGE[prReview.verdict]}`}
              >
                {prReview.verdict}
              </span>
            )}
            <button
              type="button"
              onClick={onClearSelection}
              title="Seçimi sıfırla"
              className="p-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {prInfo && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs font-semibold text-zinc-100 leading-snug shrink-0">
            {prInfo.title}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 shrink-0">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-center">
            <div className="text-[10px] text-zinc-500 font-semibold">ETKİ ALANI</div>
            <div className="text-base font-black text-cyan-400 mt-0.5">%{blastPercentage}</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-center">
            <div className="text-[10px] text-zinc-500 font-semibold">DOĞRUDAN</div>
            <div className="text-base font-bold text-rose-400 mt-0.5">{directList.length}</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-center">
            <div className="text-[10px] text-zinc-500 font-semibold">DOLAYLI</div>
            <div className="text-base font-bold text-amber-400 mt-0.5">{indirectList.length}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition ${
              activeTab === 'ai' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            AI Kararı
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('chain')}
            className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition ${
              activeTab === 'chain'
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Network className="w-3.5 h-3.5 text-amber-400" />
            Zincir ({directList.length + indirectList.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-0.5">
          {activeTab === 'chain' ? (
            renderImpactChain()
          ) : loading ? (
            <div className="space-y-2.5 animate-pulse">
              <div className="h-24 bg-zinc-900 rounded-xl" />
              <div className="h-24 bg-zinc-900 rounded-xl" />
            </div>
          ) : (
            prReview && (
              <>
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3">
                  <div className="text-[11px] font-semibold uppercase text-zinc-400 flex items-center gap-1.5 mb-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
                    AI Merge Değerlendirmesi
                  </div>
                  <p className="text-xs text-zinc-200 leading-relaxed">{prReview.reason}</p>
                </div>

                <div className="bg-cyan-950/25 border border-cyan-500/30 rounded-xl p-3">
                  <div className="text-[11px] font-semibold uppercase text-cyan-400 mb-1.5">
                    Hazır Code Review Notu
                  </div>
                  <p className="text-xs text-cyan-100/90 leading-relaxed">
                    {prReview.reviewComment}
                  </p>
                </div>

                <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3">
                  <div className="text-[11px] font-semibold uppercase text-zinc-400 mb-1.5">
                    PR Kapsamındaki Dosyalar ({selectedNodes.length})
                  </div>
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {selectedNodes.map((n) => (
                      <div
                        key={n.id}
                        className="bg-zinc-950 border border-zinc-800/80 rounded-lg px-2.5 py-1 text-[11px] font-mono text-zinc-300 truncate"
                      >
                        {n.id}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )
          )}
        </div>

        <button
          type="button"
          onClick={copyMarkdownReport}
          className="w-full bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 hover:from-cyan-500/30 hover:to-emerald-500/30 border border-cyan-500/40 text-cyan-100 text-xs font-semibold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition shrink-0"
        >
          {copied ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <ClipboardCopy className="w-4 h-4 text-cyan-400" />
          )}
          {copied ? 'Markdown Raporu Kopyalandı!' : 'PR / Slack Raporu Kopyala'}
        </button>
      </aside>
    );
  }

  const node = primaryNode!;
  const riskMeta = RISK_LABEL[node.risk];

  return (
    <aside className="w-88 border-l border-zinc-800/90 bg-zinc-950/90 p-3.5 flex flex-col gap-3 overflow-hidden shrink-0">
      {/* Üst Başlık */}
      <div className="flex items-center justify-between shrink-0">
        <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          AI X-Ray Raporu
        </span>
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${riskMeta.badge}`}>
            {riskMeta.text}
          </span>
          <button
            type="button"
            onClick={onClearSelection}
            title="Seçimi sıfırla"
            className="p-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Seçili Dosya Kimlik Kartı */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileCode2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-sm font-bold text-zinc-100 truncate">{node.label}</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-400 font-mono shrink-0">
            {node.lines} satır
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1.5 gap-2">
          <span className="font-mono truncate">{node.id}</span>
          {fileHeat && (
            <span className="text-[10px] text-zinc-400 shrink-0">
              {fileHeat.lastAuthor} · {formatRelativeTimeTr(fileHeat.lastModified)}
            </span>
          )}
        </div>
      </div>

      {/* 3'lü Etki Özeti */}
      <div className="grid grid-cols-3 gap-2 shrink-0">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 text-center">
          <div className="text-[10px] text-zinc-500 font-semibold">DOĞRUDAN</div>
          <div className="text-sm font-bold text-rose-400 mt-0.5">{directList.length}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 text-center">
          <div className="text-[10px] text-zinc-500 font-semibold">DOLAYLI</div>
          <div className="text-sm font-bold text-amber-400 mt-0.5">{indirectList.length}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 text-center">
          <div className="text-[10px] text-zinc-500 font-semibold">KOD TABANI</div>
          <div className="text-sm font-bold text-cyan-400 mt-0.5">%{blastPercentage}</div>
        </div>
      </div>

      {/* 3 Sekmeli Geçiş: AI Teşhis / Etkilenenler / Commitler */}
      <div className="grid grid-cols-3 gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('ai')}
          className={`py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition ${
            activeTab === 'ai' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <ListChecks className="w-3.5 h-3.5 text-cyan-400" />
          AI Teşhis
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('chain')}
          className={`py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition ${
            activeTab === 'chain'
              ? 'bg-zinc-800 text-zinc-100'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Network className="w-3.5 h-3.5 text-rose-400" />
          Etki ({directList.length + indirectList.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('commits')}
          className={`py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition ${
            activeTab === 'commits'
              ? 'bg-zinc-800 text-zinc-100'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <History className="w-3.5 h-3.5 text-orange-400" />
          Commitler
        </button>
      </div>

      {/* İçerik Alanı */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-0.5">
        {activeTab === 'commits' ? (
          renderCommitHistory()
        ) : activeTab === 'chain' ? (
          renderImpactChain()
        ) : loading ? (
          <div className="space-y-2.5 animate-pulse">
            <div className="h-20 bg-zinc-900 rounded-xl" />
            <div className="h-24 bg-zinc-900 rounded-xl" />
            <div className="h-28 bg-zinc-900 rounded-xl" />
          </div>
        ) : (
          xray && (
            <>
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3">
                <div className="text-[11px] font-semibold uppercase text-zinc-400 mb-1">
                  Modül Görevi
                </div>
                <p className="text-xs text-zinc-200 leading-relaxed">{xray.summary}</p>
              </div>

              <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-3">
                <div className="text-[11px] font-semibold uppercase text-rose-400 flex items-center gap-1.5 mb-1">
                  <AlertOctagon className="w-3.5 h-3.5" />
                  Neden Riskli?
                </div>
                <p className="text-xs text-rose-100/90 leading-relaxed">{xray.riskReason}</p>
              </div>

              {xray.circularFix && (
                <div className="bg-purple-950/35 border border-purple-500/40 rounded-xl p-3">
                  <div className="text-[11px] font-semibold uppercase text-purple-300 flex items-center gap-1.5 mb-1">
                    <Repeat className="w-3.5 h-3.5" />
                    Döngüsel Bağımlılık Çözümü (AI)
                  </div>
                  <p className="text-xs text-purple-100/90 leading-relaxed">{xray.circularFix}</p>
                </div>
              )}

              <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3">
                <div className="text-[11px] font-semibold uppercase text-cyan-400 mb-2">
                  Dokunmadan Önce Kontrol Et
                </div>
                <ul className="space-y-2">
                  {xray.checklist.map((item, idx) => {
                    const done = Boolean(checkedItems[idx]);
                    return (
                      <li key={idx}>
                        <button
                          type="button"
                          onClick={() => toggleChecklist(idx)}
                          className={`w-full text-left text-xs flex items-start gap-2 leading-snug cursor-pointer transition ${
                            done ? 'text-zinc-500 line-through' : 'text-zinc-300 hover:text-zinc-100'
                          }`}
                        >
                          {done ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                          )}
                          <span>{item}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          )
        )}
      </div>

      {/* Alt Kopyala Butonu */}
      <button
        type="button"
        onClick={copyMarkdownReport}
        className="w-full bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 hover:from-cyan-500/30 hover:to-emerald-500/30 border border-cyan-500/40 text-cyan-100 text-xs font-semibold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition shrink-0"
      >
        {copied ? (
          <Check className="w-4 h-4 text-emerald-400" />
        ) : (
          <ClipboardCopy className="w-4 h-4 text-cyan-400" />
        )}
        {copied ? 'Markdown Raporu Kopyalandı!' : 'PR / Slack Raporu Kopyala'}
      </button>
    </aside>
  );
}
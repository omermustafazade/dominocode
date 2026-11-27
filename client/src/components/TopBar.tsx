import {
  Crosshair,
  Eye,
  EyeOff,
  GitBranch,
  GitPullRequest,
  Layers,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import type { PrInfo } from '../types';

interface TopBarProps {
  repoUrl: string;
  setRepoUrl: (url: string) => void;
  repoOwner: string;
  repoName: string;
  repoBranch: string;
  prInfo?: PrInfo;
  loading: boolean;
  onAnalyze: (url: string) => void;
  isolateImpact: boolean;
  setIsolateImpact: React.Dispatch<React.SetStateAction<boolean>>;
  multiPrMode: boolean;
  setMultiPrMode: React.Dispatch<React.SetStateAction<boolean>>;
  selectedCount: number;
  hideIsolated: boolean;
  setHideIsolated: React.Dispatch<React.SetStateAction<boolean>>;
}

const QUICK_DEMOS = [
  { label: 'Express.js', url: 'https://github.com/expressjs/express' },
  { label: 'Axios', url: 'https://github.com/axios/axios' },
  { label: 'Zod (TS)', url: 'https://github.com/colinhacks/zod' },
  { label: 'Three.js', url: 'https://github.com/mrdoob/three.js' },
];

export function TopBar({
  repoUrl,
  setRepoUrl,
  repoOwner,
  repoName,
  repoBranch,
  prInfo,
  loading,
  onAnalyze,
  isolateImpact,
  setIsolateImpact,
  multiPrMode,
  setMultiPrMode,
  selectedCount,
  hideIsolated,
  setHideIsolated,
}: TopBarProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAnalyze(repoUrl);
  };

  return (
    <header className="h-15 border-b border-zinc-800/90 px-4 flex items-center justify-between gap-3 bg-zinc-950/95 backdrop-blur-md shrink-0 z-20">
      {/* Marka ve Aktif Repo Bilgisi */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400/25 to-emerald-400/15 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.15)]">
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="font-bold tracking-tight text-sm leading-none">
              Domino<span className="text-cyan-400">Code</span>
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5 font-medium">
              Mimari Etki X-Ray
            </div>
          </div>
        </div>

        <div className="h-6 w-px bg-zinc-800 hidden xl:block" />

        <div className="hidden xl:flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs">
          <span className="text-zinc-300 font-medium">
            {repoOwner}/{repoName}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-zinc-500 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800/80">
            <GitBranch className="w-3 h-3 text-cyan-400" />
            {repoBranch}
          </span>
          {prInfo && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">
              <GitPullRequest className="w-3 h-3" />
              #{prInfo.number}
            </span>
          )}
        </div>
      </div>

      {/* Ortadaki Komut Arama Kapsülü */}
      <form onSubmit={handleSubmit} className="flex-1 max-w-xl flex items-center">
        <div className="relative flex-1 flex items-center bg-zinc-900 border border-zinc-700/80 focus-within:border-cyan-400/80 focus-within:ring-2 focus-within:ring-cyan-400/15 rounded-xl transition">
          <Search className="w-3.5 h-3.5 text-zinc-500 ml-3 shrink-0" />
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="GitHub repo veya PR linki yapıştır (ör. .../pull/123)"
            className="w-full bg-transparent px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
          />
          {repoUrl && (
            <button
              type="button"
              onClick={() => setRepoUrl('')}
              className="p-1 text-zinc-500 hover:text-zinc-300 cursor-pointer"
              title="Temizle"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="m-1 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-zinc-950 font-semibold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Taranıyor' : 'Analiz Et'}
          </button>
        </div>
      </form>

      {/* Sağ Kontroller ve Hızlı Demo Hapları */}
      <div className="flex items-center gap-2 text-xs shrink-0">
        <div className="hidden 2xl:flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
          {QUICK_DEMOS.map((demo) => {
            const isActive = repoUrl.toLowerCase().includes(demo.url.toLowerCase());
            return (
              <button
                key={demo.url}
                type="button"
                onClick={() => onAnalyze(demo.url)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium cursor-pointer transition ${
                  isActive
                    ? 'bg-zinc-800 text-cyan-300 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                {demo.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setIsolateImpact((prev) => !prev)}
          title="Yalnızca seçili dosya ve etkilediği zinciri gösterir"
          className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 cursor-pointer transition font-medium ${
            isolateImpact
              ? 'bg-cyan-500/20 border-cyan-400/70 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.2)]'
              : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
          }`}
        >
          <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
          <span>Etkiyi İzole Et</span>
        </button>

        <button
          type="button"
          onClick={() => setMultiPrMode((prev) => !prev)}
          title="Birden fazla dosyayı aynı anda seçip birleşik PR etkisini ölçer"
          className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 cursor-pointer transition font-medium ${
            multiPrMode
              ? 'bg-amber-500/20 border-amber-400/70 text-amber-200'
              : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
          }`}
        >
          <GitPullRequest className="w-3.5 h-3.5 text-amber-400" />
          <span>Çoklu PR</span>
          {selectedCount > 1 && (
            <span className="bg-amber-400 text-zinc-950 text-[10px] font-bold px-1.5 rounded-full">
              {selectedCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setHideIsolated((prev) => !prev)}
          title="Bağlantısız tekil dosyaları gizle veya göster"
          className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 cursor-pointer transition font-medium ${
            hideIsolated
              ? 'bg-zinc-800/90 border-zinc-700 text-zinc-200'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
          }`}
        >
          {hideIsolated ? (
            <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
          ) : (
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
          )}
          <span className="hidden lg:inline">İzoleleri Gizle</span>
        </button>
      </div>
    </header>
  );
}
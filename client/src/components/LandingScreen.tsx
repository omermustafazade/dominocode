import {
  Activity,
  AlertTriangle,
  ArrowRight,
  GitBranch,
  GitPullRequest,
  Layers,
  Play,
  RefreshCw,
  Repeat,
  Search,
  Sparkles,
  X,
} from 'lucide-react';

interface LandingScreenProps {
  repoUrl: string;
  setRepoUrl: (url: string) => void;
  loading: boolean;
  error: string | null;
  onAnalyze: (url: string) => void;
  onOpenOfflineDemo: () => void;
}

const SAMPLE_REPOS = [
  {
    label: 'Express.js',
    tag: 'JavaScript',
    url: 'https://github.com/expressjs/express',
  },
  {
    label: 'Axios',
    tag: 'HTTP Client',
    url: 'https://github.com/axios/axios',
  },
  {
    label: 'Zod',
    tag: 'TypeScript',
    url: 'https://github.com/colinhacks/zod',
  },
  {
    label: 'Three.js',
    tag: 'Döngüsel Mimari',
    url: 'https://github.com/mrdoob/three.js',
  },
];

export function LandingScreen({
  repoUrl,
  setRepoUrl,
  loading,
  error,
  onAnalyze,
  onOpenOfflineDemo,
}: LandingScreenProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim() || loading) return;
    onAnalyze(repoUrl);
  };

  return (
    <div className="min-h-screen w-screen bg-zinc-950 text-zinc-100 relative overflow-y-auto flex flex-col justify-between">
      {/* Arka Plan Işık ve Izgara Efekti */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(34,211,238,0.13),transparent_55%)]" />
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'radial-gradient(#3f3f46 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Üst Minimal Gezinme Çubuğu */}
      <header className="relative z-10 max-w-6xl w-full mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400/25 to-emerald-400/15 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_25px_rgba(34,211,238,0.2)]">
            <Layers className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="font-bold tracking-tight text-lg leading-none">
              Domino<span className="text-cyan-400">Code</span>
            </div>
            <div className="text-[11px] text-zinc-500 mt-1 font-medium">
              AI Destekli Mimari Etki Analizi
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenOfflineDemo}
          disabled={loading}
          className="bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-2 cursor-pointer transition"
        >
          <Play className="w-3.5 h-3.5 text-emerald-400" />
          <span>Örnek Mimariyi İncele</span>
        </button>
      </header>

      {/* Merkez Hero ve Analiz Kutusu */}
      <main className="relative z-10 max-w-4xl w-full mx-auto px-6 py-10 flex flex-col items-center text-center">
        {/* Üst Rozet */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>GitHub Repo & Pull Request Bağımlılık Röntgeni</span>
        </div>

        {/* Ana Başlık */}
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-100 leading-[1.15] max-w-3xl">
          Kod Değişikliğinin Yaratacağı{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-emerald-400">
            Domino Etkisini
          </span>{' '}
          Önceden Görün.
        </h1>

        {/* Proje Özet Açıklaması */}
        <p className="mt-5 text-sm sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
          <strong className="text-zinc-200 font-semibold">DominoCode</strong>, bir GitHub reposunu veya
          Pull Request bağlantısını saniyeler içinde tarayarak dosyalar arası bağımlılık ağını
          görselleştirir. Tek bir dosyaya dokunduğunuzda hangi modüllerin doğrudan veya zincirleme
          etkileneceğini, döngüsel mimari hataları ve yapay zeka destekli risk raporunu ortaya çıkarır.
        </p>

        {/* Link Giriş ve Analiz Kartı */}
        <form onSubmit={handleSubmit} className="w-full max-w-2xl mt-9">
          <div className="p-2 rounded-2xl bg-zinc-900/90 border border-zinc-700/80 focus-within:border-cyan-400/80 focus-within:ring-4 focus-within:ring-cyan-400/15 shadow-[0_20px_60px_rgba(0,0,0,0.65)] flex flex-col sm:flex-row items-stretch sm:items-center gap-2 transition">
            <div className="flex-1 flex items-center px-3 py-2 sm:py-0">
              <Search className="w-4 h-4 text-zinc-500 mr-2.5 shrink-0" />
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/kullanici/proje veya .../pull/123"
                className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
                autoFocus
              />
              {repoUrl && (
                <button
                  type="button"
                  onClick={() => setRepoUrl('')}
                  className="p-1 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                  title="Temizle"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !repoUrl.trim()}
              className="bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 disabled:opacity-45 text-zinc-950 font-bold text-sm px-6 py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition shrink-0 shadow-[0_0_25px_rgba(34,211,238,0.3)]"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Analiz Ediliyor...</span>
                </>
              ) : (
                <>
                  <span>Analiz Et</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Hata Mesajı Alanı */}
          {error && (
            <div className="mt-3 bg-rose-950/85 border border-rose-500/40 rounded-xl px-4 py-2.5 text-xs text-rose-200 flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </form>

        {/* Tek Tıkla Test Edilebilir Örnek Repolar */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="text-zinc-500 font-medium mr-1">Hızlı Test:</span>
          {SAMPLE_REPOS.map((item) => (
            <button
              key={item.url}
              type="button"
              disabled={loading}
              onClick={() => onAnalyze(item.url)}
              className="bg-zinc-900/90 hover:bg-zinc-800 disabled:opacity-50 border border-zinc-800 hover:border-cyan-500/40 rounded-xl px-3 py-1.5 flex items-center gap-2 cursor-pointer transition group"
            >
              <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-semibold text-zinc-200 group-hover:text-cyan-200">
                {item.label}
              </span>
              <span className="text-[10px] text-zinc-500 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
                {item.tag}
              </span>
            </button>
          ))}
        </div>

        {/* 3 Temel Özellik Kartı */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-14 text-left">
          <div className="bg-zinc-900/75 border border-zinc-800/90 rounded-2xl p-5 backdrop-blur-sm">
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mb-3.5">
              <Activity className="w-4 h-4 text-rose-400" />
            </div>
            <h3 className="text-sm font-bold text-zinc-100">Domino Etki Hesabı</h3>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              Bir dosyada yapılan değişikliğin doğrudan ve dolaylı olarak kaç üst katman modülü
              etkileyeceğini yüzde olarak hesaplar.
            </p>
          </div>

          <div className="bg-zinc-900/75 border border-zinc-800/90 rounded-2xl p-5 backdrop-blur-sm">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center mb-3.5">
              <Repeat className="w-4 h-4 text-purple-400" />
            </div>
            <h3 className="text-sm font-bold text-zinc-100">Mimari Sağlık & Döngü Kırıcı</h3>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              Birbirini karşılıklı çağıran döngüsel bağımlılıkları yakalar, repoya A–F arası sağlık
              notu verir ve çözüm önerir.
            </p>
          </div>

          <div className="bg-zinc-900/75 border border-zinc-800/90 rounded-2xl p-5 backdrop-blur-sm">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center mb-3.5">
              <GitPullRequest className="w-4 h-4 text-cyan-400" />
            </div>
            <h3 className="text-sm font-bold text-zinc-100">AI X-Ray & PR Kararı</h3>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              Yapıştırılan Pull Request linkindeki dosyaları analiz eder, merge risk kararı verir ve
              tek tıkla paylaşılabilir rapor üretir.
            </p>
          </div>
        </div>
      </main>

      {/* Alt Bilgi */}
      <footer className="relative z-10 py-5 text-center text-[11px] text-zinc-600">
        TypeScript · JavaScript · Dart / Flutter · Python kod tabanlarını destekler
      </footer>
    </div>
  );
}
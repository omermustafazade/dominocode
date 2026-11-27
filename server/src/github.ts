export interface RepoFile {
  path: string;
  content: string;
}

const ALLOWED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.dart', '.py']);
const IGNORED_SEGMENTS = [
  'node_modules/',
  'dist/',
  'build/',
  '.next/',
  '.git/',
  'coverage/',
  '__pycache__/',
  '.dart_tool/',
  'ios/',
  'android/',
  'macos/',
  'windows/',
  'linux/',
  'web/',
  'test/',
  'tests/',
  '__tests__/',
  'examples/',
  'example/',
  'docs/',
  'benchmark/',
];

const MAX_FILES = 85;

export function parseGitHubUrl(repoUrl: string): { owner: string; repo: string } {
  const cleaned = repoUrl.trim().replace(/\.git$/, '').replace(/\/$/, '');
  const match = cleaned.match(/github\.com\/([^/]+)\/([^/]+)/i);
  if (!match) {
    throw new Error('Geçersiz GitHub URL formatı. Örnek: https://github.com/kullanici/proje');
  }
  return { owner: match[1], repo: match[2] };
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'DominoCode-Hackathon-App',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

function isSourceFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  if (
    lower.startsWith('test/') ||
    lower.startsWith('tests/') ||
    lower.startsWith('examples/') ||
    lower.startsWith('docs/')
  ) {
    return false;
  }
  if (IGNORED_SEGMENTS.some((seg) => lower.includes(seg))) return false;
  if (lower.includes('.test.') || lower.includes('.spec.') || lower.endsWith('.d.ts')) return false;

  const dotIndex = lower.lastIndexOf('.');
  if (dotIndex === -1) return false;
  return ALLOWED_EXTENSIONS.has(lower.slice(dotIndex));
}

export async function fetchRepositoryFiles(repoUrl: string): Promise<{
  owner: string;
  repo: string;
  branch: string;
  files: RepoFile[];
}> {
  const { owner, repo } = parseGitHubUrl(repoUrl);
  const headers = getHeaders();

  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  if (!repoRes.ok) {
    throw new Error(`GitHub reposu bulunamadı veya erişilemedi (${repoRes.status}).`);
  }
  const repoMeta = (await repoRes.json()) as { default_branch: string };
  const branch = repoMeta.default_branch || 'main';

  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers }
  );
  if (!treeRes.ok) {
    throw new Error(`Dosya ağacı alınamadı (${treeRes.status}).`);
  }

  const treeData = (await treeRes.json()) as {
    tree: Array<{ path: string; type: string }>;
  };

  const candidates = treeData.tree
    .filter((item) => item.type === 'blob' && isSourceFile(item.path))
    .sort((a, b) => {
      const aPriority = /^(src|lib|app)\//.test(a.path) ? 0 : 1;
      const bPriority = /^(src|lib|app)\//.test(b.path) ? 0 : 1;
      return aPriority - bPriority;
    })
    .slice(0, MAX_FILES);

  const files: RepoFile[] = [];
  const batchSize = 15;

  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (item) => {
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${item.path}`;
        const res = await fetch(rawUrl);
        if (!res.ok) return null;
        const content = await res.text();
        return { path: item.path, content };
      })
    );
    for (const file of results) {
      if (file) files.push(file);
    }
  }

  return { owner, repo, branch, files };
}
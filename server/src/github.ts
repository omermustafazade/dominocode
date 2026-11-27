import type { PrInfo } from './types.js';

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

export function parseGitHubUrl(inputUrl: string): {
  owner: string;
  repo: string;
  prNumber?: number;
} {
  const cleaned = inputUrl.trim().replace(/\.git$/, '').replace(/\/$/, '');
  const match = cleaned.match(/github\.com\/([^/]+)\/([^/]+)(?:\/pull\/(\d+))?/i);
  if (!match) {
    throw new Error(
      'Geçersiz GitHub URL formatı. Örnek: https://github.com/kullanici/proje veya .../pull/123'
    );
  }
  return {
    owner: match[1],
    repo: match[2],
    prNumber: match[3] ? Number(match[3]) : undefined,
  };
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

async function fetchPrMetadata(
  owner: string,
  repo: string,
  prNumber: number,
  headers: Record<string, string>
): Promise<{ title: string; rawChangedFiles: string[] }> {
  const [prRes, filesRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`, { headers }),
    fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`, {
      headers,
    }),
  ]);

  if (!prRes.ok || !filesRes.ok) {
    throw new Error(`Pull Request #${prNumber} bilgisi alınamadı (${prRes.status}).`);
  }

  const prData = (await prRes.json()) as { title?: string };
  const filesData = (await filesRes.json()) as Array<{ filename: string }>;

  return {
    title: prData.title || `Pull Request #${prNumber}`,
    rawChangedFiles: filesData.map((f) => f.filename).filter(isSourceFile),
  };
}

export async function fetchRepositoryFiles(repoUrl: string): Promise<{
  owner: string;
  repo: string;
  branch: string;
  files: RepoFile[];
  prInfo?: PrInfo;
}> {
  const { owner, repo, prNumber } = parseGitHubUrl(repoUrl);
  const headers = getHeaders();

  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  if (!repoRes.ok) {
    throw new Error(`GitHub reposu bulunamadı veya erişilemedi (${repoRes.status}).`);
  }
  const repoMeta = (await repoRes.json()) as { default_branch: string };
  const branch = repoMeta.default_branch || 'main';

  let prTitle = '';
  let prChangedSet = new Set<string>();
  if (prNumber) {
    const prMeta = await fetchPrMetadata(owner, repo, prNumber, headers);
    prTitle = prMeta.title;
    prChangedSet = new Set(prMeta.rawChangedFiles);
  }

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
      const aInPr = prChangedSet.has(a.path) ? -1 : 0;
      const bInPr = prChangedSet.has(b.path) ? -1 : 0;
      if (aInPr !== bInPr) return aInPr - bInPr;

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

  const loadedPaths = new Set(files.map((f) => f.path));
  const prInfo: PrInfo | undefined = prNumber
    ? {
        number: prNumber,
        title: prTitle,
        changedFiles: Array.from(prChangedSet).filter((p) => loadedPaths.has(p)),
      }
    : undefined;

  return { owner, repo, branch, files, prInfo };
}
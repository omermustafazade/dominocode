import path from 'node:path';
import type { RepoFile } from './github.js';

const CANDIDATE_EXTENSIONS = [
  '',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.dart',
  '.py',
  '/index.ts',
  '/index.tsx',
  '/index.js',
  '/index.jsx',
];

function extractRawImports(content: string, extension: string): string[] {
  const results = new Set<string>();

  if (extension === '.py') {
    const fromRegex = /^\s*from\s+([.\w]+)\s+import\s+/gm;
    const importRegex = /^\s*import\s+([\w.]+)/gm;
    let m: RegExpExecArray | null;
    while ((m = fromRegex.exec(content)) !== null) results.add(m[1]);
    while ((m = importRegex.exec(content)) !== null) results.add(m[1]);
    return Array.from(results);
  }

  const esImportRegex = /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  const requireRegex = /(?:require|import)\(\s*['"]([^'"]+)['"]\s*\)/g;

  let match: RegExpExecArray | null;
  while ((match = esImportRegex.exec(content)) !== null) results.add(match[1]);
  while ((match = requireRegex.exec(content)) !== null) results.add(match[1]);

  return Array.from(results);
}

function resolveImportPath(
  sourceFile: string,
  specifier: string,
  knownPaths: Set<string>
): string | null {
  const sourceDir = path.posix.dirname(sourceFile);
  const possibleBases: string[] = [];

  if (specifier.startsWith('.')) {
    possibleBases.push(path.posix.normalize(path.posix.join(sourceDir, specifier)));
  } else if (specifier.startsWith('@/')) {
    const sub = specifier.slice(2);
    possibleBases.push(`src/${sub}`, sub);
  } else if (specifier.startsWith('package:')) {
    const slashIdx = specifier.indexOf('/');
    if (slashIdx !== -1) {
      possibleBases.push(`lib/${specifier.slice(slashIdx + 1)}`);
    }
  } else if (sourceFile.endsWith('.py')) {
    const asPath = specifier.replace(/\./g, '/');
    possibleBases.push(asPath, `src/${asPath}`);
  } else {
    return null;
  }

  for (const base of possibleBases) {
    const cleanBase = base.replace(/\.(js|jsx|ts|tsx)$/, '');
    for (const ext of CANDIDATE_EXTENSIONS) {
      const candidate = `${cleanBase}${ext}`;
      if (knownPaths.has(candidate) && candidate !== sourceFile) {
        return candidate;
      }
    }
  }

  return null;
}

export function extractDependencies(files: RepoFile[]): Map<string, Set<string>> {
  const knownPaths = new Set(files.map((f) => f.path));
  const importedByMap = new Map<string, Set<string>>();

  for (const file of files) {
    importedByMap.set(file.path, new Set());
  }

  for (const file of files) {
    const ext = file.path.slice(file.path.lastIndexOf('.')).toLowerCase();
    const specifiers = extractRawImports(file.content, ext);

    for (const spec of specifiers) {
      const target = resolveImportPath(file.path, spec, knownPaths);
      if (target && importedByMap.has(target)) {
        importedByMap.get(target)!.add(file.path);
      }
    }
  }

  return importedByMap;
}
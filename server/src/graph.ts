import path from 'node:path';
import type { RepoFile } from './github.js';
import type { AnalysisResponse, DominoEdge, DominoNode, RiskLevel } from './types.js';

function calculateRisk(totalImpact: number, totalFiles: number): RiskLevel {
  const ratio = totalFiles > 1 ? totalImpact / (totalFiles - 1) : 0;
  if (totalImpact >= 8 || ratio >= 0.25) return 'critical';
  if (totalImpact >= 4 || ratio >= 0.12) return 'high';
  if (totalImpact >= 1) return 'medium';
  return 'low';
}

export function buildDominoGraph(
  owner: string,
  name: string,
  branch: string,
  files: RepoFile[],
  importedByMap: Map<string, Set<string>>
): AnalysisResponse {
  const reachability = new Map<string, Set<string>>();
  const directMap = new Map<string, string[]>();
  const indirectMap = new Map<string, string[]>();

  for (const file of files) {
    const direct = Array.from(importedByMap.get(file.path) ?? []);
    const visited = new Set<string>([file.path, ...direct]);
    const queue = [...direct];
    const indirect: string[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const nextDependents = importedByMap.get(current);
      if (!nextDependents) continue;

      for (const dep of nextDependents) {
        if (!visited.has(dep)) {
          visited.add(dep);
          indirect.push(dep);
          queue.push(dep);
        }
      }
    }

    visited.delete(file.path);
    reachability.set(file.path, visited);
    directMap.set(file.path, direct);
    indirectMap.set(file.path, indirect);
  }

  const edges: DominoEdge[] = [];
  let circularCount = 0;
  let edgeIndex = 1;

  for (const [source, targets] of importedByMap.entries()) {
    for (const target of targets) {
      const isCircular = reachability.get(target)?.has(source) ?? false;
      if (isCircular) circularCount++;

      edges.push({
        id: `e-${edgeIndex++}`,
        source,
        target,
        isCircular,
      });
    }
  }

  const nodes: DominoNode[] = files.map((file) => {
    const directDependents = directMap.get(file.path) ?? [];
    const indirectDependents = indirectMap.get(file.path) ?? [];
    const totalImpact = directDependents.length + indirectDependents.length;
    const folder = path.posix.dirname(file.path);
    const label = path.posix.basename(file.path);
    const extension = label.includes('.') ? label.split('.').pop()! : '';

    return {
      id: file.path,
      label,
      folder: folder === '.' ? '/' : folder,
      extension,
      lines: file.content.split('\n').length,
      risk: calculateRisk(totalImpact, files.length),
      directDependents,
      indirectDependents,
      totalImpact,
    };
  });

  const hotspots = [...nodes]
    .filter((n) => n.totalImpact > 0)
    .sort((a, b) => b.totalImpact - a.totalImpact)
    .slice(0, 5)
    .map((n) => ({
      id: n.id,
      label: n.label,
      directCount: n.directDependents.length,
      totalImpact: n.totalImpact,
      risk: n.risk,
    }));

  return {
    repo: {
      owner,
      name,
      branch,
      totalFiles: files.length,
      circularCount: Math.floor(circularCount / 2),
    },
    hotspots,
    nodes,
    edges,
  };
}
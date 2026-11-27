export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface DominoNode {
  id: string;
  label: string;
  folder: string;
  extension: string;
  lines: number;
  risk: RiskLevel;
  directDependents: string[];
  indirectDependents: string[];
  totalImpact: number;
  commitCount: number;
  topAuthor: string;
  authorCount: number;
  lastModifiedDays: number | null;
  dangerScore: number;
}

export interface DominoEdge {
  id: string;
  source: string;
  target: string;
  isCircular: boolean;
}

export interface HotspotItem {
  id: string;
  label: string;
  directCount: number;
  totalImpact: number;
  commitCount: number;
  dangerScore: number;
  risk: RiskLevel;
}

export interface AnalysisResponse {
  repo: {
    owner: string;
    name: string;
    branch: string;
    totalFiles: number;
    circularCount: number;
    analyzedCommits: number;
  };
  hotspots: HotspotItem[];
  nodes: DominoNode[];
  edges: DominoEdge[];
}

export interface XRayResponse {
  summary: string;
  riskReason: string;
  checklist: string[];
}
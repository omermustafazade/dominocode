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
  risk: RiskLevel;
}

export interface AnalysisResponse {
  repo: {
    owner: string;
    name: string;
    branch: string;
    totalFiles: number;
    circularCount: number;
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
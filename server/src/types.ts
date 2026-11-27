export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type HealthGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface DominoNode {
  id: string;
  label: string;
  folder: string;
  extension: string;
  lines: number;
  risk: RiskLevel;
  directDependents: string[];
  indirectDependents: string[];
  circularPartners: string[];
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

export interface PrInfo {
  number: number;
  title: string;
  changedFiles: string[];
}

export interface AnalysisResponse {
  repo: {
    owner: string;
    name: string;
    branch: string;
    totalFiles: number;
    circularCount: number;
    healthScore: number;
    healthGrade: HealthGrade;
  };
  prInfo?: PrInfo;
  hotspots: HotspotItem[];
  nodes: DominoNode[];
  edges: DominoEdge[];
}

export interface XRayResponse {
  summary: string;
  riskReason: string;
  checklist: string[];
  circularFix?: string;
}

export interface PrReviewResponse {
  verdict: 'DÜŞÜK RİSK' | 'DİKKATLİ OL' | 'YÜKSEK RİSK';
  reason: string;
  reviewComment: string;
}
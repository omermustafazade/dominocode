import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
  type Edge,
} from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import { AlertTriangle } from 'lucide-react';
import {
  FileNode,
  type CustomFileNode,
  type FileNodeData,
  type ImpactState,
} from './components/FileNode';
import { TopBar } from './components/TopBar';
import { LeftSidebar } from './components/LeftSidebar';
import { XRayDrawer } from './components/XRayDrawer';
import { DEMO_ANALYSIS } from './mockData';
import type { AnalysisResponse } from './types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const nodeTypes = { fileNode: FileNode };

function applyDagreLayout(nodes: CustomFileNode[], edges: Edge[]): CustomFileNode[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', nodesep: 48, ranksep: 155 });

  nodes.forEach((node) => g.setNode(node.id, { width: 232, height: 76 }));
  edges.forEach((edge) => g.setEdge(edge.source, edge.target));

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: { x: pos.x - 116, y: pos.y - 38 },
    };
  });
}

function DominoWorkspace() {
  const [repoUrl, setRepoUrl] = useState('https://github.com/dominocode/ecommerce-core');
  const [data, setData] = useState<AnalysisResponse>(DEMO_ANALYSIS);
  const [selectedIds, setSelectedIds] = useState<string[]>(['src/services/authService.ts']);
  const [multiPrMode, setMultiPrMode] = useState(false);
  const [isolateImpact, setIsolateImpact] = useState(false);
  const [hideIsolated, setHideIsolated] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { fitView, setCenter } = useReactFlow();

  const runAnalysis = async (targetUrl: string) => {
    if (!targetUrl.trim()) return;
    setRepoUrl(targetUrl);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: targetUrl }),
      });
      const json = (await res.json()) as AnalysisResponse & { error?: string };
      if (!res.ok) throw new Error(json.error || 'Analiz başarısız oldu.');

      setData(json);

      if (json.prInfo && json.prInfo.changedFiles.length > 0) {
        setMultiPrMode(true);
        setSelectedIds(json.prInfo.changedFiles);
      } else {
        setMultiPrMode(false);
        const topId = json.hotspots?.[0]?.id ?? json.nodes?.[0]?.id;
        setSelectedIds(topId ? [topId] : []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sunucuya bağlanılamadı.');
    } finally {
      setLoading(false);
    }
  };

  // Klavye kısayolları: Esc seçimi temizler, F haritayı ortalar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'Escape') {
        setSelectedIds([]);
      } else if (e.key.toLowerCase() === 'f') {
        fitView({ padding: 0.2, duration: 400 });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fitView]);

  const { directSet, indirectSet } = useMemo(() => {
    const direct = new Set<string>();
    const indirect = new Set<string>();

    for (const id of selectedIds) {
      const node = data.nodes.find((n) => n.id === id);
      if (!node) continue;
      node.directDependents.forEach((d) => {
        if (!selectedIds.includes(d)) direct.add(d);
      });
      node.indirectDependents.forEach((ind) => {
        if (!selectedIds.includes(ind) && !direct.has(ind)) indirect.add(ind);
      });
    }
    return { directSet: direct, indirectSet: indirect };
  }, [data.nodes, selectedIds]);

  const { layoutNodes, styledEdges } = useMemo(() => {
    const connectedIds = new Set<string>();
    data.edges.forEach((e) => {
      connectedIds.add(e.source);
      connectedIds.add(e.target);
    });

    const hasSelection = selectedIds.length > 0;

    const visibleDominoNodes = data.nodes.filter((n) => {
      if (isolateImpact && hasSelection) {
        return selectedIds.includes(n.id) || directSet.has(n.id) || indirectSet.has(n.id);
      }
      if (hideIsolated && data.edges.length > 0 && !connectedIds.has(n.id)) return false;
      return true;
    });

    const visibleIds = new Set(visibleDominoNodes.map((n) => n.id));

    const rawNodes: CustomFileNode[] = visibleDominoNodes.map((n) => {
      let impactState: ImpactState = 'normal';
      if (hasSelection) {
        if (selectedIds.includes(n.id)) impactState = 'selected';
        else if (directSet.has(n.id)) impactState = 'direct';
        else if (indirectSet.has(n.id)) impactState = 'indirect';
        else impactState = 'dimmed';
      }

      return {
        id: n.id,
        type: 'fileNode',
        position: { x: 0, y: 0 },
        data: {
          label: n.label,
          folder: n.folder,
          lines: n.lines,
          risk: n.risk,
          totalImpact: n.totalImpact,
          hasCircular: n.circularPartners?.length > 0,
          impactState,
        },
      };
    });

    const rawEdges: Edge[] = data.edges
      .filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
      .map((e) => {
        const isActiveSource = selectedIds.includes(e.source) || directSet.has(e.source);
        const isImpactedTarget = directSet.has(e.target) || indirectSet.has(e.target);
        const isRippleEdge = hasSelection && isActiveSource && isImpactedTarget;

        let stroke = '#3f3f46';
        if (e.isCircular) stroke = '#c084fc';
        else if (isRippleEdge && selectedIds.includes(e.source)) stroke = '#f43f5e';
        else if (isRippleEdge) stroke = '#f59e0b';

        return {
          id: e.id,
          source: e.source,
          target: e.target,
          animated: isRippleEdge || e.isCircular,
          style: {
            stroke,
            strokeWidth: isRippleEdge || e.isCircular ? 2.4 : 1.3,
            strokeDasharray: e.isCircular ? '6 4' : undefined,
            opacity: hasSelection && !isRippleEdge && !e.isCircular ? 0.18 : 1,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: stroke,
          },
        };
      });

    return {
      layoutNodes: applyDagreLayout(rawNodes, rawEdges),
      styledEdges: rawEdges,
    };
  }, [data, isolateImpact, hideIsolated, selectedIds, directSet, indirectSet]);

  useEffect(() => {
    const timer = setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 80);
    return () => clearTimeout(timer);
  }, [data, hideIsolated, isolateImpact, fitView]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: CustomFileNode) => {
      setSelectedIds((prev) => {
        if (multiPrMode) {
          return prev.includes(node.id) ? prev.filter((id) => id !== node.id) : [...prev, node.id];
        }
        return prev.length === 1 && prev[0] === node.id ? [] : [node.id];
      });
    },
    [multiPrMode]
  );

  const focusNode = useCallback(
    (id: string) => {
      setSelectedIds([id]);
      const target = layoutNodes.find((n) => n.id === id);
      if (target) {
        setCenter(target.position.x + 116, target.position.y + 38, { zoom: 1.15, duration: 450 });
      }
    },
    [layoutNodes, setCenter]
  );

  const selectedNodes = useMemo(
    () => data.nodes.filter((n) => selectedIds.includes(n.id)),
    [data.nodes, selectedIds]
  );

  const directList = useMemo(() => Array.from(directSet), [directSet]);
  const indirectList = useMemo(() => Array.from(indirectSet), [indirectSet]);

  const totalImpactedCount = directList.length + indirectList.length;
  const blastPercentage =
    data.repo.totalFiles > 1 ? Math.round((totalImpactedCount / (data.repo.totalFiles - 1)) * 100) : 0;

  return (
    <div className="h-screen w-screen flex flex-col bg-zinc-950 text-zinc-100 select-none">
      <TopBar
        repoUrl={repoUrl}
        setRepoUrl={setRepoUrl}
        repoOwner={data.repo.owner}
        repoName={data.repo.name}
        repoBranch={data.repo.branch}
        prInfo={data.prInfo}
        loading={loading}
        onAnalyze={runAnalysis}
        isolateImpact={isolateImpact}
        setIsolateImpact={setIsolateImpact}
        multiPrMode={multiPrMode}
        setMultiPrMode={setMultiPrMode}
        selectedCount={selectedIds.length}
        hideIsolated={hideIsolated}
        setHideIsolated={setHideIsolated}
      />

      {error && (
        <div className="bg-rose-950/90 border-b border-rose-500/40 px-4 py-2 text-xs text-rose-200 flex items-center gap-2 shrink-0">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar
          data={data}
          selectedIds={selectedIds}
          directCount={directList.length}
          indirectCount={indirectList.length}
          blastPercentage={blastPercentage}
          onFocusNode={focusNode}
        />

        <main className="flex-1 relative">
          <ReactFlow
            nodes={layoutNodes}
            edges={styledEdges}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            colorMode="dark"
            fitView
          >
            <Background color="#27272a" gap={22} />
            <Controls />
            <MiniMap
              nodeColor={(n) => {
                const state = (n.data as FileNodeData)?.impactState;
                if (state === 'selected') return '#22d3ee';
                if (state === 'direct') return '#f43f5e';
                if (state === 'indirect') return '#f59e0b';
                return '#3f3f46';
              }}
              maskColor="rgba(9, 9, 11, 0.78)"
            />
          </ReactFlow>

          {/* Alt Renk ve Kısayol Lejantı */}
          <div className="absolute bottom-4 left-4 bg-zinc-900/90 border border-zinc-800/90 rounded-xl px-3.5 py-2 flex items-center gap-4 text-[11px] text-zinc-300 backdrop-blur-md shadow-lg">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Odak Dosya
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Doğrudan Etki
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Dolaylı Domino
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400" /> Döngüsel Hata
            </span>
            <span className="h-3.5 w-px bg-zinc-800 hidden sm:inline-block" />
            <span className="text-zinc-500 hidden sm:inline">
              <kbd className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded text-[10px]">F</kbd> Ortala ·{' '}
              <kbd className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded text-[10px]">Esc</kbd> Temizle
            </span>
          </div>
        </main>

        <XRayDrawer
          apiUrl={API_URL}
          repoUrl={repoUrl}
          repoName={`${data.repo.owner}/${data.repo.name}`}
          healthGrade={data.repo.healthGrade ?? 'B'}
          circularCount={data.repo.circularCount}
          prInfo={data.prInfo}
          selectedNodes={selectedNodes}
          directList={directList}
          indirectList={indirectList}
          blastPercentage={blastPercentage}
          onFocusNode={focusNode}
          onClearSelection={() => setSelectedIds([])}
        />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <DominoWorkspace />
    </ReactFlowProvider>
  );
}
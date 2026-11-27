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
import { AlertTriangle, Flame, GitBranch, Layers, RefreshCw, Search } from 'lucide-react';
import { FileNode, type CustomFileNode, type FileNodeData, type ImpactState } from './components/FileNode';
import { XRayDrawer } from './components/XRayDrawer';
import { DEMO_ANALYSIS } from './mockData';
import type { AnalysisResponse } from './types';

const API_URL = 'http://localhost:3001';
const nodeTypes = { fileNode: FileNode };

const QUICK_DEMOS = [
  { label: 'Express.js', url: 'https://github.com/expressjs/express' },
  { label: 'Axios', url: 'https://github.com/axios/axios' },
];

function applyDagreLayout(nodes: CustomFileNode[], edges: Edge[]): CustomFileNode[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', nodesep: 45, ranksep: 150 });

  nodes.forEach((node) => g.setNode(node.id, { width: 220, height: 76 }));
  edges.forEach((edge) => g.setEdge(edge.source, edge.target));

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: { x: pos.x - 110, y: pos.y - 38 },
    };
  });
}

function DominoWorkspace() {
  const [repoUrl, setRepoUrl] = useState('https://github.com/dominocode/ecommerce-core');
  const [data, setData] = useState<AnalysisResponse>(DEMO_ANALYSIS);
  const [selectedIds, setSelectedIds] = useState<string[]>(['src/services/authService.ts']);
  const [multiPrMode, setMultiPrMode] = useState(false);
  const [hideIsolated, setHideIsolated] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
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
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Analiz başarısız oldu.');

      setData(json);
      const topId = json.hotspots?.[0]?.id ?? json.nodes?.[0]?.id;
      setSelectedIds(topId ? [topId] : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sunucuya bağlanılamadı.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    runAnalysis(repoUrl);
  };

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

    const visibleDominoNodes = data.nodes.filter((n) => {
      if (hideIsolated && data.edges.length > 0 && !connectedIds.has(n.id)) return false;
      return true;
    });

    const visibleIds = new Set(visibleDominoNodes.map((n) => n.id));
    const hasSelection = selectedIds.length > 0;

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
            opacity: hasSelection && !isRippleEdge && !e.isCircular ? 0.2 : 1,
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
  }, [data, hideIsolated, selectedIds, directSet, indirectSet]);

  useEffect(() => {
    const timer = setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 80);
    return () => clearTimeout(timer);
  }, [data, hideIsolated, fitView]);

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

  const focusNode = (id: string) => {
    setSelectedIds([id]);
    const target = layoutNodes.find((n) => n.id === id);
    if (target) {
      setCenter(target.position.x + 110, target.position.y + 38, { zoom: 1.15, duration: 450 });
    }
  };

  const filteredNodes = useMemo(
    () =>
      data.nodes.filter(
        (n) =>
          n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.folder.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [data.nodes, searchQuery]
  );

  const selectedNodes = useMemo(
    () => data.nodes.filter((n) => selectedIds.includes(n.id)),
    [data.nodes, selectedIds]
  );

  const totalImpactedCount = directSet.size + indirectSet.size;
  const blastPercentage =
    data.repo.totalFiles > 1 ? Math.round((totalImpactedCount / (data.repo.totalFiles - 1)) * 100) : 0;

  return (
    <div className="h-screen w-screen flex flex-col bg-zinc-950 text-zinc-100">
      {/* Üst Kontrol Çubuğu */}
      <header className="h-14 border-b border-zinc-800 px-4 flex items-center justify-between gap-3 bg-zinc-900/80 shrink-0">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center">
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="font-bold tracking-tight text-base">
            Domino<span className="text-cyan-400">Code</span>
          </span>
        </div>

        <form onSubmit={handleAnalyze} className="flex-1 max-w-xl flex items-center gap-2">
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/kullanici/repo"
            className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-cyan-400"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-zinc-950 font-semibold text-sm px-4 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Taranıyor...' : 'Analiz Et'}
          </button>
        </form>

        <div className="flex items-center gap-2 text-xs shrink-0">
          {QUICK_DEMOS.map((demo) => (
            <button
              key={demo.url}
              type="button"
              onClick={() => runAnalysis(demo.url)}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1.5 rounded-lg border border-zinc-700 cursor-pointer transition"
            >
              {demo.label}
            </button>
          ))}

          <label className="flex items-center gap-1.5 cursor-pointer select-none bg-zinc-800 px-2.5 py-1.5 rounded-lg border border-zinc-700">
            <input
              type="checkbox"
              checked={multiPrMode}
              onChange={(e) => setMultiPrMode(e.target.checked)}
              className="accent-cyan-400"
            />
            <span>Çoklu PR</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer select-none bg-zinc-800 px-2.5 py-1.5 rounded-lg border border-zinc-700">
            <input
              type="checkbox"
              checked={hideIsolated}
              onChange={(e) => setHideIsolated(e.target.checked)}
              className="accent-cyan-400"
            />
            <span>İzoleleri Gizle</span>
          </label>
        </div>
      </header>

      {error && (
        <div className="bg-rose-950/90 border-b border-rose-500/40 px-4 py-2 text-xs text-rose-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* 3 Panelli Kokpit */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sol Panel */}
        <aside className="w-68 border-r border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-2.5">
              <div className="text-[11px] text-zinc-400">Taranan Dosya</div>
              <div className="text-lg font-bold text-zinc-100">{data.repo.totalFiles}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-2.5">
              <div className="text-[11px] text-zinc-400">Döngüsel Hata</div>
              <div className="text-lg font-bold text-purple-400">{data.repo.circularCount}</div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
            <div className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
              <span>Etki Dalga Özeti</span>
              <span className="text-cyan-400 font-bold">%{blastPercentage}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-rose-400">Doğrudan: {directSet.size}</span>
              <span className="text-amber-400">Dolaylı: {indirectSet.size}</span>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              En Kritik Noktalar
            </div>
            <div className="space-y-1.5">
              {data.hotspots.map((spot) => (
                <button
                  key={spot.id}
                  onClick={() => focusNode(spot.id)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg border text-xs transition flex items-center justify-between cursor-pointer ${
                    selectedIds.includes(spot.id)
                      ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-200'
                      : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                  }`}
                >
                  <span className="truncate font-medium max-w-[145px]">{spot.label}</span>
                  <span className="text-[11px] font-bold text-rose-400">{spot.totalImpact} etki</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Dosya ara..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-600"
              />
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {filteredNodes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => focusNode(n.id)}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-zinc-800/80 text-xs text-zinc-400 hover:text-zinc-100 truncate cursor-pointer flex items-center gap-1.5"
                >
                  <GitBranch className="w-3 h-3 shrink-0 text-zinc-500" />
                  <span className="truncate">{n.label}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Orta Harita Kanvası */}
        <main className="flex-1 relative">
          <ReactFlow
            nodes={layoutNodes}
            edges={styledEdges}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            className="dark"
            fitView
          >
            <Background color="#27272a" gap={20} />
            <Controls />
            <MiniMap
              nodeColor={(n) => {
                const state = (n.data as FileNodeData)?.impactState;
                if (state === 'selected') return '#22d3ee';
                if (state === 'direct') return '#f43f5e';
                if (state === 'indirect') return '#f59e0b';
                return '#3f3f46';
              }}
              maskColor="rgba(9, 9, 11, 0.75)"
            />
          </ReactFlow>

          <div className="absolute bottom-4 left-4 bg-zinc-900/90 border border-zinc-800 rounded-lg px-3 py-2 flex items-center gap-4 text-[11px] text-zinc-300 backdrop-blur">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Seçili Dosya
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Doğrudan Etki
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Dolaylı Domino
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400" /> Döngüsel Bağımlılık
            </span>
          </div>
        </main>

        {/* Sağ AI X-Ray Paneli */}
        <XRayDrawer
          apiUrl={API_URL}
          repoUrl={repoUrl}
          selectedNodes={selectedNodes}
          directCount={directSet.size}
          indirectCount={indirectSet.size}
          blastPercentage={blastPercentage}
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
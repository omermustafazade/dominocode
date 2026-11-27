import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fetchRepositoryFiles, type RepoFile } from './github.js';
import { extractDependencies } from './parser.js';
import { buildDominoGraph } from './graph.js';
import { generateFileXRay } from './xray.js';
import type { AnalysisResponse, XRayResponse } from './types.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const analysisCache = new Map<string, AnalysisResponse>();
const repoFilesCache = new Map<string, Map<string, RepoFile>>();
const xrayCache = new Map<string, XRayResponse>();

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'DominoCode API',
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/analyze', async (req, res) => {
  try {
    const repoUrl = String(req.body?.repoUrl ?? '').trim();
    if (!repoUrl) {
      res.status(400).json({ error: 'repoUrl alanı zorunludur.' });
      return;
    }

    const cacheKey = repoUrl.toLowerCase().replace(/\/$/, '');
    if (analysisCache.has(cacheKey)) {
      res.json(analysisCache.get(cacheKey));
      return;
    }

    const { owner, repo, branch, files } = await fetchRepositoryFiles(repoUrl);
    const importedByMap = extractDependencies(files);
    const analysis = buildDominoGraph(owner, repo, branch, files, importedByMap);

    const fileMap = new Map<string, RepoFile>();
    for (const f of files) fileMap.set(f.path, f);

    analysisCache.set(cacheKey, analysis);
    repoFilesCache.set(cacheKey, fileMap);

    res.json(analysis);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bilinmeyen sunucu hatası';
    res.status(500).json({ error: message });
  }
});

app.post('/api/xray', async (req, res) => {
  try {
    const repoUrl = String(req.body?.repoUrl ?? '').trim();
    const filePath = String(req.body?.filePath ?? '').trim();
    const directDependents = Array.isArray(req.body?.directDependents)
      ? (req.body.directDependents as string[])
      : [];
    const totalImpact = Number(req.body?.totalImpact ?? 0);

    if (!filePath) {
      res.status(400).json({ error: 'filePath alanı zorunludur.' });
      return;
    }

    const repoKey = repoUrl.toLowerCase().replace(/\/$/, '');
    const xrayKey = `${repoKey}::${filePath}`;

    if (xrayCache.has(xrayKey)) {
      res.json(xrayCache.get(xrayKey));
      return;
    }

    const codeSnippet = repoFilesCache.get(repoKey)?.get(filePath)?.content ?? '';
    const result = await generateFileXRay(filePath, codeSnippet, directDependents, totalImpact);

    xrayCache.set(xrayKey, result);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'X-Ray analizi başarısız oldu.';
    res.status(500).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`DominoCode backend çalışıyor: http://localhost:${PORT}`);
});
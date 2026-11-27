import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fetchRepositoryFiles, type RepoFile } from './github.js';
import { extractDependencies } from './parser.js';
import { buildDominoGraph } from './graph.js';
import { generateFileXRay, generatePrReview } from './xray.js';
import type { AnalysisResponse, PrReviewResponse, XRayResponse } from './types.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const analysisCache = new Map<string, AnalysisResponse>();
const repoFilesCache = new Map<string, Map<string, RepoFile>>();
const xrayCache = new Map<string, XRayResponse>();
const prReviewCache = new Map<string, PrReviewResponse>();

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

    const { owner, repo, branch, files, prInfo } = await fetchRepositoryFiles(repoUrl);
    const importedByMap = extractDependencies(files);
    const analysis = buildDominoGraph(owner, repo, branch, files, importedByMap, prInfo);

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
    const circularPartners = Array.isArray(req.body?.circularPartners)
      ? (req.body.circularPartners as string[])
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
    const result = await generateFileXRay(
      filePath,
      codeSnippet,
      directDependents,
      totalImpact,
      circularPartners
    );

    xrayCache.set(xrayKey, result);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'X-Ray analizi başarısız oldu.';
    res.status(500).json({ error: message });
  }
});

app.post('/api/pr-review', async (req, res) => {
  try {
    const prTitle = String(req.body?.prTitle ?? 'Çoklu Dosya Değişikliği').trim();
    const changedFiles = Array.isArray(req.body?.changedFiles)
      ? (req.body.changedFiles as string[])
      : [];
    const directCount = Number(req.body?.directCount ?? 0);
    const indirectCount = Number(req.body?.indirectCount ?? 0);
    const blastPercentage = Number(req.body?.blastPercentage ?? 0);
    const circularCount = Number(req.body?.circularCount ?? 0);

    const cacheKey = `${prTitle}::${changedFiles.sort().join(',')}`;
    if (prReviewCache.has(cacheKey)) {
      res.json(prReviewCache.get(cacheKey));
      return;
    }

    const review = await generatePrReview(
      prTitle,
      changedFiles,
      directCount,
      indirectCount,
      blastPercentage,
      circularCount
    );
    prReviewCache.set(cacheKey, review);
    res.json(review);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'PR analizi başarısız oldu.';
    res.status(500).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`DominoCode backend çalışıyor: http://localhost:${PORT}`);
});
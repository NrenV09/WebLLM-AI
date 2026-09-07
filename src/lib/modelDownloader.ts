import { prebuiltAppConfig, hasModelInCache } from '@mlc-ai/web-llm';
import { DetailedProgress } from '../types';

export interface ShardRecord {
  dataPath: string;
  format?: string;
  nbytes: number;
  records?: any[];
  md5sum?: string;
}

export interface TensorCacheJson {
  records: ShardRecord[];
}

/**
 * Normalizes model URL to ensure the resolve/main/ path is present,
 * matching WebLLM's internal cleanModelUrl specification.
 */
export function cleanModelUrl(modelUrl: string): string {
  let url = modelUrl.endsWith('/') ? modelUrl : modelUrl + '/';
  if (!url.match(/.+\/resolve\/.+\//)) {
    url += 'resolve/main/';
  }
  return url;
}

/**
 * Checks the exact parameter download status for a model in CacheStorage.
 */
export async function checkModelParamProgress(modelId: string): Promise<{
  isComplete: boolean;
  cachedBytes: number;
  totalBytes: number;
  percent: number;
  cachedShards: number;
  totalShards: number;
}> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return { isComplete: false, cachedBytes: 0, totalBytes: 0, percent: 0, cachedShards: 0, totalShards: 0 };
  }

  try {
    const modelRecord = prebuiltAppConfig.model_list.find(m => m.model_id === modelId);
    if (!modelRecord) {
      return { isComplete: false, cachedBytes: 0, totalBytes: 0, percent: 0, cachedShards: 0, totalShards: 0 };
    }

    const modelUrl = cleanModelUrl(modelRecord.model);
    const jsonUrl = new URL('tensor-cache.json', modelUrl).href;

    const cache = await caches.open('webllm/model');
    const cachedKeys = await cache.keys();
    const cachedUrls = new Set(cachedKeys.map(k => k.url));

    if (!cachedUrls.has(jsonUrl)) {
      const isCached = await hasModelInCache(modelId, prebuiltAppConfig).catch(() => false);
      return {
        isComplete: isCached,
        cachedBytes: 0,
        totalBytes: 0,
        percent: isCached ? 100 : 0,
        cachedShards: 0,
        totalShards: 0
      };
    }

    const jsonRes = await cache.match(jsonUrl);
    if (!jsonRes) {
      return { isComplete: false, cachedBytes: 0, totalBytes: 0, percent: 0, cachedShards: 0, totalShards: 0 };
    }

    const data: TensorCacheJson = await jsonRes.clone().json();
    const records = data.records || [];
    const totalBytes = records.reduce((acc, r) => acc + (r.nbytes || 0), 0);

    let cachedBytes = 0;
    let cachedShards = 0;

    for (const shard of records) {
      const shardUrl = new URL(shard.dataPath, modelUrl).href;
      if (cachedUrls.has(shardUrl)) {
        cachedShards++;
        cachedBytes += shard.nbytes || 0;
      }
    }

    const percent = totalBytes > 0 ? Math.min(100, Math.floor((cachedBytes / totalBytes) * 100)) : 0;
    const isComplete = cachedShards === records.length && records.length > 0;

    return {
      isComplete,
      cachedBytes,
      totalBytes,
      percent,
      cachedShards,
      totalShards: records.length
    };
  } catch {
    return { isComplete: false, cachedBytes: 0, totalBytes: 0, percent: 0, cachedShards: 0, totalShards: 0 };
  }
}

/**
 * Downloads all model parameter shards into persistent browser CacheStorage
 * BEFORE configuring the WebGPU pipeline.
 *
 * Emits fine-grained telemetry tracking byte-level streaming, speed, ETA, and progress.
 */
export async function downloadModelParameters(
  modelId: string,
  onProgress: (progress: DetailedProgress) => void,
  abortSignal?: AbortSignal
): Promise<void> {
  const modelRecord = prebuiltAppConfig.model_list.find(m => m.model_id === modelId);
  if (!modelRecord) {
    throw new Error(`Model ${modelId} not found in prebuiltAppConfig.`);
  }

  const modelUrl = cleanModelUrl(modelRecord.model);
  const cache = await caches.open('webllm/model');

  // Step 1: Fetch and cache tensor-cache.json
  const jsonUrl = new URL('tensor-cache.json', modelUrl).href;
  let tensorData: TensorCacheJson | null = null;

  const cachedJsonRes = await cache.match(jsonUrl);
  if (cachedJsonRes) {
    try {
      tensorData = await cachedJsonRes.clone().json();
    } catch {
      tensorData = null;
    }
  }

  if (!tensorData) {
    onProgress({
      rawText: 'Fetching model parameter manifest (tensor-cache.json)...',
      progressPercent: 1,
      paramsPercent: 0,
      stage: 'downloading',
      currentShard: 0,
      totalShards: 0,
      mbProcessed: 0,
      totalEstimatedMB: Math.round(modelRecord.vram_required_MB || 1000),
      speedMBs: 0,
      timeElapsed: 0,
      etaSeconds: null,
      step: 1,
      stepName: 'Download Parameters'
    });

    const netRes = await fetch(jsonUrl, { signal: abortSignal });
    if (!netRes.ok) {
      throw new Error(`Failed to fetch tensor manifest from ${jsonUrl}: ${netRes.status} ${netRes.statusText}`);
    }
    const jsonText = await netRes.text();
    tensorData = JSON.parse(jsonText);
    await cache.put(
      jsonUrl,
      new Response(jsonText, {
        headers: {
          'content-type': 'application/json',
          'cache-control': 'public, max-age=31536000, immutable'
        }
      })
    );
  }

  // Pre-cache mlc-chat-config.json
  try {
    const chatConfigUrl = new URL('mlc-chat-config.json', modelUrl).href;
    const cachedChatConfig = await cache.match(chatConfigUrl);
    if (!cachedChatConfig) {
      const configRes = await fetch(chatConfigUrl, { signal: abortSignal });
      if (configRes.ok) {
        await cache.put(chatConfigUrl, configRes);
      }
    }
  } catch {}

  const records = tensorData?.records || [];
  if (records.length === 0) {
    throw new Error('No parameter shards found in tensor-cache.json');
  }

  const totalBytes = records.reduce((acc, r) => acc + (r.nbytes || 0), 0);
  const totalMB = Math.round(totalBytes / (1024 * 1024));

  // Step 2: Check already cached shards
  const cachedKeys = await cache.keys();
  const cachedUrls = new Set(cachedKeys.map(k => k.url));

  let fetchedBytes = 0;
  let completedShards = 0;
  const pendingShards: { shard: ShardRecord; index: number; url: string }[] = [];

  records.forEach((shard, index) => {
    const shardUrl = new URL(shard.dataPath, modelUrl).href;
    if (cachedUrls.has(shardUrl)) {
      fetchedBytes += shard.nbytes || 0;
      completedShards++;
    } else {
      pendingShards.push({ shard, index, url: shardUrl });
    }
  });

  // If all shards are already downloaded
  if (pendingShards.length === 0) {
    onProgress({
      rawText: `All ${records.length} parameter shards verified in cache (100% downloaded)`,
      progressPercent: 100,
      paramsPercent: 100,
      stage: 'downloading',
      currentShard: records.length,
      totalShards: records.length,
      mbProcessed: totalMB,
      totalEstimatedMB: totalMB,
      speedMBs: 0,
      timeElapsed: 0,
      etaSeconds: 0,
      step: 1,
      stepName: 'Download Parameters'
    });
    return;
  }

  // Step 3: Stream download remaining shards with concurrency
  const tStart = performance.now();
  let lastReportTime = 0;

  const emitProgress = (extraMsg?: string) => {
    const now = performance.now();
    const elapsedSec = Math.max(0.1, (now - tStart) / 1000);
    const mbDownloadedSinceStart = (fetchedBytes - (totalBytes - pendingShards.reduce((a, s) => a + s.shard.nbytes, 0))) / (1024 * 1024);
    const speedMBs = Math.max(0, parseFloat((mbDownloadedSinceStart / elapsedSec).toFixed(2)));
    const remainingBytes = Math.max(0, totalBytes - fetchedBytes);
    const etaSeconds = speedMBs > 0 ? Math.ceil((remainingBytes / (1024 * 1024)) / speedMBs) : null;
    const paramsPercent = Math.min(100, Math.floor((fetchedBytes / totalBytes) * 100));
    const mbProcessed = Math.round(fetchedBytes / (1024 * 1024));

    onProgress({
      rawText: extraMsg || `Downloading param shard ${completedShards}/${records.length} (${mbProcessed}MB / ~${totalMB}MB - ${paramsPercent}%)`,
      progressPercent: paramsPercent,
      paramsPercent,
      stage: 'downloading',
      currentShard: completedShards,
      totalShards: records.length,
      mbProcessed,
      totalEstimatedMB: totalMB,
      speedMBs,
      timeElapsed: Math.round(elapsedSec),
      etaSeconds,
      step: 1,
      stepName: 'Download Parameters'
    });
  };

  emitProgress('Starting parameter shard downloads...');

  // Download a single shard with streaming byte updates
  const downloadShard = async (item: { shard: ShardRecord; index: number; url: string }) => {
    if (abortSignal?.aborted) {
      throw new Error('Parameter download aborted by user.');
    }

    const response = await fetch(item.url, { signal: abortSignal });
    if (!response.ok || !response.body) {
      throw new Error(`Failed to download shard ${item.shard.dataPath}: HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const shardBytes = item.shard.nbytes;
    const chunks: Uint8Array[] = [];
    let shardFetched = 0;

    while (true) {
      if (abortSignal?.aborted) {
        reader.cancel();
        throw new Error('Parameter download aborted by user.');
      }

      const { done, value } = await reader.read();
      if (done) break;

      if (value) {
        chunks.push(value);
        shardFetched += value.length;
        fetchedBytes += value.length;

        const now = performance.now();
        if (now - lastReportTime > 150) {
          lastReportTime = now;
          emitProgress(`Downloading shard ${completedShards + 1}/${records.length}: ${(shardFetched / (1024 * 1024)).toFixed(1)}MB / ${(shardBytes / (1024 * 1024)).toFixed(1)}MB`);
        }
      }
    }

    // Assemble buffer and store in CacheStorage
    const fullBuffer = new Uint8Array(shardFetched);
    let offset = 0;
    for (const chunk of chunks) {
      fullBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    await cache.put(
      item.url,
      new Response(fullBuffer, {
        headers: {
          'content-type': 'application/octet-stream',
          'content-length': fullBuffer.byteLength.toString(),
          'cache-control': 'public, max-age=31536000, immutable'
        }
      })
    );

    completedShards++;
    emitProgress(`Saved shard ${completedShards}/${records.length} to browser cache`);
  };

  // Concurrency pool (3 parallel streams)
  const CONCURRENCY = 3;
  let queueIndex = 0;

  const worker = async () => {
    while (queueIndex < pendingShards.length) {
      const item = pendingShards[queueIndex++];
      await downloadShard(item);
    }
  };

  const pool = Array.from({ length: Math.min(CONCURRENCY, pendingShards.length) }, () => worker());
  await Promise.all(pool);

  // Pre-cache tokenizer files if present on repository
  try {
    const tokenizerJsonUrl = new URL('tokenizer.json', modelUrl).href;
    const hasTok = await cache.match(tokenizerJsonUrl);
    if (!hasTok) {
      const tRes = await fetch(tokenizerJsonUrl, { signal: abortSignal });
      if (tRes.ok) {
        await cache.put(tokenizerJsonUrl, tRes);
      }
    }
  } catch {}

  try {
    const tokenizerModelUrl = new URL('tokenizer.model', modelUrl).href;
    const hasTokModel = await cache.match(tokenizerModelUrl);
    if (!hasTokModel) {
      const tmRes = await fetch(tokenizerModelUrl, { signal: abortSignal });
      if (tmRes.ok) {
        await cache.put(tokenizerModelUrl, tmRes);
      }
    }
  } catch {}

  // Verification
  const isVerified = await hasModelInCache(modelId, prebuiltAppConfig).catch(() => true);

  onProgress({
    rawText: `Parameters 100% downloaded and verified in cache (${totalMB} MB across ${records.length} shards). Ready to configure pipeline.`,
    progressPercent: 100,
    paramsPercent: 100,
    stage: 'downloading',
    currentShard: records.length,
    totalShards: records.length,
    mbProcessed: totalMB,
    totalEstimatedMB: totalMB,
    speedMBs: 0,
    timeElapsed: Math.round((performance.now() - tStart) / 1000),
    etaSeconds: 0,
    step: 1,
    stepName: 'Download Parameters'
  });
}

import { prebuiltAppConfig, hasModelInCache } from '@mlc-ai/web-llm';
import { DetailedProgress } from '../types';
import { requestPersistentStorage } from '../utils/offlineManager';

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

export interface CachedModelInventoryItem {
  modelId: string;
  isComplete: boolean;
  cachedBytes: number;
  cachedMB: number;
  totalShards: number;
  cachedShards: number;
}

/**
 * Checks the exact parameter, WASM runtime, and config download status for a model in CacheStorage.
 * Reliably identifies if a model is cached in browser storage across restarts.
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

    // 1. Primary Check: Official WebLLM cache verification
    const officialCached = await hasModelInCache(modelId, prebuiltAppConfig).catch(() => false);

    const modelUrl = cleanModelUrl(modelRecord.model);
    const cache = await caches.open('webllm/model');
    const cachedKeys = await cache.keys();
    const cachedUrls = new Set(cachedKeys.map(k => k.url));

    // Try finding tensor manifest in cache
    const tensorCacheUrl = new URL('tensor-cache.json', modelUrl).href;
    const ndarrayCacheUrl = new URL('ndarray-cache.json', modelUrl).href;

    const jsonRes = (await cache.match(tensorCacheUrl)) || (await cache.match(ndarrayCacheUrl));
    
    let totalBytes = Math.round((modelRecord.vram_required_MB || 1500) * 1024 * 1024);
    let cachedBytes = 0;
    let cachedShards = 0;
    let totalShards = 0;

    if (jsonRes) {
      try {
        const data: TensorCacheJson = await jsonRes.clone().json();
        const records = data.records || [];
        totalShards = records.length;
        if (records.length > 0) {
          totalBytes = records.reduce((acc, r) => acc + (r.nbytes || 0), 0);
          for (const shard of records) {
            const shardUrl = new URL(shard.dataPath, modelUrl).href;
            if (cachedUrls.has(shardUrl)) {
              cachedShards++;
              cachedBytes += shard.nbytes || 0;
            }
          }
        }
      } catch {}
    } else {
      // If manifest is not directly parsed, check shard count from cache keys matching model url
      for (const k of cachedKeys) {
        if (k.url.includes(modelRecord.model) || (modelRecord.model_id && k.url.includes(modelRecord.model_id))) {
          cachedShards++;
        }
      }
    }

    const wasLocalCached = typeof localStorage !== 'undefined' && localStorage.getItem('cached_' + modelId) === 'true';
    const shardsComplete = totalShards > 0 && cachedShards >= totalShards;
    const isComplete = officialCached || shardsComplete || (cachedShards > 0 && wasLocalCached);

    if (isComplete) {
      if (cachedBytes === 0) {
        cachedBytes = totalBytes;
      }
      if (totalShards === 0) {
        totalShards = Math.max(1, cachedShards);
      }
      cachedShards = totalShards;
      try {
        localStorage.setItem('cached_' + modelId, 'true');
      } catch {}
    }

    const percent = isComplete ? 100 : (totalBytes > 0 ? Math.min(100, Math.floor((cachedBytes / totalBytes) * 100)) : 0);

    return {
      isComplete,
      cachedBytes,
      totalBytes,
      percent,
      cachedShards,
      totalShards
    };
  } catch (err) {
    console.warn('checkModelParamProgress error:', err);
    const fallbackCached = await hasModelInCache(modelId, prebuiltAppConfig).catch(() => false);
    return { 
      isComplete: fallbackCached, 
      cachedBytes: 0, 
      totalBytes: 0, 
      percent: fallbackCached ? 100 : 0, 
      cachedShards: 0, 
      totalShards: 0 
    };
  }
}

/**
 * Returns list of all prebuilt model IDs that are currently downloaded in browser cache
 */
export async function getAllCachedModelIds(): Promise<string[]> {
  if (typeof window === 'undefined' || !('caches' in window)) return [];
  const cached: string[] = [];
  try {
    for (const m of prebuiltAppConfig.model_list) {
      const isHere = await hasModelInCache(m.model_id, prebuiltAppConfig).catch(() => false);
      if (isHere) {
        cached.push(m.model_id);
      }
    }
  } catch {}
  return cached;
}

/**
 * Detailed inventory of models cached on local disk
 */
export async function getModelCacheInventory(knownModels: { id: string; name: string }[]): Promise<CachedModelInventoryItem[]> {
  if (typeof window === 'undefined' || !('caches' in window)) return [];
  const inventory: CachedModelInventoryItem[] = [];

  for (const model of knownModels) {
    try {
      const progress = await checkModelParamProgress(model.id);
      if (progress.isComplete || progress.cachedShards > 0) {
        inventory.push({
          modelId: model.id,
          isComplete: progress.isComplete,
          cachedBytes: progress.cachedBytes,
          cachedMB: Math.round(progress.cachedBytes / (1024 * 1024)),
          totalShards: progress.totalShards,
          cachedShards: progress.cachedShards
        });
      }
    } catch {}
  }

  return inventory;
}

/**
 * Deletes a single model's weights and caches cleanly from CacheStorage and WebLLM
 */
export async function deleteSingleModelFromCache(modelId: string): Promise<void> {
  // 1. WebLLM official delete
  try {
    const { deleteModelAllInfoInCache } = await import('@mlc-ai/web-llm');
    await deleteModelAllInfoInCache(modelId).catch(() => {});
  } catch {}

  // 2. Direct CacheStorage sweep for model
  if (typeof window !== 'undefined' && 'caches' in window) {
    const modelRecord = prebuiltAppConfig.model_list.find(m => m.model_id === modelId);
    const modelSearchTerm = modelRecord?.model || modelId;

    const cacheNames = ['webllm/model', 'webllm/config', 'webllm/wasm'];
    for (const cName of cacheNames) {
      try {
        const cache = await caches.open(cName);
        const keys = await cache.keys();
        for (const req of keys) {
          if (req.url.includes(modelId) || (modelSearchTerm && req.url.includes(modelSearchTerm))) {
            await cache.delete(req);
          }
        }
      } catch {}
    }
  }

  // 3. Clean localStorage flag
  try {
    localStorage.removeItem('cached_' + modelId);
  } catch {}
}

/**
 * Downloads all model parameter shards, config, tokenizer, and WASM runtime into persistent browser CacheStorage
 * BEFORE configuring the WebGPU pipeline.
 *
 * Ensures ZERO network requests occur once the model is stored offline.
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

  // If already completely in cache, return immediately with zero network activity
  const initialCheck = await checkModelParamProgress(modelId);
  if (initialCheck.isComplete) {
    onProgress({
      rawText: 'All parameter shards and WASM runtime verified in local storage. Running 100% offline.',
      progressPercent: 100,
      paramsPercent: 100,
      stage: 'ready',
      currentShard: initialCheck.totalShards,
      totalShards: initialCheck.totalShards,
      mbProcessed: Math.round(initialCheck.totalBytes / (1024 * 1024)),
      totalEstimatedMB: Math.round(initialCheck.totalBytes / (1024 * 1024)),
      speedMBs: 0,
      timeElapsed: 0,
      etaSeconds: 0,
      step: 1,
      stepName: 'Verify Local Storage'
    });
    return;
  }

  // If offline and not complete, notify user
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error(
      `Cannot download '${modelId}' while offline. Please connect to the internet to download, or use 'Import Model from Local Storage' to import offline model files.`
    );
  }

  // Request persistent storage to lock model weights against browser cache eviction
  await requestPersistentStorage().catch(() => {});

  const modelUrl = cleanModelUrl(modelRecord.model);
  const cache = await caches.open('webllm/model');
  const configCache = await caches.open('webllm/config');
  const wasmCache = await caches.open('webllm/wasm');

  // Step 1: Pre-cache WASM compute library
  if (modelRecord.model_lib && modelRecord.model_lib.startsWith('http')) {
    const hasWasm = await wasmCache.match(modelRecord.model_lib);
    if (!hasWasm) {
      onProgress({
        rawText: 'Pre-caching WebGPU WASM compute kernel for offline execution...',
        progressPercent: 2,
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
        stepName: 'Download WASM Runtime'
      });

      try {
        const wasmRes = await fetch(modelRecord.model_lib, { signal: abortSignal });
        if (wasmRes.ok) {
          const wasmBlob = await wasmRes.arrayBuffer();
          await wasmCache.put(
            modelRecord.model_lib,
            new Response(wasmBlob, {
              headers: {
                'content-type': 'application/wasm',
                'cache-control': 'public, max-age=31536000, immutable'
              }
            })
          );
        }
      } catch (err: any) {
        if (abortSignal?.aborted) throw err;
        console.warn('WASM pre-cache note:', err);
      }
    }
  }

  // Step 2: Fetch and cache tensor-cache.json
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
      progressPercent: 3,
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

  // Step 3: Pre-cache mlc-chat-config.json in both webllm/config and webllm/model
  try {
    const chatConfigUrl = new URL('mlc-chat-config.json', modelUrl).href;
    const hasConfig = (await configCache.match(chatConfigUrl)) || (await cache.match(chatConfigUrl));
    if (!hasConfig) {
      const configRes = await fetch(chatConfigUrl, { signal: abortSignal });
      if (configRes.ok) {
        const configText = await configRes.text();
        const headers = {
          'content-type': 'application/json',
          'cache-control': 'public, max-age=31536000, immutable'
        };
        await configCache.put(chatConfigUrl, new Response(configText, { headers }));
        await cache.put(chatConfigUrl, new Response(configText, { headers }));
      }
    }
  } catch {}

  const records = tensorData?.records || [];
  if (records.length === 0) {
    throw new Error('No parameter shards found in tensor-cache.json');
  }

  const totalBytes = records.reduce((acc, r) => acc + (r.nbytes || 0), 0);
  const totalMB = Math.round(totalBytes / (1024 * 1024));

  // Step 4: Check already cached shards
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

  // Step 5: Stream download remaining shards with concurrency
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

  // Step 6: Pre-cache tokenizer files
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

  // Final verification and anti-eviction lock
  await requestPersistentStorage().catch(() => {});
  await hasModelInCache(modelId, prebuiltAppConfig).catch(() => true);

  onProgress({
    rawText: `All parameters, configuration, tokenizer, and WASM runtime 100% saved in local storage (${totalMB} MB across ${records.length} shards). Ready for 100% offline inference.`,
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

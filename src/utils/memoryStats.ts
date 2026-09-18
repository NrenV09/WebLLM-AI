// Actual Real-Time System & Browser Memory Telemetry Utility

export interface LiveSystemMemory {
  deviceMemoryGB: number | null;
  jsHeapUsedMB: number | null;
  jsHeapTotalMB: number | null;
  jsHeapLimitMB: number | null;
  storageUsageMB: number | null;
  storageQuotaMB: number | null;
  storagePersisted: boolean;
}

/**
 * Queries the actual system and browser memory using genuine browser APIs:
 * - navigator.deviceMemory (Chromium Hardware RAM estimate in GB)
 * - performance.memory (Chromium V8 JS Heap Used, Total, and Limit in bytes)
 * - navigator.storage.estimate() (Origin Cache & IndexedDB used / quota in bytes)
 */
export async function queryActualSystemMemory(): Promise<LiveSystemMemory> {
  let deviceMemoryGB: number | null = null;
  if (typeof navigator !== 'undefined' && 'deviceMemory' in navigator) {
    const raw = (navigator as any).deviceMemory;
    if (typeof raw === 'number' && raw > 0) {
      deviceMemoryGB = raw;
    }
  }

  let jsHeapUsedMB: number | null = null;
  let jsHeapTotalMB: number | null = null;
  let jsHeapLimitMB: number | null = null;

  if (typeof performance !== 'undefined' && (performance as any).memory) {
    const mem = (performance as any).memory;
    if (typeof mem.usedJSHeapSize === 'number') {
      jsHeapUsedMB = Math.round(mem.usedJSHeapSize / (1024 * 1024));
    }
    if (typeof mem.totalJSHeapSize === 'number') {
      jsHeapTotalMB = Math.round(mem.totalJSHeapSize / (1024 * 1024));
    }
    if (typeof mem.jsHeapSizeLimit === 'number') {
      jsHeapLimitMB = Math.round(mem.jsHeapSizeLimit / (1024 * 1024));
    }
  }

  let storageUsageMB: number | null = null;
  let storageQuotaMB: number | null = null;
  let storagePersisted = false;

  if (typeof navigator !== 'undefined' && navigator.storage) {
    try {
      if (navigator.storage.persisted) {
        storagePersisted = await navigator.storage.persisted();
      }
      if (navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        if (typeof est.usage === 'number') {
          storageUsageMB = Math.round(est.usage / (1024 * 1024));
        }
        if (typeof est.quota === 'number') {
          storageQuotaMB = Math.round(est.quota / (1024 * 1024));
        }
      }
    } catch {
      // Storage estimate error fallback
    }
  }

  return {
    deviceMemoryGB,
    jsHeapUsedMB,
    jsHeapTotalMB,
    jsHeapLimitMB,
    storageUsageMB,
    storageQuotaMB,
    storagePersisted,
  };
}

/**
 * Parses WebLLM / TVM runtime memory stats text safely and converts to true MB values
 */
export function parseWebLLMRuntimeStats(statsText: string): {
  allocatedMB: number;
  peakMB: number;
  shaderSubmissions: number;
} {
  let peakMB = 0;
  let allocatedMB = 0;
  let submissions = 0;

  if (!statsText) {
    return { allocatedMB: 0, peakMB: 0, shaderSubmissions: 0 };
  }

  const parseVal = (rawVal: string, unitStr?: string): number => {
    let val = parseFloat(rawVal);
    if (isNaN(val)) return 0;
    const unit = (unitStr || '').toUpperCase().trim();
    if (unit === 'GB') {
      val = val * 1024;
    } else if (unit === 'KB') {
      val = val / 1024;
    } else if (unit === 'B' || (!unit && val > 10000000)) {
      // If over 10 million and no unit, it's bytes
      val = val / (1024 * 1024);
    } else if (!unit && val > 50000) {
      // If over 50,000 and no unit, it's KB
      val = val / 1024;
    }
    return Math.round(val);
  };

  const peakMatch = statsText.match(/peak[-_]memory[=:\s]+(\d+(?:\.\d+)?)\s*(MB|KB|GB|B)?/i);
  if (peakMatch) {
    peakMB = parseVal(peakMatch[1], peakMatch[2]);
  }

  const allMatch = statsText.match(/all[-_]memory[=:\s]+(\d+(?:\.\d+)?)\s*(MB|KB|GB|B)?/i);
  if (allMatch) {
    allocatedMB = parseVal(allMatch[1], allMatch[2]);
  }

  const shaderMatch = statsText.match(/shader[-_]submissions[=:\s]+(\d+)/i);
  if (shaderMatch) {
    submissions = parseInt(shaderMatch[1], 10);
  }

  return {
    allocatedMB,
    peakMB: Math.max(peakMB, allocatedMB),
    shaderSubmissions: submissions,
  };
}

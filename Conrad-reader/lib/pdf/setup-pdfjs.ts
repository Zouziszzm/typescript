/**
 * pdfjs-dist v6+ expects Map.prototype.getOrInsertComputed (ES2026).
 * Polyfill for browsers / runtimes that do not have it yet.
 */
export function ensurePdfJsMapPolyfills(): void {
  if (typeof Map === "undefined") return;

  const proto = Map.prototype as Map<unknown, unknown> & {
    getOrInsertComputed?: (key: unknown, callback: () => unknown) => unknown;
  };

  if (typeof proto.getOrInsertComputed === "function") return;

  Object.defineProperty(Map.prototype, "getOrInsertComputed", {
    value<K, V>(this: Map<K, V>, key: K, callback: () => V): V {
      if (this.has(key)) {
        return this.get(key)!;
      }
      const value = callback();
      this.set(key, value);
      return value;
    },
    writable: true,
    configurable: true,
  });
}

let pdfjsModule: typeof import("pdfjs-dist") | null = null;

export async function loadPdfJs() {
  ensurePdfJsMapPolyfills();
  if (!pdfjsModule) {
    pdfjsModule = await import("pdfjs-dist");
    pdfjsModule.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  }
  return pdfjsModule;
}

/**
 * Frontend vitest setup. jsdom does not implement EventSource, so anything
 * that imports useTimelineStream blows up at module load. We install a
 * minimal no-op stub so tests that don't care about SSE just work, while
 * tests that DO care can override it via vi.stubGlobal.
 */
class NoopEventSource {
  url: string;
  readyState = 0;
  withCredentials = false;
  onopen: ((this: EventSource, ev: Event) => unknown) | null = null;
  onmessage: ((this: EventSource, ev: MessageEvent) => unknown) | null = null;
  onerror: ((this: EventSource, ev: Event) => unknown) | null = null;

  constructor(url: string) {
    this.url = url;
  }

  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(): boolean { return true; }
  close(): void { this.readyState = 2; }

  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;
}

if (typeof (globalThis as { EventSource?: unknown }).EventSource === "undefined") {
  (globalThis as { EventSource: unknown }).EventSource = NoopEventSource;
}

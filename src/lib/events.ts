type Subscriber = (data: string) => void;

// use globalThis to be compatible with Edge/worker runtimes and turbopack
type SSEGlobal = { __sseSubscribers?: Set<Subscriber> } & typeof globalThis;
const g = globalThis as SSEGlobal;
if (!g.__sseSubscribers) g.__sseSubscribers = new Set<Subscriber>();

export type SSEEvent = { type: string; payload?: unknown };

export function publish(event: SSEEvent) {
  // format as named event for EventSource: include 'event:' and 'data:' lines
  const msg = `event: ${event.type}\n` + `data: ${JSON.stringify(event.payload)}\n\n`;
  g.__sseSubscribers?.forEach((fn) => fn(msg));
}

export function subscribe(fn: Subscriber) {
  g.__sseSubscribers?.add(fn);
  return () => g.__sseSubscribers?.delete(fn);
}

export function sendEventFormat(event: SSEEvent) {
  return `event: ${event.type}\n` + `data: ${JSON.stringify(event.payload)}\n\n`;
}

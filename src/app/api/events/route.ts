import { NextResponse } from 'next/server';
import { subscribe, sendEventFormat } from '@/lib/events';

export const runtime = 'edge';

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      let ctl: ReadableStreamDefaultController | null = controller;

      const safeSend = (msg: string) => {
        if (closed || !ctl) return;
        try {
          ctl.enqueue(new TextEncoder().encode(msg));
        } catch (err) {
          closed = true;
          try { ctl.close(); } catch (e) {}
          ctl = null;
        }
      };

      // initial hello
      safeSend(sendEventFormat({ type: 'system.hello', payload: { hello: true } }));

      const unsub = subscribe((msg) => safeSend(msg));
      const iv = setInterval(() => safeSend(sendEventFormat({ type: 'system.heartbeat', payload: { t: Date.now() } })), 25000);

      // return a cleanup function that will be invoked by the runtime when stream is closed
      return () => {
        closed = true;
        try { clearInterval(iv); } catch (e) {}
        try { unsub(); } catch (e) {}
        try { controller.close(); } catch (e) {}
      };
    }
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    }
  });
}

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let filename: string | undefined;
    let buffer: Buffer | undefined;

    if (contentType.includes('multipart/form-data')) {
      // use the Web API formData parser available in Next route handlers
      const fd = await req.formData();
      const file = fd.get('file') as File | null;
      if (!file) return NextResponse.json({ error: 'missing file' }, { status: 400 });
      filename = file.name || 'upload.bin';
      const ab = await file.arrayBuffer();
      buffer = Buffer.from(new Uint8Array(ab));
    } else {
      // fallback to JSON { filename, data } where data may be dataURL or base64
      const body = await req.json().catch(() => ({}));
      const { filename: f, data } = body as { filename?: string; data?: string };
      if (!data || !f) return NextResponse.json({ error: 'missing' }, { status: 400 });
      filename = f;
      const matches = String(data).match(/^data:(.+);base64,(.*)$/);
      const base64 = matches ? matches[2] : data;
      buffer = Buffer.from(String(base64), 'base64');
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const safeName = (filename || 'file').replace(/[^a-z0-9._-]/gi, '_');
    const outName = `${Date.now()}-${safeName}`;
    const outPath = path.join(uploadsDir, outName);
    fs.writeFileSync(outPath, buffer!);
    const url = `/uploads/${outName}`;
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: 'upload failed' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { connectToDB } from '@/lib/mongodb';
import { getUserModel } from '@/models/User';
import { z } from 'zod';

const createAdminSchema = z.object({ name: z.string().min(1), email: z.string().email(), password: z.string().min(8) });

export async function POST(req: Request) {
  try {
    const token = req.headers.get('x-admin-token');
    const expected = process.env.ADMIN_REGISTRATION_TOKEN;
    if (!expected) return NextResponse.json({ error: 'Server not configured for admin registration' }, { status: 500 });
    if (!token || token !== expected) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const data = createAdminSchema.parse(body);

    await connectToDB();
    const User = getUserModel();
    const exists = await User.findOne({ email: data.email }).lean().exec();
    if (exists) return NextResponse.json({ error: 'User already exists' }, { status: 409 });

  // runtime require to avoid bundler issues
  // eslint-disable-next-line no-eval
  const reqfn = eval('require') as NodeRequire;
  const bcrypt = reqfn('bcryptjs') as { hash: (s: string, rounds: number) => Promise<string> };
  const hash = await bcrypt.hash(data.password, 10);

    const created = await User.create({ name: data.name, email: data.email, passwordHash: hash, role: 'admin' });
    return NextResponse.json({ id: created._id, email: created.email, name: created.name, role: created.role }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

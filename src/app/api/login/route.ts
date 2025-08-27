import { NextResponse } from 'next/server';
import connectToDB from '@/lib/mongodb';
import { getUserModel } from '@/models/User';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body || {};
    if (!email || !password) return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    await connectToDB();
  const User = getUserModel();
  // passwordHash is select:false by default; request it explicitly for auth
  const user = await User.findOne({ email }).select('+passwordHash').exec();
    if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    // runtime require bcrypt
  // eslint-disable-next-line no-eval
  const reqfn = eval('require') as NodeRequire;
  const bcrypt = reqfn('bcryptjs') as { compare: (a: string, b: string) => Promise<boolean> };
    const passwordHash = (user as unknown as { passwordHash?: string })?.passwordHash || '';
    const ok = await bcrypt.compare(password, passwordHash);
    if (!ok) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    return NextResponse.json({ id: user._id, email: user.email, name: user.name, role: user.role });
  } catch (e: unknown) {
    let msg = '';
    if (typeof e === 'string') msg = e;
    else if (e instanceof Error) msg = e.message;
    else msg = String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

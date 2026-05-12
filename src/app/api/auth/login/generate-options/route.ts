import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { prisma } from '@/lib/prisma';
import { RP_ID } from '@/lib/webauthn';

export async function POST(req: Request) {
  try {
    const { username } = await req.json();
    const user = await prisma.user.findUnique({
      where: { username },
      include: { authenticators: true }
    });

    if (!user || user.authenticators.length === 0) {
      return NextResponse.json({ error: 'No passkeys found for this user' }, { status: 404 });
    }

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials: user.authenticators.map((dev) => ({
        id: dev.id,
        type: 'public-key',
        transports: dev.transports as any,
      })),
      userVerification: 'preferred',
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { currentChallenge: options.challenge },
    });

    return NextResponse.json(options);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { prisma } from '@/lib/prisma';
import { RP_ID, EXPECTED_ORIGIN } from '@/lib/webauthn';
import { createSession } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const { username, data } = await req.json();
    
    const user = await prisma.user.findUnique({
      where: { username },
      include: { authenticators: { where: { id: data.id } } }
    });

    if (!user || !user.currentChallenge || user.authenticators.length === 0) {
      return NextResponse.json({ error: 'Authentication session expired' }, { status: 400 });
    }

    const dbAuthenticator = user.authenticators[0];

    const verification = await verifyAuthenticationResponse({
      response: data,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: EXPECTED_ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: dbAuthenticator.id,
        publicKey: new Uint8Array(dbAuthenticator.publicKey),
        counter: Number(dbAuthenticator.counter),
        transports: dbAuthenticator.transports as any,
      },
    });

    if (verification.verified) {
      await prisma.authenticator.update({
        where: { id: dbAuthenticator.id },
        data: { counter: BigInt(verification.authenticationInfo.newCounter) }
      });

      await createSession(username);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Authentication failed' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

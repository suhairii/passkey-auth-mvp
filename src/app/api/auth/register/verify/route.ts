import { NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { prisma } from '@/lib/prisma';
import { RP_ID, EXPECTED_ORIGIN } from '@/lib/webauthn';
import { createSession } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const { username, data } = await req.json();
    
    const user = await prisma.user.findUnique({ 
      where: { username },
      include: { authenticators: true } 
    });

    if (!user || !user.currentChallenge) {
      return NextResponse.json({ error: 'Registration session expired' }, { status: 400 });
    }

    const verification = await verifyRegistrationResponse({
      response: data,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: EXPECTED_ORIGIN,
      expectedRPID: RP_ID,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credential } = verification.registrationInfo;

      await prisma.authenticator.create({
        data: {
          id: credential.id,
          userId: user.id,
          publicKey: Buffer.from(credential.publicKey),
          counter: BigInt(credential.counter),
          transports: credential.transports || [],
        },
      });

      await createSession(username);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

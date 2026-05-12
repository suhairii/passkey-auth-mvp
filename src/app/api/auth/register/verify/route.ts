import { NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { getDatabase } from '@/lib/mongodb';
import { RP_ID, EXPECTED_ORIGIN } from '@/lib/webauthn';
import { createSession } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const { username, data } = await req.json();
    const db = await getDatabase();
    const users = db.collection('users');
    const authenticators = db.collection('authenticators');
    
    const user = await users.findOne({ username });

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

      await authenticators.insertOne({
        _id: credential.id as any, // We use credentialID as _id
        userId: user._id,
        publicKey: Buffer.from(credential.publicKey),
        counter: credential.counter,
        transports: credential.transports || [],
        createdAt: new Date(),
      });

      await createSession(username);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

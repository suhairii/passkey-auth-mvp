import { NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
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
      return NextResponse.json({ error: 'Authentication session expired' }, { status: 400 });
    }

    const dbAuthenticator = await authenticators.findOne({ _id: data.id as any });

    if (!dbAuthenticator) {
      return NextResponse.json({ error: 'Authenticator not found' }, { status: 400 });
    }

    const verification = await verifyAuthenticationResponse({
      response: data,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: EXPECTED_ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: dbAuthenticator._id as any,
        publicKey: new Uint8Array(dbAuthenticator.publicKey.buffer),
        counter: dbAuthenticator.counter,
        transports: dbAuthenticator.transports,
      },
    });

    if (verification.verified) {
      await authenticators.updateOne(
        { _id: dbAuthenticator._id },
        { $set: { counter: verification.authenticationInfo.newCounter } }
      );

      await createSession(username);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Authentication failed' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { db } from '@/lib/db';
import { RP_ID, EXPECTED_ORIGIN } from '@/lib/webauthn';

export async function POST(req: Request) {
  try {
    const { username, data } = await req.json();
    const user = db.getUser(username);

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
      const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

      db.addUserDevice(username, {
        credentialPublicKey,
        credentialID,
        counter,
        transports: data.response.transports,
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

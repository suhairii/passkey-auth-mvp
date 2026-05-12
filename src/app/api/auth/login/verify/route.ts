import { NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { db } from '@/lib/db';
import { RP_ID, EXPECTED_ORIGIN } from '@/lib/webauthn';

export async function POST(req: Request) {
  try {
    const { username, data } = await req.json();
    const user = db.getUser(username);

    if (!user || !user.currentChallenge) {
      return NextResponse.json({ error: 'Login session expired' }, { status: 400 });
    }

    // Find the device that matches the credentialID
    const dbDevice = user.devices.find((dev) => dev.id === data.id);

    if (!dbDevice) {
      return NextResponse.json({ error: 'Authenticator not found' }, { status: 400 });
    }

    const verification = await verifyAuthenticationResponse({
      response: data,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: EXPECTED_ORIGIN,
      expectedRPID: RP_ID,
      credential: dbDevice,
    });

    if (verification.verified) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Authentication failed' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

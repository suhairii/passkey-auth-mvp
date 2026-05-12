import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { db } from '@/lib/db';
import { RP_ID } from '@/lib/webauthn';

export async function POST(req: Request) {
  try {
    const { username } = await req.json();
    const user = db.getUser(username);

    if (user.devices.length === 0) {
      return NextResponse.json({ error: 'No passkeys found for this user' }, { status: 404 });
    }

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials: user.devices.map((dev) => ({
        id: dev.id,
        type: 'public-key',
        transports: dev.transports,
      })),
      userVerification: 'preferred',
    });

    db.updateUserChallenge(username, options.challenge);

    return NextResponse.json(options);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { getDatabase } from '@/lib/mongodb';
import { RP_ID } from '@/lib/webauthn';

export async function POST(req: Request) {
  try {
    const { username } = await req.json();
    const db = await getDatabase();
    const users = db.collection('users');
    const authenticators = db.collection('authenticators');

    const user = await users.findOne({ username });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userAuthenticators = await authenticators.find({ userId: user._id }).toArray();

    if (userAuthenticators.length === 0) {
      return NextResponse.json({ error: 'No passkeys found for this user' }, { status: 404 });
    }

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials: userAuthenticators.map((dev) => ({
        id: dev._id as any,
        type: 'public-key',
        transports: dev.transports,
      })),
      userVerification: 'preferred',
    });

    await users.updateOne(
      { _id: user._id },
      { $set: { currentChallenge: options.challenge } }
    );

    return NextResponse.json(options);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

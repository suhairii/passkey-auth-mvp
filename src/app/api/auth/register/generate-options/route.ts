import { NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { getDatabase } from '@/lib/mongodb';
import { RP_ID, RP_NAME } from '@/lib/webauthn';

export async function POST(req: Request) {
  try {
    const { username } = await req.json();

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const db = await getDatabase();
    const users = db.collection('users');

    let user = await users.findOne({ username });
    
    if (!user) {
      const result = await users.insertOne({ 
        username, 
        createdAt: new Date(),
        currentChallenge: null 
      });
      user = { _id: result.insertedId, username };
    }

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: Buffer.from(user._id.toString()),
      userName: user.username,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    // Store challenge in database
    await users.updateOne(
      { _id: user._id },
      { $set: { currentChallenge: options.challenge } }
    );

    return NextResponse.json(options);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

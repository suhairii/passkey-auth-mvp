import { AuthenticatorDevice } from '@simplewebauthn/server';

/**
 * MOCK DATABASE
 * In a production app, use Redis or a real Database (PostgreSQL/MongoDB).
 * Since Next.js API routes are serverless, global variables might reset.
 * For this MVP, we use a global object to demonstrate the flow.
 */

interface User {
  id: string;
  username: string;
  currentChallenge?: string;
  devices: AuthenticatorDevice[];
}

const users: Record<string, User> = {};

export const db = {
  getUser: (username: string) => {
    if (!users[username]) {
      users[username] = {
        id: `user-${Math.random().toString(36).slice(2, 9)}`,
        username,
        devices: [],
      };
    }
    return users[username];
  },
  updateUserChallenge: (username: string, challenge: string) => {
    if (users[username]) {
      users[username].currentChallenge = challenge;
    }
  },
  addUserDevice: (username: string, device: AuthenticatorDevice) => {
    if (users[username]) {
      users[username].devices.push(device);
    }
  },
};

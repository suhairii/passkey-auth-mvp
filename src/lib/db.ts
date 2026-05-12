import { WebAuthnCredential } from '@simplewebauthn/server';

/**
 * MOCK DATABASE
 */

interface User {
  id: string;
  username: string;
  currentChallenge?: string;
  devices: WebAuthnCredential[];
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
  addUserDevice: (username: string, device: WebAuthnCredential) => {
    if (users[username]) {
      users[username].devices.push(device);
    }
  },
};

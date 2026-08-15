// Server-only. Never import this from client-side code (src/App.tsx, components, etc.) —
// it would ship these bcrypt hashes inside the browser bundle.
//
// Demo credentials for presentation purposes. All three accounts share the same
// password so you can log in as any profile: nextune123

export type AuthCredential = {
  userId: string;
  email: string;
  passwordHash: string;
};

export const AUTH_CREDENTIALS: AuthCredential[] = [
  {
    userId: 'user_shashwat_101',
    email: 'listener@nextune.ai',
    passwordHash: '$2b$10$.qIpA7J6muMg0hiHEpD1tuXueXXPOQqe0qmkPSXioVWz34e.cawp.',
  },
  {
    userId: 'user_demo_listener',
    email: 'demo@nextune.ai',
    passwordHash: '$2b$10$.qIpA7J6muMg0hiHEpD1tuXueXXPOQqe0qmkPSXioVWz34e.cawp.',
  },
  {
    userId: 'user_arjit_99',
    email: 'arjitjaiswal7@gmail.com',
    passwordHash: '$2b$10$.qIpA7J6muMg0hiHEpD1tuXueXXPOQqe0qmkPSXioVWz34e.cawp.',
  },
];

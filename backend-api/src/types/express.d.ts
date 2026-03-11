// Augments Express's Request type to include the `user` property
// which Passport.js attaches after successful authentication.
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export {};

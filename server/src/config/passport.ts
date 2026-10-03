import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from '../config/index.js';
import { User } from '../models/index.js';
import { logger } from '../utils/logger.js';

/**
 * Configure Google OAuth 2.0 strategy.
 *
 * Flow:
 *  1. User clicks "Sign in with Google"
 *  2. Google redirects back to /api/v1/auth/google/callback with a profile
 *  3. We find or create a User document with the Google ID
 *  4. We pass the Mongoose user to the callback — passport attaches it to req.user
 *
 * Note: We do NOT use passport sessions (stateless JWT architecture).
 * serializeUser / deserializeUser are no-ops here.
 */
export function configurePassport(): void {
  // Guard: skip strategy registration if credentials are not configured.
  // In test environments GOOGLE_CLIENT_ID may be absent.
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
    logger.warn('Google OAuth credentials not set — Google login disabled');
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: config.GOOGLE_CLIENT_ID,
        clientSecret: config.GOOGLE_CLIENT_SECRET,
        callbackURL: config.GOOGLE_CALLBACK_URL,
        scope: ['profile', 'email'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('No email returned from Google'));
          }

          // Try to find by googleId first (returning user)
          let user = await User.findOne({ googleId: profile.id });

          if (!user) {
            // Try to find by email (user may have registered with email/password)
            user = await User.findOne({ email: email.toLowerCase() });

            if (user) {
              // Link Google ID to existing account
              user.googleId = profile.id;
              await user.save();
            } else {
              // New user — create account without a password
              user = await User.create({
                name: profile.displayName || email.split('@')[0],
                email: email.toLowerCase(),
                googleId: profile.id,
              });
            }
          }

          return done(null, user);
        } catch (err) {
          logger.error({ err }, 'Error in Google OAuth strategy');
          return done(err as Error);
        }
      },
    ),
  );

  // No-op serialize/deserialize — we use JWTs, not sessions
  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user as Express.User));
}

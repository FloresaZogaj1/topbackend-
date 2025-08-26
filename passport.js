const passport = require('passport');

const hasGoogleCreds =
  Boolean(process.env.GOOGLE_CLIENT_ID) &&
  Boolean(process.env.GOOGLE_CLIENT_SECRET);

if (hasGoogleCreds) {
  const GoogleStrategy = require('passport-google-oauth20').Strategy;
  const pool = require('./db');

  passport.use(new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/auth/google/callback',
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value || null;
        const name = profile.displayName || 'Google User';
        const googleId = profile.id;
        const avatar = profile.photos?.[0]?.value || null;

        if (!email) return done(null, false); // kërkon email nga Google

        // 1) gjej user-in sipas google_id ose email
        let [rows] = await pool.query(
          'SELECT id, name, email, role, google_id FROM users WHERE google_id = ? OR email = ? LIMIT 1',
          [googleId, email]
        );

        if (rows.length === 0) {
          // 2) nëse s’ekziston → krijoje
          // NËSE password është NOT NULL, vendos '' (string bosh)
          await pool.query(
            'INSERT INTO users (name, email, password, google_id, avatar, role) VALUES (?, ?, ?, ?, ?, ?)',
            [name, email, '', googleId, avatar, 'user']
          );
          [rows] = await pool.query(
            'SELECT id, name, email, role, google_id FROM users WHERE google_id = ? OR email = ? LIMIT 1',
            [googleId, email]
          );
        } else {
          // 3) nëse ekziston por s’ka google_id, lidhe tani + rifresko avatar
          const u = rows[0];
          if (!u.google_id) {
            await pool.query(
              'UPDATE users SET google_id = ?, avatar = COALESCE(?, avatar), name = COALESCE(name, ?) WHERE id = ?',
              [googleId, avatar, name, u.id]
            );
            const [r2] = await pool.query(
              'SELECT id, name, email, role, google_id FROM users WHERE id = ?',
              [u.id]
            );
            rows = r2;
          }
        }

        return done(null, rows[0]);
      } catch (err) {
        console.log("Google profile:", JSON.stringify(profile, null, 2));

        return done(err);
      }
    }
  ));

  // Nëse përdor vetëm JWT, s’ke nevojë për session serialize/deserialize,
  // ose thjesht lëri – por rruajtset poshtë nuk dëmtojnë.
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const [rows] = await pool.query('SELECT id, name, email, role FROM users WHERE id = ?', [id]);
      done(null, rows[0] || null);
    } catch (e) { done(e); }
  });

  console.log('✅ Google OAuth u AKTIVIZUA.');
} else {
  console.warn('⚠️ Google OAuth ÇAKTIVIZUAR (pa kredenciale).');
}

module.exports = passport;

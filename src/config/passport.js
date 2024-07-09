const passport = require('passport');
const TwitterStrategy = require('passport-twitter').Strategy;

passport.use(new TwitterStrategy({
    consumerKey: process.env.API_KEY,
    consumerSecret: process.env.API_KEY_SECRET,
    callbackURL: process.env.REDIRECT_URL
  },
  function(token, tokenSecret, profile, done) {
    // Save user profile or token details here
    return done(null, { profile, token, tokenSecret });
  }
));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

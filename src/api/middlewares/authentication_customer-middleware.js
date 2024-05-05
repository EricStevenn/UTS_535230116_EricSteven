const passport = require('passport');
const passportJWT = require('passport-jwt');

const config = require('../../core/config');
const { Customer } = require('../../models');

// Authenticate customer based on the JWT token
passport.use(
  'customer',
  new passportJWT.Strategy(
    {
      jwtFromRequest: passportJWT.ExtractJwt.fromAuthHeaderWithScheme('jwt'),
      secretOrKey: config.secret.jwt,
    },
    async (payload, done) => {
      const customer = await Customer.findOne({ id: payload.customer_id });
      return customer ? done(null, customer) : done(null, false);
    }
  )
);

module.exports = passport.authenticate('customer', { session: false });

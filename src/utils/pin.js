const bcrypt = require('bcrypt');

/**
 * Hash a plain text password
 * @param {string} password - The password to be hashed
 * @returns {string}
 */
async function pinHashing(pin) {
  const saltRounds = 16;
  const hashedPin = await new Promise((resolve, reject) => {
    bcrypt.hash(pin, saltRounds, (err, hash) => {
      if (err) {
        reject(err);
      } else {
        resolve(hash);
      }
    });
  });

  return hashedPin;
}

/**
 * Compares a plain text password and its hashed to determine its equality
 * Mainly use for comparing login credentials
 * @param {string} password - A plain text password
 * @param {string} hashedPassword - A hashed password
 * @returns {boolean}
 */
async function pinMatched(pin, hashedPin) {
  return bcrypt.compareSync(pin, hashedPin);
}

module.exports = {
  pinHashing,
  pinMatched,
};
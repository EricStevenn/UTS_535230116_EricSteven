const bcrypt = require('bcrypt');

/**
 * Hash a plain text password
 * @param {string} password - The password to be hashed
 * @returns {string}
 */
async function accessCodeHashing(access_code) {
  const saltRounds = 16;
  const hashedAccessCode = await new Promise((resolve, reject) => {
    bcrypt.hash(access_code, saltRounds, (err, hash) => {
      if (err) {
        reject(err);
      } else {
        resolve(hash);
      }
    });
  });

  return hashedAccessCode;
}

/**
 * Compares a plain text password and its hashed to determine its equality
 * Mainly use for comparing login credentials
 * @param {string} password - A plain text password
 * @param {string} hashedPassword - A hashed password
 * @returns {boolean}
 */
async function accessCodeMatched(access_code, hashedAccessCode) {
  return bcrypt.compareSync(access_code, hashedAccessCode);
}

module.exports = {
  accessCodeHashing,
  accessCodeMatched,
};

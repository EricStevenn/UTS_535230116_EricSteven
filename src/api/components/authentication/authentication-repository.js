const { User } = require('../../../models');

/**
 * Get user by email for login information
 * @param {string} email - Email
 * @returns {Promise}
 */
async function getUserByEmail(email) {
  return User.findOne({ email });
}

async function updateUser(user) {
  try {
    await User.updateOne({ email: user.email }, { $set: user });
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

module.exports = {
  getUserByEmail,
  updateUser,
};

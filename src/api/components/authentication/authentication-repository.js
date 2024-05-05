const { User } = require('../../../models');
const { Customer } = require('../../../models');

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

async function getCustomerByAccountNumber(account_number) {
  return Customer.findOne({ account_number });
}

async function updateCustomer(customer) {
  try {
    await Customer.updateOne({ account_number: customer.account_number }, { $set: customer });
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

module.exports = {
  getUserByEmail,
  updateUser,
  getCustomerByAccountNumber,
  updateCustomer,
};

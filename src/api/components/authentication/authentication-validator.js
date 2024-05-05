const joi = require('joi');
const { account_number, access_code } = require('../../../models/customers-schema');

module.exports = {
  login: {
    body: {
      email: joi.string().email().required().label('Email'),
      password: joi.string().required().label('Password'),
    },
  },

  customerLogin: {
    body: {
      account_number: joi.string().required().label('account_number'),
      access_code: joi.string().required().label('access_code'),
    },
  },

  
};

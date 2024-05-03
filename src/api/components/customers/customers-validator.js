const joi = require('joi');
const { joiPasswordExtendCore } = require('joi-password');
const joiPassword = joi.extend(joiPasswordExtendCore);

module.exports = {
  createCustomer: {
    body: {
      name: joi.string().min(1).max(100).required().label('Name'),
      access_code: joiPassword
        .string()
        .minOfLowercase(1)
        .minOfUppercase(1)
        .minOfNumeric(3)
        .noWhiteSpaces()
        .onlyLatinCharacters()
        .min(6)
        .max(6)
        .required()
        .label('access_code'),
      access_code_confirm: joi.string().required().label('acces_code confirmation'),
      pin: joi.string().pattern(/^\d{6}$/).required().label('Pin'),
      pin_confirm: joi.string().required().label('Pin Confirm'),
      balance: joi.number().min(50000).max(10000000).required().label('Balance'),
    },
  },

  transferValidation: {
    body: {
      access_code: joiPassword
        .string()
        .minOfLowercase(1)
        .minOfUppercase(1)
        .minOfNumeric(3)
        .noWhiteSpaces()
        .onlyLatinCharacters()
        .min(6)
        .max(6)
        .required()
        .label('access_code'),
      transfer_to: joi.string().min(10).max(10).required().label('account_number'),
      amount: joi.number().min(10000).max(1000000).required().label('amount'), //anggap minimal transfer 10K dan maksimal 1M
      pin: joi.string().pattern(/^\d{6}$/).required().label('pin'),
    },
  },

};

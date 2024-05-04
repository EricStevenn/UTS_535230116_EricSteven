const express = require('express');

const authenticationMiddleware = require('../../middlewares/authentication-middleware');
const celebrate = require('../../../core/celebrate-wrappers');
const customersControllers = require('./customers-controller');
const customersValidator = require('./customers-validator');

const route = express.Router();

module.exports = (app) => {
  app.use('/customers', route);

  // Create customer
  route.post(
    '/',
    authenticationMiddleware,
    celebrate(customersValidator.createCustomer),
    customersControllers.createCustomer
  );

  route.get('/', authenticationMiddleware, customersControllers.getCustomers);

  //Get Customers by account_number
  route.get('/:account_number', authenticationMiddleware, customersControllers.getCustomer);

  //transfer saldo ke rekening customer lain
  route.put(
    '/transfer/:account_number',
    authenticationMiddleware,
    celebrate(customersValidator.transferValidation),
    customersControllers.transferAmount
  );

  route.delete('/:account_number', authenticationMiddleware, customersControllers.deleteCustomer);

  route.get('/transaction_history/:account_number', authenticationMiddleware, customersControllers.getTransactionHistory);


};

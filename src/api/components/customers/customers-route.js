const express = require('express');

const authenticationCustomerMiddleware = require('../../middlewares/authentication_customer-middleware'); //authentication untuk customer
const celebrate = require('../../../core/celebrate-wrappers');
const customersControllers = require('./customers-controller');
const customersValidator = require('./customers-validator');

const route = express.Router();

module.exports = (app) => {
  //routing untuk mengakses api customer
  app.use('/customers', route);

  //Membuat nasabah baru
  route.post(
    '/',
    authenticationCustomerMiddleware,
    celebrate(customersValidator.createCustomer),
    customersControllers.createCustomer
  );

  //mendapatkan list nasabah yang ada di database
  route.get('/', authenticationCustomerMiddleware, customersControllers.getCustomers);

  //Cek saldonya nasabah tertentu dengan memasukkan nomor rekening
  route.get('/check_balance/:account_number', authenticationCustomerMiddleware, customersControllers.getCustomer);

  //transfer saldo ke rekening nasabah lain
  route.put(
    '/transfer/:account_number',
    authenticationCustomerMiddleware,
    celebrate(customersValidator.transferValidation),
    customersControllers.transferAmount
  );

  //mengubah access_code nasabah
  route.put(
    '/change_access_code/:account_number', 
    authenticationCustomerMiddleware, 
    celebrate(customersValidator.changeAccessCode),
    customersControllers.changeAccessCode
  );

  //mengubah pin nasabah
  route.put(
    '/change_pin/:account_number', 
    authenticationCustomerMiddleware, 
    celebrate(customersValidator.changePin),
    customersControllers.changePin
  );

  //menghapus akun nasabah
  route.delete('/:account_number', authenticationCustomerMiddleware, customersControllers.deleteCustomer);

  //mendapatkan histori transaksinya nasabah tertentu melalui nomor rekening
  route.get('/transaction_history/:account_number', authenticationCustomerMiddleware, customersControllers.getTransactionHistory);

  //setor uang ke rekening nasabah tertentu
  route.post('/deposit_balance/:account_number', authenticationCustomerMiddleware, customersControllers.depositBalance);

  //tarik uang dari rekenign nasabah tertentu
  route.post('/retrieve_balance/:account_number', authenticationCustomerMiddleware, customersControllers.retrieveBalance);
};

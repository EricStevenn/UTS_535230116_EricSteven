const customersService = require('./customers-service');
const { errorResponder, errorTypes } = require('../../../core/errors');

//Membuat customer_account
async function createCustomer(request, response, next) {
  try {
    const name = request.body.name;
    const access_code = request.body.access_code;
    const access_code_confirm = request.body.access_code_confirm;
    const pin = request.body.pin;
    const pin_confirm = request.body.pin_confirm;
    const balance = request.body.balance;

    const randomNum = Math.floor(Math.random() * 10000000000);
    const account_number = randomNum.toString().padStart(10, '0');

    // Check confirmation password
    if (access_code !== access_code_confirm) {
      throw errorResponder(
        errorTypes.INVALID_ACCESS_CODE,
        'Access code confirmation mismatched'
      );
    }

    if (pin !== pin_confirm) {
      throw errorResponder(
        errorTypes.INVALID_PIN,
        'Pin confirmation mismatched'
      );
    }

    const success = await customersService.createCustomer(name, account_number, access_code, pin, balance);
    if (!success) {
      throw errorResponder(
        errorTypes.UNPROCESSABLE_ENTITY,
        'Failed to create customer account!'
      );
    }

    return response.status(200).json({ name, account_number});
  } catch (error) {
    return next(error);
  }
}


//Retrieve customer
async function getCustomers(request, response, next) {
  try {
    const page_number = parseInt(request.query.page_number) || 1; //halaman default adalah 1, page_number mengharuskan input angka positif, sehingga angka desimal hanya akan diambil angka depan integer sebelum koma, dan input yang formatnya salah akan menampilkan semua user dalam 1 halaman
    const page_size = parseInt(request.query.page_size) || 0; //jika default, semua data akan ditampilkan dalam 1 halaman
    const sort = request.query.sort;
    const search = request.query.search; 

    let fieldSorting, orderSorting;
    if(sort){
      const[field_name, sort_order] = sort.split(':'); //memisahkan antara field dan order untuk sorting.
      fieldSorting = field_name; //membaca field name
      orderSorting = sort_order === 'desc' ? -1 : 1; //membaca order sorting jika desc.
    } else{ //jika tidak ada field_name maupun sort order, atau sort order bukan desc.
      fieldSorting = 'account_number'; //default sort (ascending by email) 
      orderSorting = 1;
    }

    let fieldSearching, keySearching;
    if(search){
      const[field_name, key] = search.split(':'); //memisahkan field dan key untuk searching
      if(field_name === 'name' || field_name === 'account_number'){
        fieldSearching = field_name; //membaaca field name dan key search
        keySearching = key;
      }
    } else{ //jika tidak ada atau field name bukan name atau email maka fieldSearching dan keySearching dianggap kosong
      fieldSearching = '';
      keySearching = '';
    }

    const customers = await customersService.getCustomers(page_number, page_size, fieldSorting, orderSorting, fieldSearching, keySearching); 
    return response.status(200).json(customers);
  } catch (error) {
    return next(error);
  }
}

//get User by account_number
async function getCustomer(request, response, next) {
  try {
    const customer = await customersService.getCustomer(request.params.account_number);

    if (!customer) {
      throw errorResponder(errorTypes.UNPROCESSABLE_ENTITY, 'Unknown Customer');
    }

    return response.status(200).json(customer);
  } catch (error) {
    return next(error);
  }
}

//transfer saldo
async function transferAmount(request, response, next){
  try{
    const sentBy = request.params.account_number;
    const access_code = request.body.access_code;
    const receivedBy = request.body.transfer_to;
    const amount = request.body.amount;
    const pin = request.body.pin;

    if (!(await customersService.checkAccessCode(sentBy, access_code))) {
      throw errorResponder(errorTypes.INVALID_CREDENTIALS, 'Wrong Access Code!');
    }

    if (!(await customersService.checkPin(sentBy, pin))) {
      throw errorResponder(errorTypes.INVALID_CREDENTIALS, 'Wrong Pin!');
    }

    const transferSuccess = await customersService.transferAmount(sentBy, receivedBy, amount);

    if (transferSuccess == null) {
      throw errorResponder(
        errorTypes.UNPROCESSABLE_ENTITY,
        'Failed to transfer!'
      );
    }
    else if(transferSuccess == false){
      throw errorResponder(
        errorTypes.LACK_OF_BALANCE,
        'Not enough balance to transfer!'
      );
    }

    return response.status(200).json({sender: sentBy, receiver: receivedBy, amounts: amount});

  } catch (error){
    return next(error);
  }
}

async function deleteCustomer(request, response, next) {
  try {
    const account_number = request.params.account_number;

    const success = await customersService.deleteCustomer(account_number);
    if (!success) {
      throw errorResponder(
        errorTypes.UNPROCESSABLE_ENTITY,
        'Failed to delete customer'
      );
    }

    return response.status(200).json({ account_number });
  } catch (error) {
    return next(error);
  }
}

//transaction history 
async function getTransactionHistory(request, response, next){
  try{
    const account_number = request.params.account_number;

    const transaction = await customersService.getTransactionHistory(account_number);
    if(!transaction){
      throw errorResponder(
        errorTypes.UNPROCESSABLE_ENTITY,
        'Failed to get transactions history!'
      );
    }

    return response.status(200).json({ transaction });

  } catch (error) {
    return next(error);
  }
}


module.exports = {
  createCustomer,
  getCustomers,
  getCustomer,
  transferAmount,
  deleteCustomer,
  getTransactionHistory,
}
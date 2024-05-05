const customersService = require('./customers-service');
const { errorResponder, errorTypes } = require('../../../core/errors');

/**
 * Handle untuk menambahkan nasabah baru
 * @param {object} request - Express request object
 * @param {object} response - Express response object
 * @param {object} next - Express route middlewares
 * @returns {object} Response object or pass an error to the next route
 */
//Menambahkan nasabah baru ke database
async function createCustomer(request, response, next) {
  try {
    const name = request.body.name;
    const access_code = request.body.access_code;
    const access_code_confirm = request.body.access_code_confirm;
    const pin = request.body.pin;
    const pin_confirm = request.body.pin_confirm;
    const balance = request.body.balance;
 
    //Generate angka random sebagai nomor rekening milik nasabah tertentu
    const randomNum = Math.floor(Math.random() * 10000000000);
    //padStart berguna untuk menentukan panjang nomor rekening menjadi 10
    const account_number = randomNum.toString().padStart(10, '0');

    //Apabila konfirmasi kode akses tidak cocok, maka throw error
    if (access_code !== access_code_confirm) {
      throw errorResponder(
        errorTypes.INVALID_ACCESS_CODE,
        'Access code confirmation mismatched'
      );
    }

    //Cek apakah konfirmasi pin cocok atau tidak
    if (pin !== pin_confirm) {
      throw errorResponder(
        errorTypes.INVALID_PIN,
        'Pin confirmation mismatched'
      );
    }

    const success = await customersService.createCustomer(name, account_number, access_code, pin, balance);
    //jika tidak ada hasil succes atau bernilai false, maka throw error
    if (!success) {
      throw errorResponder(
        errorTypes.UNPROCESSABLE_ENTITY,
        'Failed to create customer account!'
      );
    }

    //mengembalikan response berupa nama nasabah beserta nomor rekeningnya
    return response.status(200).json({ name, account_number});
  } catch (error) {
    return next(error);
  }
}


/**
 * Handle untuk mendapatkan list nasabah yang ada
 * @param {object} request - Express request object
 * @param {object} response - Express response object
 * @param {object} next - Express route middlewares
 * @returns {object} Response object or pass an error to the next route
 */
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
    } else{ //jika tidak ada atau field name bukan name atau account_number maka fieldSearching dan keySearching dianggap kosong
      fieldSearching = '';
      keySearching = '';
    }

    const customers = await customersService.getCustomers(page_number, page_size, fieldSorting, orderSorting, fieldSearching, keySearching); 
    return response.status(200).json(customers);
  } catch (error) {
    return next(error);
  }
}


/**
 * Mengembalikan response berupa info nasabah (khususnya saldo) sesuai dengan nomor rekening di parameter
 * @param {object} request - Express request object
 * @param {object} response - Express response object
 * @param {object} next - Express route middlewares
 * @returns {object} Response object or pass an error to the next route
 */
async function getCustomer(request, response, next) {
  try {
    //mencari nasabah dengan nomor rekening di parameter
    const customer = await customersService.getCustomer(request.params.account_number);
    const pin = request.body.pin;
    const account_number = request.params.account_number; 
 
    //jika tidak ditemukan nasabah di database, throw error
    if (!customer) {
      throw errorResponder(errorTypes.UNPROCESSABLE_ENTITY, 'Unknown Customer');
    }

    //jika pin yang dimasukkan salah, throw error
    if (!await customersService.checkPin(account_number, pin)) {
      throw errorResponder(errorTypes.INVALID_PIN, 'Wrong Pin!');
    }

    //return info mengenai customer
    return response.status(200).json(customer);
  } catch (error) {
    return next(error);
  }
}

/**
 * Handle untuk transfer uang antar nasabah
 * @param {object} request - Express request object
 * @param {object} response - Express response object
 * @param {object} next - Express route middlewares
 * @returns {object} Response object or pass an error to the next route
 */
async function transferAmount(request, response, next){
  try{
    const sentBy = request.params.account_number; //mendaptkan nomor rekening pengirim
    const access_code = request.body.access_code; 
    const receivedBy = request.body.transfer_to; //mendapatkan nomor rekening penerima
    const amount = request.body.amount; //mendapatkan jumlah uang yang ingin dikirim
    const pin = request.body.pin;
 
    //cek apakah kode akses nasabah sudah benar?
    if (!(await customersService.checkAccessCode(sentBy, access_code))) {
      throw errorResponder(errorTypes.INVALID_ACCESS_CODE, 'Wrong Access Code!');
    }

    //cek apakah pin nasabah sudah benar?
    if (!await customersService.checkPin(sentBy, pin)) {
      throw errorResponder(errorTypes.INVALID_PIN, 'Wrong Pin!');
    }

    const transferSuccess = await customersService.transferAmount(sentBy, receivedBy, amount);

    //kondisi ketika transfer tidak berhasil
    if (transferSuccess == null) {
      throw errorResponder(
        errorTypes.UNPROCESSABLE_ENTITY,
        'Failed to transfer!'
      );
    }
    //kondisi ketika jumlah uang yang ingin ditransfer nasabah kurang dari saldo.
    else if(transferSuccess == false){
      throw errorResponder(
        errorTypes.LACK_OF_BALANCE,
        'Not enough balance to transfer!'
      );
    }

    //mengembalikan response berupa nomor rekening pengirim, penerima dan jumlah uang yang dikirim
    return response.status(200).json({sender: sentBy, receiver: receivedBy, amounts: amount});

  } catch (error){
    return next(error);
  }
}

/**
 * Handle untuk menghapus nasabah dari database
 * @param {object} request - Express request object
 * @param {object} response - Express response object
 * @param {object} next - Express route middlewares
 * @returns {object} Response object or pass an error to the next route
 */
async function deleteCustomer(request, response, next) {
  try {
    //memperoleh nomor rekening nasabah yang ingin dihapus akunnya
    const account_number = request.params.account_number;

    const success = await customersService.deleteCustomer(account_number);
    //jika proses penghapusan tidak berhasil, maka throw error (ketika success bernilai null atau false)
    if (!success) {
      throw errorResponder(
        errorTypes.UNPROCESSABLE_ENTITY,
        'Failed to delete customer'
      );
    }
    //mengembalikan nomor rekening nasabah yang telah terhapus 
    return response.status(200).json({ account_number });
  } catch (error) {
    return next(error);
  }
}

/**
 * Handle untuk mendapatkan riwayat transaksi nasabah tertentu
 * @param {object} request - Express request object
 * @param {object} response - Express response object
 * @param {object} next - Express route middlewares
 * @returns {object} Response object or pass an error to the next route
 */
//transaction history 
async function getTransactionHistory(request, response, next){
  try{
    const account_number = request.params.account_number;
    const pin = request.body.pin;

    //jika pin yang dimasukkan salah, throw error
    if (!await customersService.checkPin(account_number, pin)) {
      throw errorResponder(errorTypes.INVALID_PIN, 'Wrong Pin!');
    }

    const transaction = await customersService.getTransactionHistory(account_number);
    //jika transaksi gagal, throw error
    if(!transaction){
      throw errorResponder(
        errorTypes.UNPROCESSABLE_ENTITY,
        'Failed to get transactions history!'
      );
    }
    //mengembalikan transaksinya nasabah tertentu
    return response.status(200).json({ transaction });

  } catch (error) {
    return next(error);
  }
}

/**
 * Handle untuk setor uang nasabah
 * @param {object} request - Express request object
 * @param {object} response - Express response object
 * @param {object} next - Express route middlewares
 * @returns {object} Response object or pass an error to the next route
 */
async function depositBalance(request, response, next){
  try{
    const account_number = request.params.account_number;
    const amount = request.body.amount;
    const pin = request.body.pin;

    if (!await customersService.checkPin(account_number, pin)) {
      throw errorResponder(errorTypes.INVALID_PIN, 'Wrong Pin!');
    }

    const successDepositing = await customersService.depositBalance(account_number, amount);
    if(!successDepositing){
      throw errorResponder(
        errorTypes.UNPROCESSABLE_ENTITY,
        'Failed depositing!'
      );
    }

    return response.status(200).json({ successDepositing });

  } catch (error) {
    return next(error);
  }
}

/**
 * Handle untuk tarik uang nasabah
 * @param {object} request - Express request object
 * @param {object} response - Express response object
 * @param {object} next - Express route middlewares
 * @returns {object} Response object or pass an error to the next route
 */
async function retrieveBalance(request, response, next){
  try{
    const account_number = request.params.account_number;
    const amount = request.body.amount;
    const pin = request.body.pin;

    if (!await customersService.checkPin(account_number, pin)) {
      throw errorResponder(errorTypes.INVALID_PIN, 'Wrong Pin!');
    }

    const successRetrieving = await customersService.retrieveBalance(account_number, amount);
    if(!successRetrieving){
      throw errorResponder(
        errorTypes.UNPROCESSABLE_ENTITY,
        'Failed Retrieving!'
      );
    }

    return response.status(200).json({ successRetrieving });

  } catch (error) {
    return next(error);
  }
}

/**
 * Handle untuk mengubah kode akses akun nasabah
 * @param {object} request - Express request object
 * @param {object} response - Express response object
 * @param {object} next - Express route middlewares
 * @returns {object} Response object or pass an error to the next route
 */
async function changeAccessCode(request, response, next) {
  try {
    const newAccessCode = request.body.new_access_code;
    const confirmedAccessCode = request.body.access_code_confirmation;
    const account_number = request.params.account_number;
    const currAccessCode = request.body.current_access_code;
    //cek apakah konfirmasi kode akses sudah benar?
    if (newAccessCode !== confirmedAccessCode) {
      throw errorResponder(
        errorTypes.INVALID_ACCESS_CODE,
        'Confirmed access code is not matching'
      );
    }

    //cek apakah kode akses lama yang dimasukkan benar atau salah
    if (!await customersService.checkAccessCode(account_number, currAccessCode)){
      throw errorResponder(errorTypes.INVALID_ACCESS_CODE, 'Access Code is Wrong!');
    }

    const changeAccessCodeSuccess = await customersService.changeAccessCode(account_number, newAccessCode);
    
    //jika gagal mengubah kode akses, maka throw error
    if (!changeAccessCodeSuccess) {
      throw errorResponder(
        errorTypes.UNPROCESSABLE_ENTITY,
        'Failed changing access code'
      );
    }
 
    //mengembalikan nomor rekening
    return response.status(200).json({ account_number: account_number });
  } catch (error) {
    return next(error);
  }
}

/**
 * Handle untuk mengubah pin akun nasabah
 * @param {object} request - Express request object
 * @param {object} response - Express response object
 * @param {object} next - Express route middlewares
 * @returns {object} Response object or pass an error to the next route
 */
async function changePin(request, response, next) {
  try {
    const newPin = request.body.new_pin;
    const confirmedPin = request.body.pin_confirmation;
    const account_number = request.params.account_number;
    const currPin = request.body.current_pin;
    //cek apakah konfirmasi pin benar atau tidak
    if (newPin !== confirmedPin) {
      throw errorResponder(
        errorTypes.INVALID_PIN,
        'Confirmed pin is not matching'
      );
    }

    //cek apakah pin yang dimasukkan sesuai dengan pin akun nasabah, jika tidak maka throw error
    if (!await customersService.checkPin(account_number, currPin)){
      throw errorResponder(errorTypes.INVALID_PIN, 'Pin is Wrong!');
    }

    const changePinSuccess = await customersService.changePin(account_number, newPin);
    
    //jika gagal mengganti pin, maka throw error
    if (!changePinSuccess) {
      throw errorResponder(
        errorTypes.UNPROCESSABLE_ENTITY,
        'Failed changing pin'
      );
    }

    return response.status(200).json({ account_number: account_number });
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
  depositBalance,
  retrieveBalance,
  changeAccessCode,
  changePin,
}
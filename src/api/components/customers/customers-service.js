const customersRepository = require('./customers-repository');
const { accessCodeHashing, accessCodeMatched } = require('../../../utils/accessCode');
const { pinHashing, pinMatched } = require('../../../utils/pin');

//create customers
async function createCustomer(name, account_number, access_code, pin, balance) {
    const hashedAccessCode = await accessCodeHashing(access_code);
    const hashedPin = await pinHashing(pin);

    try {
      await customersRepository.createCustomer(name, account_number, hashedAccessCode, hashedPin, balance);
    } catch (err) {
      return null;
    }
  
    return true;
}

//get customers
async function getCustomers(page_number, page_size, fieldSorting, orderSorting, fieldSearching, keySearching) {
  try{
    //Menangani sort yang formatnya salah
    if(!fieldSorting || !['name', 'account_number'].includes(fieldSorting) || !orderSorting){
      fieldSorting = 'account_number'; //sort email secara ascending
      orderSorting = 1;
    }

    //Menangani search yang formatnya salah
    if(!fieldSearching || !['name', 'account_number'].includes(fieldSearching) || !keySearching){
      fieldSearching = '';
      keySearching = '';
    }

    const offset = (page_number - 1) * page_size; //offset merupakan kumpulan users ke-n setelah users yang terskip karena pagination
    const customers = await customersRepository.getCustomers(offset, page_size, fieldSorting, orderSorting, fieldSearching, keySearching); //mendapatkan data users yang ada di database sesuai ketentuan paginasi.
    const totalCustomers = await customersRepository.getSumCustomers(); //memperoleh jumlah keseluruhan users yang ada.

    //Menghitung total halaman yang ada
    const total_pages = Math.ceil(totalCustomers / page_size)

    //Menentukan apakah terdapat halaman sebelumnya dan halaman berikutnya.
    const has_previous_page = page_number > 1;
    const has_next_page = page_number < total_pages;

    //Mengembalikan keterangan-keterangan beserta data-data user.
    return{
      page_number: page_number,
      page_size: page_size,
      count: customers.length,
      total_pages: total_pages,
      has_previous_page: has_previous_page,
      has_next_page: has_next_page,
      data: customers.map(customer => ({  //tidak mengikut sertakan password user.
        name : customer.name,
        account_number: customer.account_number,
      }))
    };
  } catch (err){
    console.error(err);
    throw new Error('Error Ketika Mengambil Data');
  }
}

//get Customer by account_number
async function getCustomer(account_number) {
  const customer = await customersRepository.getCustomerByAccountNumber(account_number);

  // User not found
  if (!customer) {
    return null;
  }

  return {
    name: customer.name,
    account_number: customer.account_number,
  };
}

//Cek kode akses, apakah sudah sesuai atau belum.
async function checkAccessCode(sentBy, access_code) {
  const customer = await customersRepository.getCustomerByAccountNumber(sentBy);
  return accessCodeMatched(access_code, customer.access_code);
}

//Cek Pin, apakah sudah sesuai atau belum.
async function checkPin(sentBy, pin) {
  const customer = await customersRepository.getCustomerByAccountNumber(sentBy);
  return pinMatched(pin, customer.pin);
}

//mengevaluasi hasil transaksi.
async function transferAmount(sentBy, receivedBy, amount) {
  try {
    const sender = await customersRepository.getCustomerByAccountNumber(sentBy);

    if(sender.balance < amount){
      return false;
    }

    // Memanggil fungsi transferToReceiver dari customersRepository
    const transferSuccess = await customersRepository.updateReceiverBalance(receivedBy, amount);

    if (!transferSuccess) {
      return null;
    }

    // Memanggil fungsi updateSenderBalance dari customersRepository
    const updateSenderSuccess = await customersRepository.updateSenderBalance(sentBy, amount);

    if (!updateSenderSuccess) {
      return null;
    }

    // Transfer berhasil
    return true;
  } catch (error) {
    console.error("Gagal melakukan transfer:", error);
    return false;
  }
}

//delete customer by account_number
async function deleteCustomer(account_number) {
  const customer = await customersRepository.getCustomerByAccountNumber(account_number);

  // User not found
  if (!customer) {
    return null;
  }

  try {
    await customersRepository.deleteCustomer(account_number);
  } catch (err) {
    return null;
  }

  return true;
}



module.exports = {
  createCustomer,
  getCustomers,
  getCustomer,
  checkAccessCode,
  checkPin,
  transferAmount,
  deleteCustomer,
}
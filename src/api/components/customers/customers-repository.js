const { Customer } = require('../../../models');
const { Transaction } = require('../../../models');
const {regexSearching} = require('../../../utils/regex');

/**
 * menambahkan akun nasabah baru ke database
 * @param {string} name - nama nasabah
 * @param {string} account_number - nomor rekeningnya nasabah
 * @param {string} access_code - kode akses akun nasabah
 * @param {string} pin - pin akun nasabah
 * @param {number} balance - saldo awal yang disetor nasabah
 * @returns {Promise}
 */
async function createCustomer(name, account_number, access_code, pin, balance) {
  return Customer.create({
    name,
    account_number,
    access_code,
    pin,
    balance,
  });
}


/**
 * Mendapatkan list nasabah dengan pagination
 * @param {number} offset - customer ke-n yang skip customers lain
 * @param {number} page_size - jumlah nasabah dalam 1 halaman
 * @param {string} fieldSorting - info dari nasabah apa yang ingin disort (ascending atau descending)
 * @param {number} orderSorting - menentukan apakah ascending atau descending (1 : -1)
 * @param {number} fieldSearching - info dari nasabah apa yang ingin dicari (nomor rekening atau nama)
 * @param {string} keySearching - nama nasabah atau nomor rekeningnya
 * @returns {object}
 */
async function getCustomers(offset, page_size, fieldSorting, orderSorting, fieldSearching, keySearching) {
  try{
    let customer = Customer.find({}); //mencari semua nasabah yang ada di database.

    if(fieldSearching && keySearching){  //melakukan filter nasabah sesuai dengan searching, menggunakan regex untuk menerima simbol.
      const regexSearch = new RegExp(regexSearching(keySearching), 'i'); //'i' berguna untuk mengabaikan huruf kapital dan kecil.
      
      customer = customer.find({[fieldSearching]: regexSearch }); //mencari field nasabah di database yang match dengan field nasabah di query baik berupa email maupun name.
    }

    if(fieldSorting){  //melakukan sorting pada nasabah
      const sorting = {[fieldSorting]: orderSorting}; //membaca parameter orderSorting apakah desc atau asc.
      customer = customer.sort(sorting); //melakukan sorting customers.
    }

    const customers = await customer.skip(offset).limit(page_size);
    return customers; //mengembalikan nasabah sesuai pagination, sorting, dan searching.
  } catch (err){
    console.error(err);
    throw new Error('Gagal Mengambil Data Users');
  }
}


/**
 * Mendapatkan akun nasabah yang sesuai dengan nomor rekening yang diinginkan di database
 * @param {string} account_number - nomor rekening nasabah
 * @returns {Promise}
 */
async function getCustomerByAccountNumber(account_number) {
  return Customer.findOne({ account_number });
}


/**
 * Menghitung jumlah nasabah yang ada di database
 * @returns {Promise}
 */
async function getSumCustomers(){
  return Customer.countDocuments();
}


/**
 * Memperbarui saldo penerima uang transfer di database
 * @param {string} receivedBy - nomor rekening penerima
 * @param {string} sentBy - nomor rekening pengirim
 * @param {number} amount - jumlah uang yang ditransfer
 * @returns {boolean}
 */
async function updateReceiverBalance(receivedBy, sentBy, amount) {
  try {
    //mencari akun nasabah penerima uang
    const receiver = await Customer.findOne({ account_number: receivedBy });
    //jika gagal menemukan customer yang menerima uang transfer
    if (!receiver) {
      return false; 
    }
    //menjumlahkan saldo penerima dengan jumlah uang yang ditransfer
    const newBalance = receiver.balance + amount;

    //update saldo baru
    await Customer.updateOne({ account_number: receivedBy }, { $set: { balance: newBalance } });

    //menyimpan transaksi
    await savedTransaction(sentBy, receivedBy, amount);

    return true; 
  } catch (error) {
    console.error("Failed updating receiver's balance:", error);
    return false;
  }
}


/**
 * Memperbarui saldo pengirim uang di database
 * @param {string} sentBy - nomor rekening pengirim uang
 * @param {number} amount - jumlah uang yang ditransfer
 * @returns {boolean}
 */
async function updateSenderBalance(sentBy, amount) {
  try {
    const sender = await Customer.findOne({ account_number: sentBy });
    //jika gagal menemukan customer yang transfer uang.
    if (!sender) {
      return false; 
    }
    //mengurangi saldo milik pengirim
    const newBalance = sender.balance - amount;
    //update saldo baru
    await Customer.updateOne({ account_number: sentBy }, { $set: { balance: newBalance } });

    return true; 
  } catch (error) {
    console.error("Failed updating sender's balance:", error);
    return false;
  }
}


/**
 * menghapus akun nasabah dari database
 * @param {string} account_number - nomor rekening nasabah
 * @returns {Promise}
 */
async function deleteCustomer(account_number) {
  return Customer.deleteOne({ account_number: account_number });
}


/**
 * Menyimpan riwayat transaksi nasabah di database
 * @param {string} sentBy - nomor rekening pengirim uang
 * @param {string} receivedBy - nomor rekening penerima uang
 * @param {number} amount - jumlah uang yang ditransfer
 */
async function savedTransaction(sentBy, receivedBy, amount){
  try{
    const newTransaction = new Transaction({
      sender: sentBy,
      receiver: receivedBy,
      amount: amount,
      timestamp: new Date()
    });

    await newTransaction.save() //save transaksi baru ke database

  } catch (error) {
    console.error("Failed to saving the transaction:", error);
  }
}

/**
 * memperoleh list riwayat transaksi nasabah di database
 * @param {string} account_number - nomor rekening nasabah
 * @returns {object}
 */
async function getTransactionHistory(account_number) {
  try {
    const transactions = await Transaction.find({ //mencari riwayat transaksi nasabah tertentu
      $or: [{ sender: account_number }, { receiver: account_number }]
    }, { _id: 0, __v: 0 }).lean();  //.lean() ini berfungsi untuk tidak mengikut sertakan '_id' dan '__v'

    return transactions; 
  } catch (error) {
    console.error("Gagal mendapatkan riwayat transaksi:", error);
    throw error;
  }
}


/**
 * menambahkan saldo nasabah setelah melakukan setor uang di database
 * @param {string} account_number - nomor rekening nasabah
 * @param {number} amount - jumlah uang yang di setor
 * @returns {object}
 */
async function depositBalance(account_number, amount) {
  try {
    const customer = await Customer.findOne({ account_number }); //mencari akun nasabah yang melakukan deposit
    const newBalance = customer.balance + amount; //menambahkan uang ke saldo nasabah

    await Customer.updateOne({ account_number }, { $set: { balance: newBalance } }); //memperbarui saldo nasabah

    return newBalance;
  } catch (error) {
    console.error("Failed depositing:", error);
    throw error;
  }
}

/**
 * mengurangi saldo nasabah setelah menarik uang di database
 * @param {string} account_number - nomor rekening nasabah
 * @param {number} amount - jumlah uang yang ditarik
 * @returns {object}
 */
async function retrieveBalance(account_number, amount) {
  try {
    const customer = await Customer.findOne({ account_number }); //mencari akun nasabah yang melakukan penarikan uang
    const newBalance = customer.balance - amount; //mengurangi saldo nasabah setelah menarik uang

    await Customer.updateOne({ account_number }, { $set: { balance: newBalance } }); //memperbarui saldo nasabah

    return newBalance;
  } catch (error) {
    console.error("Failed Retrieving:", error);
    throw error;
  }
}

/**
 * mengganti kode akses akun nasabah di databasse
 * @param {string} account_number - nomor rekening nasabah
 * @param {string} access_code - kode akses baru nasabah
 * @returns {Promise}
 */
async function changeAccessCode(account_number, access_code) {
  return Customer.updateOne({ account_number }, { $set: { access_code } }); //memperbarui kode akses nasabah menjadi kode akses baru
}


/**
 * mengganti kode akses akun nasabah di databasse
 * @param {string} account_number - nomor rekening nasabah
 * @param {string} pin - pin baru nasabah
 * @returns {Promise}
 */
async function changePin(account_number, pin) {
  return Customer.updateOne({ account_number }, { $set: { pin } }); //memperbarui pin akun nasabah menjadi pin baru
}


module.exports = {
  createCustomer,
  getCustomers,
  getCustomerByAccountNumber,
  getSumCustomers,
  updateSenderBalance,
  updateReceiverBalance,
  deleteCustomer,
  savedTransaction,
  getTransactionHistory,
  depositBalance,
  retrieveBalance,
  changeAccessCode,
  changePin,
}
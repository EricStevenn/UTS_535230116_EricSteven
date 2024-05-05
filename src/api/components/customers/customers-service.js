const customersRepository = require('./customers-repository');
const { accessCodeHashing, accessCodeMatched } = require('../../../utils/accessCode');
const { pinHashing, pinMatched } = require('../../../utils/pin');
const { formattedCurrency } = require('../../../utils/idrFormat');
const { dateFormat } = require('../../../utils/convertDate');

/**
 * Membuat atau menambahkan akun nasabah
 * @param {string} name - nama nasabah
 * @param {string} account_number - nomor rekeningnya nasabah
 * @param {string} access_code - kode akses akun nasabah
 * @param {string} pin - pin akun nasabah
 * @param {number} balance - saldo awal yang disetor nasabah
 * @returns {boolean}
 */
async function createCustomer(name, account_number, access_code, pin, balance) {
    //melakukan hashing kode akses dan pin nasabah agar lebih secured
    const hashedAccessCode = await accessCodeHashing(access_code);
    const hashedPin = await pinHashing(pin);

    try {
      //menunggu proses memasukkan nasabah dengan data atau infonya ke database, apabila gagal return null.
      await customersRepository.createCustomer(name, account_number, hashedAccessCode, hashedPin, balance); 
    } catch (err) {
      return null;
    }
  
    return true;
}

/**
 * Mendapatkan list nasabah dengan pagination
 * @param {number} page_number - halaman ke-n
 * @param {number} page_size - jumlah nasabah dalam 1 halaman
 * @param {string} fieldSorting - info dari nasabah apa yang ingin disort (ascending atau descending)
 * @param {number} orderSorting - menentukan apakah ascending atau descending (1 : -1)
 * @param {number} fieldSearching - info dari nasabah apa yang ingin dicari (nomor rekening atau nama)
 * @param {string} keySearching - nama nasabah atau nomor rekeningnya
 * @returns {object}
 */
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

    const offset = (page_number - 1) * page_size; //offset merupakan kumpulan customers ke-n setelah customers yang terskip karena pagination
    const customers = await customersRepository.getCustomers(offset, page_size, fieldSorting, orderSorting, fieldSearching, keySearching); //mendapatkan data nasabah yang ada di database sesuai ketentuan paginasi.
    const totalCustomers = await customersRepository.getSumCustomers(); //memperoleh jumlah keseluruhan nasabah yang ada.

    //Menghitung total halaman yang ada
    const total_pages = Math.ceil(totalCustomers / page_size)

    //Menentukan apakah terdapat halaman sebelumnya dan halaman berikutnya.
    const has_previous_page = page_number > 1;
    const has_next_page = page_number < total_pages;

    //Mengembalikan keterangan-keterangan beserta data-data nasabah.
    return{
      page_number: page_number,
      page_size: page_size,
      count: customers.length,
      total_pages: total_pages,
      has_previous_page: has_previous_page,
      has_next_page: has_next_page,
      data: customers.map(customer => ({  //hanya mengikutsertakan name dan account_number untuk direturn.
        name : customer.name,
        account_number: customer.account_number,
      }))
    };
  } catch (err){
    console.error(err);
    throw new Error('Error Ketika Mengambil Data');
  }
}


/**
 * Mencari nasabah tertentu dengan nomor rekening
 * @param {string} account_number - nomor rekening nasabah
 * @returns {object}
 */
async function getCustomer(account_number) {
  const customer = await customersRepository.getCustomerByAccountNumber(account_number);

  //jika nasabah tidak ditemukan maka return null
  if (!customer) {
    return null;
  }
 //mengembalikan info nasabah tertentu
  return {
    name: customer.name,
    account_number: customer.account_number,
    balance: customer.balance,
  };
}


/**
 * Cek kode akses nasabah tertentu
 * @param {string} account_number - nomor rekening nasabah
 * @param {string} access_code - kode akses nasabah
 * @returns {boolean}
 */
async function checkAccessCode(account_number, access_code) {
  //menunggu pencarian nasabah dengan nomor rekening
  const customer = await customersRepository.getCustomerByAccountNumber(account_number);
  //return hasil dari memanggil fungsi untuk mencocokkan kode akses nasabah yang diinput dengan yang ada di database.
  return accessCodeMatched(access_code, customer.access_code);
}


/**
 * Cek pin nasabah tertentu
 * @param {string} account_number - nomor rekening nasabah
 * @param {string} pin - pin nasabah
 * @returns {boolean}
 */
async function checkPin(account_number, pin) {
  const customer = await customersRepository.getCustomerByAccountNumber(account_number);
  //return hasil dari memanggil fungsi untuk mencocokkan pin nasabah.
  return pinMatched(pin, customer.pin);
}

/**
 * transfer uang ke nasabah lain
 * @param {string} sentBy - nomor rekening nasabah
 * @param {string} receivedBy - pin nasabah
 * @param {number} amount - jumalh uang yang ditransfer
 * @returns {boolean}
 */
async function transferAmount(sentBy, receivedBy, amount) {
  try {
    //mencari akun pengirim uang
    const sender = await customersRepository.getCustomerByAccountNumber(sentBy);

    //jika tidak ditemukan, maka throw error
    if (!sender) {
      throw new Error("Pengirim tidak ditemukan");
    }

    //cek apakah saldo pengirim tidak mencukupi jumlah uang transfer
    if (sender.balance < amount) {
      throw new Error("Saldo tidak mencukupi");
    }

    //cek apakah transfer berhasil, dan sekaligus memperbarui uang yang ditransfer ke saldo milik penerima
    const transferSuccess = await customersRepository.updateReceiverBalance(receivedBy, sentBy, amount);

    if (!transferSuccess) {
      throw new Error("Gagal mentransfer ke penerima");
    }

    //cek apakah proses memperbarui saldo miliki pengirim berhasil
    const updateSenderSuccess = await customersRepository.updateSenderBalance(sentBy, amount);

    if (!updateSenderSuccess) {
      throw new Error("Gagal memperbarui saldo pengirim");
    }

    //Transfer berhasil
    return true;
  } catch (error) {
    console.error("Gagal melakukan transfer:", error);
    throw error;
  }
}

/**
 * menghapus akun nasabah tertentu
 * @param {string} account_number - nomor rekening nasabah
 * @returns {boolean}
 */
async function deleteCustomer(account_number) {
  //memperoleh nasabah yang dimaksud di database dengan nomor rekening.
  const customer = await customersRepository.getCustomerByAccountNumber(account_number);

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

/**
 * Memperoleh list transaksi antar nasabah baik menerima ataupun transfer uang
 * @param {string} account_number - nomor rekening nasabah
 * @returns {string} - berupa message
 */
async function getTransactionHistory(account_number) {
  try {
    //memperoleh nasabah dengan account_number tertentu
    const customer = await customersRepository.getCustomerByAccountNumber(account_number);
    if (!customer) {
      throw new Error("Customer Not Found");
    }
    const customer_name = customer.name;

    //memperoleh riwayat transaksi milik account_number tertentu
    const transactionsHistory = await customersRepository.getTransactionHistory(account_number);

    //return transaction history yang telah diatur sesuai format
    const formattedTransactionsHistory = await Promise.all(transactionsHistory.map(async transactionHistory => {
      const customerWhoTransfer = await customersRepository.getCustomerByAccountNumber(transactionHistory.sender); //memperoleh akun nasabah yang melakukan transfer
      const senderName = customerWhoTransfer.name; //memperoleh nama nasabah yang transfer uang

      const customerWhoReceive = await customersRepository.getCustomerByAccountNumber(transactionHistory.receiver); //memperoleh akun nasabahh yang menerima uang transfer
      const receiverName = customerWhoReceive.name; //memperoleh nama nasabah yang menerima uang

      const sender = transactionHistory.sender === account_number ? customer_name : senderName; //cek apakah nomor akun yang diinput pernah melakukan transfer atau tidak, jika ya maka memperoleh nomor rekeningnya
      const receiver = transactionHistory.receiver === account_number ? customer_name : receiverName; //cek apakah nomor akun yang diinput pernah menerima uang atau tidak, jika ya maka memperoleh nomor rekeningnya
      const act = transactionHistory.sender === account_number ? "transfer" : "receive"; //menampilkan kegiatan transfer atau menerima uang pada nasabah tertentu
      const amount = await formattedCurrency(transactionHistory.amount);
      const time = dateFormat(transactionHistory.time); //menampilkan waktu melakukan kegiatan transaksi

      let transaction_format;
      let info_message;
      
      //menampilkan message
      if (act === "transfer") {
        info_message = `transfer ${amount} to ${receiver} (${transactionHistory.receiver})`;
        transaction_format = `[${time}]  ${sender} (${transactionHistory.sender}) ${info_message}`;
      } else {
        info_message = `receive ${amount} from ${sender} (${transactionHistory.sender})`;
        transaction_format = `[${time}]  ${receiver} (${transactionHistory.receiver}) ${info_message}`;
      }
      //mengembalikan message
      return transaction_format;
    }));

    //mengembalikan riwayat transaksi 
    return formattedTransactionsHistory;
  } catch (error) {
    console.error("Failed to get transaction history:", error);
    throw error;
  }
}

/** melakukan deposit saldo
 * Memperoleh list transaksi antar nasabah baik menerima ataupun transfer uang
 * @param {string} account_number - nomor rekening nasabah
 * @param {number} amount - jumlah uang yang disetor
 * @returns {string} - berupa message
 */
async function depositBalance(account_number, amount){
  try{
    //memperoleh nasabah dengan nomor rekening yang akan disetor uangnya
    const customer = await customersRepository.getCustomerByAccountNumber(account_number);
    //jika nasabah tidak ditemukan
    if (!customer) {
      throw new Error("Customer Not Found");
    }
 
    //cek apakah kegiatan deposit berhasil atau tidak
    const depositSuccess = await customersRepository.depositBalance(account_number, amount);
    if(!depositSuccess){
      return null;
    }

    //mendapatkan jumlah uang dan saldo setelah disetor yang telah diformat ke mata uang rupiah
    const amounts = await formattedCurrency(amount);
    const newBalance = await formattedCurrency(depositSuccess);
    //mendapatkan waktu ketika nasabah melakukan deposit
    const now = new Date();
    //format waktu
    const currTime = dateFormat(now);
    //mengembalikan message
    return `[${currTime}] Customer ${customer.name} (${customer.account_number}) success depositing ${amounts}. Balance after deposit: ${newBalance}`;

  } catch (error) {
    console.error("Failed to deposit balance:", error);
    throw error;
  } 
}

/**
 * Melakukan penarikan saldo nasabah
 * @param {string} account_number - nomor rekening nasabah
 * @param {number} amount - jumlah uang yang akan ditarik nasabah
 * @returns {string} - berupa message
 */
async function retrieveBalance(account_number, amount){
  try{
    //memperoleh nasabah dengan nomor rekening yang akan ditarik uangnya
    const customer = await customersRepository.getCustomerByAccountNumber(account_number);
    //jika nasabah tidak ditemukan
    if (!customer) {
      throw new Error("Customer Not Found");
    }

    //cek apakah kegiatan deposit berhasil atau tidak
    const retrieveSuccess = await customersRepository.retrieveBalance(account_number, amount);
    if(!retrieveSuccess){
      return null;
    }

    //mendapatkan jumlah uang dan saldo setelah disetor yang telah diformat ke mata uang rupiah
    const amounts = await formattedCurrency(amount);
    const newBalance = await formattedCurrency(retrieveSuccess);
    //mendapatkan waktu ketika nasabah melakukan penarikan uang
    const now = new Date();
    //format waktu sekarang
    const currTime = dateFormat(now);
    //mengembalikan message
    return `[${currTime}] Customer ${customer.name} (${customer.account_number}) success retrieve ${amounts}. Balance after retrieving: ${newBalance}`;

  } catch (error) {
    console.error("Failed to retrieve balance:", error);
    throw error;
  } 
}


/**
 * Melakukan penarikan saldo nasabah
 * @param {string} account_number - nomor rekening nasabah
 * @param {string} access_code - kode akses nasabah
 * @returns {boolean}
 */
async function changeAccessCode(account_number, access_code) {
  const customer = await customersRepository.getCustomerByAccountNumber(account_number);

  if (!customer) {
    return null;
  }

  //hash kode akses baru nasabah
  const hashedAccessCode = await accessCodeHashing(access_code);

  //cek apakah berhasil mengubah kode akses nasabah
  const changeAccessCodeSuccess = await customersRepository.changeAccessCode(account_number, hashedAccessCode);
  
  if (!changeAccessCodeSuccess) {
    return null;
  }

  return true;
}


/**
 * Melakukan penarikan saldo nasabah
 * @param {string} account_number - nomor rekening nasabah
 * @param {string} pin - pin akun nasabah
 * @returns {boolean} 
 */
async function changePin(account_number, pin) {
  const customer = await customersRepository.getCustomerByAccountNumber(account_number);

  if (!customer) {
    return null;
  }

  //hash pin baru akun nasabah
  const hashedPin = await pinHashing(pin);

  //cek apakah berhasil mengubah pin akun nasabah
  const changePinSuccess = await customersRepository.changePin(account_number, hashedPin);
  
  if (!changePinSuccess) {
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
  getTransactionHistory,
  depositBalance,
  retrieveBalance,
  changeAccessCode,
  changePin,
}
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
    balance: customer.balance,
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

    if (!sender) {
      throw new Error("Pengirim tidak ditemukan");
    }

    if (sender.balance < amount) {
      throw new Error("Saldo tidak mencukupi");
    }

    // Memanggil fungsi transferToReceiver dari customersRepository
    const transferSuccess = await customersRepository.updateReceiverBalance(receivedBy, sentBy, amount);

    if (!transferSuccess) {
      throw new Error("Gagal mentransfer ke penerima");
    }

    // Memanggil fungsi updateSenderBalance dari customersRepository
    const updateSenderSuccess = await customersRepository.updateSenderBalance(sentBy, receivedBy, amount);

    if (!updateSenderSuccess) {
      throw new Error("Gagal memperbarui saldo pengirim");
    }

    // Transfer berhasil
    return true;
  } catch (error) {
    console.error("Gagal melakukan transfer:", error);
    throw error;
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

//get transaction history
async function getTransactionHistory(account_number) {
  try {
    //memperoleh customer dengan account_number tertentu
    const customer = await customersRepository.getCustomerByAccountNumber(account_number);
    if (!customer) {
      throw new Error("Customer Not Found");
    }
    const customer_name = customer.name;

    //memperoleh riwayat transaksi milik account_number tertentu
    const transactionsHistory = await customersRepository.getTransactionHistory(account_number);

    //return transaction history yang telah diatur sesuai format
    const formattedTransactionsHistory = await Promise.all(transactionsHistory.map(async transactionHistory => {
      const customerWhoTransfer = await customersRepository.getCustomerByAccountNumber(transactionHistory.sender);
      const senderName = customerWhoTransfer.name;

      const customerWhoReceive = await customersRepository.getCustomerByAccountNumber(transactionHistory.receiver);
      const receiverName = customerWhoReceive.name;

      const sender = transactionHistory.sender === account_number ? customer_name : senderName;
      const receiver = transactionHistory.receiver === account_number ? customer_name : receiverName;
      const act = transactionHistory.sender === account_number ? "transfer" : "receive";
      const amount = new Intl.NumberFormat('id-ID', {style:'currency', currency:'IDR'}).format(transactionHistory.amount);
      const timestamp = dateFormat(transactionHistory.timestamp);

      let transaction_format;
      let info_message;
      
      if (act === "transfer") {
        info_message = `transfer ${amount} to ${receiver} (${transactionHistory.receiver})`;
        transaction_format = `[${timestamp}]  ${sender} (${transactionHistory.sender}) ${info_message}`;
      } else {
        info_message = `receive ${amount} from ${sender} (${transactionHistory.sender})`;
        transaction_format = `[${timestamp}]  ${receiver} (${transactionHistory.receiver}) ${info_message}`;
      }
      return transaction_format;
    }));

    return formattedTransactionsHistory;
  } catch (error) {
    console.error("Failed to get transaction history:", error);
    throw error;
  }
}


//membuat format date
function dateFormat(date) {
  const dateFormatted = new Date(date).toLocaleString('en-GB', { hour12: false });
  return dateFormatted.replace(',', '');
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
  dateFormat,
}
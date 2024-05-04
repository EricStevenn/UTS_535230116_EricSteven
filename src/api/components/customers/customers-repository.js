const { Customer } = require('../../../models');
const { Transaction } = require('../../../models');

//Membuat customer_account
async function createCustomer(name, account_number, access_code, pin, balance) {
  return Customer.create({
    name,
    account_number,
    access_code,
    pin,
    balance,
  });
}

//retrieve customers
async function getCustomers(offset, page_size, fieldSorting, orderSorting, fieldSearching, keySearching) {
  try{
    let customer = Customer.find({}); //mencari semua users yang ada di database.

    if(fieldSearching && keySearching){  //melakukan filter users sesuai dengan searching, menggunakan regex untuk menerima simbol.
      const regexSearch = new RegExp(regexSearching(keySearching), 'i'); //'i' berguna untuk mengabaikan huruf kapital dan kecil.
      
      customer = customer.find({[fieldSearching]: regexSearch }); //mencari field user di database yang match dengan field user di query baik berupa email maupun name.
    }

    if(fieldSorting){  //melakukan sorting pada users
      const sorting = {[fieldSorting]: orderSorting}; //membaca parameter orderSorting apakah desc atau asc.
      customer = customer.sort(sorting); //melakukan sorting  users.
    }

    const customers = await customer.skip(offset).limit(page_size);
    return customers; //mengembalikan users sesui pagination, sorting, dan searching.
  } catch (err){
    console.error(err);
    throw new Error('Gagal Mengambil Data Users');
  }
}

//retrieve user by account_number
async function getCustomerByAccountNumber(account_number) {
  return Customer.findOne({ account_number });
}

//Menghitung jumlah customers yang ada di database
async function getSumCustomers(){
  return Customer.countDocuments();
}

//regex
function regexSearching(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

//transferAmount
async function updateReceiverBalance(receivedBy, sentBy, amount) {
  try {
    const receiver = await Customer.findOne({ account_number: receivedBy });
    //jika gagal menemukan customer yang menerima uang transfer
    if (!receiver) {
      return false; 
    }
    //menjumlahkan saldo dengan jumlah uang yang ditransfer
    const newBalance = receiver.balance + amount;

    await Customer.updateOne({ account_number: receivedBy }, { $set: { balance: newBalance } });

    // Simpan transaksi
    await savedTransaction(sentBy, receivedBy, amount);

    return true; 
  } catch (error) {
    console.error("Failed updating receiver's balance:", error);
    return false;
  }
}

//sender
async function updateSenderBalance(sentBy, receivedBy, amount) {
  try {
    const sender = await Customer.findOne({ account_number: sentBy });
    //jika gagal menemukan customer yang transfer uang.
    if (!sender) {
      return false; 
    }
    //mengurangi saldo milik pengirim
    const newBalance = sender.balance - amount;

    await Customer.updateOne({ account_number: sentBy }, { $set: { balance: newBalance } });

    return true; 
  } catch (error) {
    console.error("Failed updating sender's balance:", error);
    return false;
  }
}

//delete customer
async function deleteCustomer(account_number) {
  return Customer.deleteOne({ account_number: account_number });
}

//transaction history
async function savedTransaction(sentBy, receivedBy, amount){
  try{
    const newTransaction = new Transaction({
      sender: sentBy,
      receiver: receivedBy,
      amount: amount,
      timestamp: new Date()
    });

    await newTransaction.save()

  } catch (error) {
    console.error("Failed to saving the transaction:", error);
  }
}

//getTransactionHistory
async function getTransactionHistory(account_number) {
  try {
    const transactions = await Transaction.find({
      $or: [{ sender: account_number }, { receiver: account_number }]
    }, { _id: 0, __v: 0 }).lean();

    return transactions;
  } catch (error) {
    console.error("Gagal mendapatkan riwayat transaksi:", error);
    throw error;
  }
}


module.exports = {
  createCustomer,
  getCustomers,
  getCustomerByAccountNumber,
  getSumCustomers,
  regexSearching,
  updateSenderBalance,
  updateReceiverBalance,
  deleteCustomer,
  savedTransaction,
  getTransactionHistory,
}
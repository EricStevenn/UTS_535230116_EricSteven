const { Customer } = require('../../../models');

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

//update receiver balance
async function updateReceiverBalance(receivedBy, amount) {
  try{
    const receiver = await Customer.findOne({ account_number: receivedBy });

    if (!receiver) {
      return false; // Gagal memperbarui saldo penerima
    }

    const newBalance = receiver.balance + amount;
    
    await Customer.updateOne({account_number: receivedBy}, {$set: {balance: newBalance}});
    return true;

  } catch (error) {
    console.error("Gagal memperbarui saldo penerima:", error);
    return false; // Gagal memperbarui saldo penerima
  }
}

//update sender balance setelah berhasil melakukan transfer
async function updateSenderBalance(sentBy, amount) {
  try{
    const sender = await Customer.findOne({account_number: sentBy});

    if (!sender) {
      return false; // Gagal memperbarui saldo pengirim
    }

    const newBalance = sender.balance - amount;

    await Customer.updateOne({ account_number: sentBy }, { $set: { balance: newBalance } });
    
    return true;
  } catch (error) {
    console.error("Failed to update sender's balance", error);
    return null; // Gagal memperbarui saldo pengirim
  }
}

//delete customer
async function deleteCustomer(account_number) {
  return Customer.deleteOne({ account_number: account_number });
}

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerByAccountNumber,
  getSumCustomers,
  regexSearching,
  updateReceiverBalance,
  updateSenderBalance,
  deleteCustomer,
}
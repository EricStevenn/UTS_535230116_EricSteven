const authenticationRepository = require('./authentication-repository');
const { generateToken } = require('../../../utils/session-token');
const { passwordMatched } = require('../../../utils/password');
const { accessCodeMatched } = require('../../../utils/accessCode');

/**
 * Check username and password for login.
 * @param {string} email - Email
 * @param {string} password - Password
 * @returns {object} An object containing, among others, the JWT token if the email and password are matched. Otherwise returns null.
 */
async function checkLoginCredentials(email, password) {
  try{
    //mencari user dengan email parameter di database
    const user = await authenticationRepository.getUserByEmail(email);

    //apabila tidak ditemukan user dengan email parameter, maka return null (INVALID_CREDENTIAL).
    if (!user) {
      return null;
    }

    const now = new Date(); //variabel bantuan untuk menentukan waktu sekarang. 
    //merujuk pada kapan terakhir kali waktu user mencoba login, jika ada maka value berupa date. Jika tidak, maka bernilai null.
    const lastAttemptUser = user.last_attempt ? new Date(user.last_attempt) : null; 

    //mencari password parameter di database (password).
    const userPassword = user.password;
    
    //cek apakah password parameter sesuai dengan password user tertentu
    const passwordChecked = await passwordMatched(password, userPassword);

    //jika sudah password sudah benar
    if (passwordChecked) {
      if (lastAttemptUser && (now - lastAttemptUser) >= 30 * 60 * 1000) {
        //reset attempts dan last_attempt.
        user.attempts = 0;
      }
      //kondisi ini digunakan apabila sebelumnya user fail login sebanyak 5 kali, sehingga,
      //walaupun di percobaan selanjutnya, password yang dimasukkan sudah benar, namun tetap perlu menunggu jeda waktu selama n-menit.
      if (user.attempts >= 5){ //misal jeda waktu 30 menit.
        return 'forbidden'; 
      }
      //Jika berhasil login, maka attempts akan direset menjadi 0 dan last_attemptnya menjadi null, sehingga setelah logout bisa login kembali dengan attempt mulai dari 0
      user.attempts = 0;
      user.last_attempt = null;
      //update attempts dan last_attempt user.
      await authenticationRepository.updateUser(user);

      return {
        email: user.email,
        name: user.name,
        user_id: user.id,
        token: generateToken(user.email, user.id),
      };
    } else {
      //Untuk kondisi password tidak sesuai, dan jeda waktu dengan menit ke-n untuk user bisa kembali login.
      if (lastAttemptUser && (now - lastAttemptUser) >= 30 * 60 * 1000) {
        //reset attempts dan last_attempt.
        user.attempts = 0;
        user.last_attempt = null;
      }

      //memastikan attempts bernilai valid.
      if (!user.attempts) {
        user.attempts = 0;
      }

      //increment attempts.
      user.attempts++; 

      //terakhir kali user mencoba login dengan penanggalan yang sesuai dengan waktu dan tanggal saat ini.
      user.last_attempt = now.toISOString();

      //update attempt ataupun last_attempt user.
      await authenticationRepository.updateUser(user);

      //variabel bantuan untuk menentukan format penanggalan dan jam saat user mencoba login.
      const currTime = getLocalDate_Time()

      //pernyataan ketika user_attempt = 5.
      if(user.attempts === 5) {
        return `[${currTime}] User ${user.email} gagal login. Attempt = ${user.attempts}. Limit reached`;
      } 
      
      //return 'forbidden' untuk dibaca di controller dari variabel yang memanggil fungsi ini,
      //sehingga bisa menjalankan throw error FORBIDDEN (bukan INVALID_CREDENTIAL)
      if(user.attempts >5){
        return 'forbidden';
      }
      else {
        //pernyataan ketika user_attempt < 4
        return `[${currTime}] User ${user.email} gagal login. Attempt = ${user.attempts}.`;
      }
    }
  } catch (error) {
    console.error('Error:', error);
    return {error: `Muncul Error Tidak Terduga`};
  }
}

//membatasi attempt login customer
async function checkCustomerLoginCredentials(account_number, access_code) {
  try{
    //mencari Customer dengan email parameter di database
    const customer = await authenticationRepository.getCustomerByAccountNumber(account_number);

    //apabila tidak ditemukan Customer dengan email parameter, maka return null (INVALID_CREDENTIAL).
    if (!customer) {
      return null;
    }

    const now = new Date(); //variabel bantuan untuk menentukan waktu sekarang. 
    //merujuk pada kapan terakhir kali waktu customer mencoba login, jika ada maka value berupa date. Jika tidak, maka bernilai null.
    const lastAttemptCustomer = customer.last_attempt ? new Date(customer.last_attempt) : null; 

    //mencari access_code parameter di database (access_code).
    const customerAccessCode = customer.access_code;
    
    //cek apakah access_code parameter sesuai dengan access_code customer tertentu
    const accessCodeChecked = await accessCodeMatched(access_code, customerAccessCode);

    //jika sudah access_code sudah benar
    if (accessCodeChecked) {
      if (lastAttemptCustomer && (now - lastAttemptCustomer) >= 30 * 60 * 1000) {
        //reset attempts dan last_attempt.
        customer.attempts = 0;
      }
      //kondisi ini digunakan apabila sebelumnya customer fail login sebanyak 5 kali, sehingga,
      //walaupun di percobaan selanjutnya, access_code yang dimasukkan sudah benar, namun tetap perlu menunggu jeda waktu selama n-menit.
      if (customer.attempts >= 5){ //misal jeda waktu 30 menit.
        return 'forbidden'; 
      }
      //Jika berhasil login, maka attempts akan direset menjadi 0 dan last_attemptnya menjadi null, sehingga setelah logout bisa login kembali dengan attempt mulai dari 0
      customer.attempts = 0;
      customer.last_attempt = null;
      //update attempts dan last_attempt customer.
      await authenticationRepository.updateCustomer(customer);

      return {
        account_number: customer.account_number,
        name: customer.name,
        customer_id: customer.id,
        token: generateToken(customer.account_number, customer.id),
      };
    } else {
      //Untuk kondisi access_code tidak sesuai, dan jeda waktu dengan menit ke-n untuk customer bisa kembali login.
      if (lastAttemptCustomer && (now - lastAttemptCustomer) >= 30 * 60 * 1000) {
        //reset attempts dan last_attempt.
        customer.attempts = 0;
        customer.last_attempt = null;
      }

      //memastikan attempts bernilai valid.
      if (!customer.attempts) {
        customer.attempts = 0;
      }

      //increment attempts.
      customer.attempts++; 

      //terakhir kali customer mencoba login dengan penanggalan yang sesuai dengan waktu dan tanggal saat ini.
      customer.last_attempt = now.toISOString();

      //update attempt ataupun last_attempt customer.
      await authenticationRepository.updateCustomer(customer);

      //variabel bantuan untuk menentukan format penanggalan dan jam saat customer mencoba login.
      const currTime = getLocalDate_Time()

      //pernyataan ketika customer_attempt = 5.
      if(customer.attempts === 5) {
        return `[${currTime}] Customer ${customer.account_number} gagal login. Attempt = ${customer.attempts}. Limit reached`;
      } 
      
      //return 'forbidden' untuk dibaca di controller dari variabel yang memanggil fungsi ini,
      //sehingga bisa menjalankan throw error FORBIDDEN (bukan INVALID_CREDENTIAL)
      if(customer.attempts >5){
        return 'forbidden';
      }
      else {
        //pernyataan ketika customer_attempt < 4
        return `[${currTime}] Customer ${customer.account_number} gagal login. Attempt = ${customer.attempts}.`;
      }
    }
  } catch (error) {
    console.error('Error:', error);
    return {error: `Muncul Error Tidak Terduga`};
  }
}

//Membuat fungsi untuk convert penanggalan dan jam menjadi format YYYY-MM-DD hh:mm:ss
function getLocalDate_Time() {
  //mendapatkan penanggalan sekarang
  const now = new Date();
  const tahun = now.getFullYear();
  //index bulan dimulai dari 0 (Januari), sehingga perlu ditambah 1
  //padStart menambahkan angka 0 di depan. Berlaku untuk bulan, hari, jam, menit, detik.
  const bulan = String(now.getMonth() + 1).padStart(2, '0'); 
  const hari = String(now.getDate()).padStart(2, '0'); //mendapatkan current day
  const jam = String(now.getHours()).padStart(2, '0'); //mendapatkan current hours
  const menit = String(now.getMinutes()).padStart(2, '0'); //minutes
  const detik = String(now.getSeconds()).padStart(2, '0'); //seconds

  return `${tahun}-${bulan}-${hari} ${jam}:${menit}:${detik}`; //mengembalikan format penanggalan dan jam ke variabel yang memanggil
}

module.exports = {
  checkLoginCredentials,
  checkCustomerLoginCredentials,
  getLocalDate_Time,
};

const authenticationRepository = require('./authentication-repository');
const { generateToken } = require('../../../utils/session-token');
const { passwordMatched } = require('../../../utils/password');

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
      if (lastAttemptUser && (now - lastAttemptUser) >= 3 * 60 * 1000) {
        //reset attempts dan last_attempt.
        user.attempts = 0;
        user.last_attempt = null;
      }
      //kondisi ini digunakan apabila sebelumnya user fail login sebanyak 5 kali, sehingga,
      //walaupun di percobaan selanjutnya, password yang dimasukkan sudah benar, namun tetap perlu menunggu jeda waktu selama n-menit.
      if (user.attempts > 5 && lastAttemptUser && (now - lastAttemptUser) < 3 * 60 * 1000){ //misal jeda waktu 3 menit.
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
      if (lastAttemptUser && (now - lastAttemptUser) >= 3 * 60 * 1000) {
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
  getLocalDate_Time,
};

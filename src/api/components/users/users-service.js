const usersRepository = require('./users-repository');
const { hashPassword, passwordMatched } = require('../../../utils/password');

/**
 * Get list of users
 * @returns {Array}
 */
async function getUsers(page_number, page_size, fieldSorting, orderSorting, fieldSearching, keySearching) {
  try{
    //Menangani sort yang formatnya salah
    if(!fieldSorting || !['name', 'email'].includes(fieldSorting) || !orderSorting){
      fieldSorting = 'email'; //sort email secara ascending
      orderSorting = 1;
    }

    //Menangani search yang formatnya salah
    if(!fieldSearching || !['name', 'email'].includes(fieldSearching) || !keySearching){
      fieldSearching = '';
      keySearching = '';
    }

    const offset = (page_number - 1) * page_size; //offset merupakan kumpulan users ke-n setelah users yang terskip karena pagination
    const users = await usersRepository.getUsers(offset, page_size, fieldSorting, orderSorting, fieldSearching, keySearching); //mendapatkan data users yang ada di database sesuai ketentuan paginasi.
    const totalUsers = await usersRepository.getSumUsers(); //memperoleh jumlah keseluruhan users yang ada.

    //Menghitung total halaman yang ada
    const total_pages = Math.ceil(totalUsers / page_size)

    //Menentukan apakah terdapat halaman sebelumnya dan halaman berikutnya.
    const has_previous_page = page_number > 1;
    const has_next_page = page_number < total_pages;

    //Mengembalikan keterangan-keterangan beserta data-data user.
    return{
      page_number: page_number,
      page_size: page_size,
      count: users.length,
      total_pages: total_pages,
      has_previous_page: has_previous_page,
      has_next_page: has_next_page,
      data: users.map(user => ({  //tidak mengikut sertakan password user.
        id : user.id,
        name: user.name,
        email: user.email,
      }))
    };
  } catch (err){
    console.error(err);
    throw new Error('Error Ketika Mengambil Data');
  }
} 

/**
 * Get user detail
 * @param {string} id - User ID
 * @returns {Object}
 */
async function getUser(id) {
  const user = await usersRepository.getUser(id);

  // User not found
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

/**
 * Create new user
 * @param {string} name - Name
 * @param {string} email - Email
 * @param {string} password - Password
 * @returns {boolean}
 */
async function createUser(name, email, password) {
  // Hash password
  const hashedPassword = await hashPassword(password);

  try {
    await usersRepository.createUser(name, email, hashedPassword);
  } catch (err) {
    return null;
  }

  return true;
}

/**
 * Update existing user
 * @param {string} id - User ID
 * @param {string} name - Name
 * @param {string} email - Email
 * @returns {boolean}
 */
async function updateUser(id, name, email) {
  const user = await usersRepository.getUser(id);

  // User not found
  if (!user) {
    return null;
  }

  try {
    await usersRepository.updateUser(id, name, email);
  } catch (err) {
    return null;
  }

  return true;
}

/**
 * Delete user
 * @param {string} id - User ID
 * @returns {boolean}
 */
async function deleteUser(id) {
  const user = await usersRepository.getUser(id);

  // User not found
  if (!user) {
    return null;
  }

  try {
    await usersRepository.deleteUser(id);
  } catch (err) {
    return null;
  }

  return true;
}

/**
 * Check whether the email is registered
 * @param {string} email - Email
 * @returns {boolean}
 */
async function emailIsRegistered(email) {
  const user = await usersRepository.getUserByEmail(email);

  if (user) {
    return true;
  }

  return false;
}

/**
 * Check whether the password is correct
 * @param {string} userId - User ID
 * @param {string} password - Password
 * @returns {boolean}
 */
async function checkPassword(userId, password) {
  const user = await usersRepository.getUser(userId);
  return passwordMatched(password, user.password);
}

/**
 * Change user password
 * @param {string} userId - User ID
 * @param {string} password - Password
 * @returns {boolean}
 */
async function changePassword(userId, password) {
  const user = await usersRepository.getUser(userId);

  // Check if user not found
  if (!user) {
    return null;
  }

  const hashedPassword = await hashPassword(password);

  const changeSuccess = await usersRepository.changePassword(
    userId,
    hashedPassword
  );

  if (!changeSuccess) {
    return null;
  }

  return true;
}

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  emailIsRegistered,
  checkPassword,
  changePassword,
};

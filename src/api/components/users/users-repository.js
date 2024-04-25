const { User } = require('../../../models');

/**
 * Get a list of users
 * @returns {Promise}
 */
async function getUsers(offset, page_size, fieldSorting, orderSorting, fieldSearching, keySearching) {
  try{
    let user = User.find({}); //mencari semua users yang ada di database.

    if(fieldSearching && keySearching){  //melakukan filter users sesuai dengan searching, menggunakan regex untuk menerima simbol.
      const regexSearch = new RegExp(regexSearching(keySearching), 'i'); //'i' berguna untuk mengabaikan huruf kapital dan kecil.
      
      user = user.find({[fieldSearching]: regexSearch }); //mencari field user di database yang match dengan field user di query baik berupa email maupun name.
    }

    if(fieldSorting){  //melakukan sorting pada users
      const sorting = {[fieldSorting]: orderSorting}; //membaca parameter orderSorting apakah desc atau asc.
      user = user.sort(sorting); //melakukan sorting  users.
    }

    const users = await user.skip(offset).limit(page_size);
    return users; //mengembalikan users sesui pagination, sorting, dan searching.
  } catch (err){
    console.error(err);
    throw new Error('Gagal Mengambil Data Users');
  }
}

/**
 * Get user detail
 * @param {string} id - User ID
 * @returns {Promise}
 */
async function getUser(id) {
  return User.findById(id);
}

/**
 * Create new user
 * @param {string} name - Name
 * @param {string} email - Email
 * @param {string} password - Hashed password
 * @returns {Promise}
 */
async function createUser(name, email, password) {
  return User.create({
    name,
    email,
    password,
  });
}

/**
 * Update existing user
 * @param {string} id - User ID
 * @param {string} name - Name
 * @param {string} email - Email
 * @returns {Promise}
 */
async function updateUser(id, name, email) {
  return User.updateOne(
    {
      _id: id,
    },
    {
      $set: {
        name,
        email,
      },
    }
  );
}

/**
 * Delete a user
 * @param {string} id - User ID
 * @returns {Promise}
 */
async function deleteUser(id) {
  return User.deleteOne({ _id: id });
}

/**
 * Get user by email to prevent duplicate email
 * @param {string} email - Email
 * @returns {Promise}
 */
async function getUserByEmail(email) {
  return User.findOne({ email });
}

/**
 * Update user password
 * @param {string} id - User ID
 * @param {string} password - New hashed password
 * @returns {Promise}
 */
async function changePassword(id, password) {
  return User.updateOne({ _id: id }, { $set: { password } });
}

async function getSumUsers(){
  return User.countDocuments();
}

//membuat fungsi regex untuk menampung kombinasi karakter(simbol)
function regexSearching(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUserByEmail,
  changePassword,
  getSumUsers,
  regexSearching,
};

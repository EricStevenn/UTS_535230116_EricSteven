const { errorResponder, errorTypes } = require('../../../core/errors');
const authenticationServices = require('./authentication-service');

/**
 * Handle login request
 * @param {object} request - Express request object
 * @param {object} response - Express response object
 * @param {object} next - Express route middlewares
 * @returns {object} Response object or pass an error to the next route
 */
async function login(request, response, next) {
  const { email, password } = request.body;

  try {
    // Check login credentials
    const loginSuccess = await authenticationServices.checkLoginCredentials(email, password);

    if (loginSuccess === null) {  
      //apabila hasil return bernilai null, artinya ada kesalahan di mana user dengan email yang diinput tidak ditemukan.
      throw errorResponder(
        errorTypes.INVALID_CREDENTIALS,
        'Wrong email or password'
      );
    } 
    
    if (loginSuccess === 'forbidden'){
      //hasil return forbidden merujuk ketika user telah menggapai limit failed login, namun mencoba login kembali sebelum jangka waktu tertentu
      throw errorResponder(
        errorTypes.FORBIDDEN,
        'Too many failed login attempts, please try again 30 minutes later.'
      );
    }

    return response.status(200).json(loginSuccess);
  } catch (error) {
    return next(error);
  }
}


async function customerLogin(request, response, next) {
  const { account_number, access_code } = request.body;

  try {
    // Check login credentials
    const loginSuccess = await authenticationServices.checkCustomerLoginCredentials(account_number, access_code);

    if (loginSuccess === null) {  
      //apabila hasil return bernilai null, artinya ada kesalahan di mana user dengan email yang diinput tidak ditemukan.
      throw errorResponder(
        errorTypes.INVALID_CREDENTIALS,
        'Wrong account number or access code'
      );
    } 
    
    if (loginSuccess === 'forbidden'){
      //hasil return forbidden merujuk ketika user telah menggapai limit failed login, namun mencoba login kembali sebelum jangka waktu tertentu
      throw errorResponder(
        errorTypes.FORBIDDEN,
        'Too many failed login attempts, please try again later.'
      );
    }

    return response.status(200).json(loginSuccess);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  login,
  customerLogin,
};

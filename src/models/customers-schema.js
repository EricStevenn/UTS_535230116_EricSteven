const customersSchema = {
  name: String,
  account_number: String,
  access_code: String,
  pin: String,
  balance: Number,
  attempts: {type: Number, default: 0},
  last_attempt: {type: Date, default: null}
};

module.exports = customersSchema;

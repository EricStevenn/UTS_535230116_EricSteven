const transactionsSchema = {
  sender: String,
  receiver: String,
  amount: Number,
  timestamp: Date
};

module.exports = transactionsSchema;
const usersSchema = {
  name: String,
  email: String,
  password: String,
  //menambahkan field attempts dan last_attempt untuk mengetahui jumlah percobaan dan kapan terakhir kali user mencoba untuk login.
  attempts: {type: Number, default: 0},
  last_attempt: {type: Date, default: null}
  };

module.exports = usersSchema;

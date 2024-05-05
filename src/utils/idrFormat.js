async function formattedCurrency(money){
  const formattedMoney = new Intl.NumberFormat('id-ID', {style:'currency', currency:'IDR'}).format(money);
  return formattedMoney;
}

module.exports = {
  formattedCurrency,
};

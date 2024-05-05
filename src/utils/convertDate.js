function dateFormat(date) {
  const dateFormatted = new Date(date).toLocaleString('en-GB', { hour12: false });
  return dateFormatted.replace(',', '');
}

module.exports = {
  dateFormat,
}
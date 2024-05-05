//melakukan regex untuk menerima simbol
function regexSearching(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  regexSearching,
};
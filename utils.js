const { web3 } = require("./web3");

const toWei = (n) => {
  return web3.utils.toWei(n, "ether");
};

const toEth = (n) => {
  return web3.utils.fromWei(n, "ether");
};

const toBN = (string) => {
  return web3.utils.toBN(string);
};

const tokensToWei = (n) => {
  return web3.utils.toWei(n, "nanoether");
};

const weiToTokens = (n) => {
  return web3.utils.fromWei(n, "nanoether");
};

module.exports = {
  toWei,
  toEth,
  tokensToWei,
  weiToTokens,
  toBN,
};

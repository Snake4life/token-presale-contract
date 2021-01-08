const PresaleContract = artifacts.require("PresaleRFIKUSH");
const { WETH } = require("@uniswap/sdk");

module.exports = async function (deployer, network, accounts) {
  await deployer.deploy(
    PresaleContract,
    "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
    WETH[4].address
  );
};

require("dotenv").config();

const { web3, chainId, Contract, admin } = require("../web3");
const { toWei } = require("../utils");
const presaleJson = require("../build/contracts/PresaleRFIKUSH.json");

const presaleContract = new Contract(
  presaleJson.abi,
  presaleJson.networks[5777].address
);

const main = async () => {
  const [owner] = await web3.eth.personal.getAccounts();

  presaleContract.methods
    .presale(toWei("1"), toWei("3"), toWei("50"), 2)
    .send({
      from: owner,
      gas: 200000,
    })
    .on("transactionHash", (txhash) => {
      console.log("[INFO]: Successfully sent tx: ", txhash);
    })
    .on("receipt", (receipt) => {
      console.log("[SUCCESS]: ", receipt);
    })
    .on("error", (error) => {
      console.log("[ERROR]: ", error);
    });
};

main();

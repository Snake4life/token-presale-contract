const Web3 = require("web3");
const { tokensToWei, weiToTokens } = require("../utils");
const rpcURL = "http://127.0.0.1:7545";
const web3 = new Web3(rpcURL);

const Contract = artifacts.require("RFIKUSH");
require("chai").use(require("chai-as-promised")).should();

const wei = (n) => {
  return web3.utils.toWei(n, "ether");
};

const eth = (str) => {
  return web3.utils.fromWei(str, "ether");
};

contract("RFIKUSH", ([owner, owner2, stranger]) => {
  let contract;

  beforeEach(async () => {
    contract = await Contract.new(owner2);
  });

  describe("token info", async () => {
    it("name is RFIKUSH", async () => {
      const name = await contract.name();
      assert.equal(name, "RFIKUSH");
    });

    it("symbol is RFIKUSH", async () => {
      const symbol = await contract.symbol();
      assert.equal(symbol, "RFIKUSH");
    });

    it("decimals is 9", async () => {
      const decimals = await contract.decimals();
      assert.equal(decimals, 9);
    });

    it("supply is 10000", async () => {
      const supply = await contract.totalSupply();
      assert.equal(supply / Math.pow(10, 9), 10000);
    });

    it("fee % is 0", async () => {
      const feePercent = await contract.fee();
      assert.equal(feePercent, 0);
    });
  });

  describe("changing tax and burn fees", async () => {
    it("only owner can change tax and burn fee", async () => {
      let newFee;
      await contract
        .changeFee(10, {
          from: owner,
        })
        .then(async (receipt) => {
          newFee = await contract.fee();
        })
        .catch((err) => assert.fail(err.toString()));

      await contract
        .changeFee(10, {
          from: stranger,
        })
        .then(async (receipt) => {
          console.log(receipt);
        })
        .catch(async (err) => {
          if (err.toString().indexOf("Ownable: caller is not the owner") == -1)
            assert.fail(err.toString());
          else assert.equal(newFee, 10);
        });
    });

    it("only owner can change burn fee", async () => {
      let burnFee;
      await contract
        .changeBurnFee(10, {
          from: owner,
        })
        .then(async (receipt) => {
          burnFee = await contract.burnFee();
        })
        .catch((err) => assert.fail(err.toString()));

      await contract
        .changeBurnFee(10, {
          from: stranger,
        })
        .then(async (receipt) => {
          console.log(receipt);
        })
        .catch(async (err) => {
          if (err.toString().indexOf("Ownable: caller is not the owner") == -1)
            assert.fail(err.toString());
          else assert.equal(burnFee, 10);
        });
    });

    it("tax and burn fees cannot be more than 10%", async () => {
      await contract
        .changeFee(11, {
          from: owner,
        })
        .then(async (receipt) => {
          console.log(receipt);
        })
        .catch(async (err) => {
          if (
            err
              .toString()
              .indexOf("Tax and burn fees cannot be greater than 10%") == -1
          )
            assert.fail(err.toString());
          else assert.equal(1, 1);
        });

      await contract
        .changeBurnFee(11, {
          from: owner,
        })
        .then(async (receipt) => {
          console.log(receipt);
        })
        .catch(async (err) => {
          if (
            err
              .toString()
              .indexOf("Tax and burn fees cannot be greater than 10%") == -1
          )
            assert.fail(err.toString());
          else assert.equal(1, 1);
        });

      await contract
        .changeFee(5, {
          from: owner,
        })
        .catch((err) => assert.fail(err.toString()));

      await contract
        .changeBurnFee(5, {
          from: owner,
        })
        .catch((err) => assert.fail(err.toString()));

      await contract
        .changeBurnFee(6, {
          from: owner,
        })
        .then(async (receipt) => {
          console.log(receipt);
        })
        .catch(async (err) => {
          if (
            err
              .toString()
              .indexOf("Tax and burn fees cannot be greater than 10%") == -1
          )
            assert.fail(err.toString());
          else assert.equal(1, 1);
        });

      await contract
        .changeFee(6, {
          from: owner,
        })
        .then(async (receipt) => {
          console.log(receipt);
        })
        .catch(async (err) => {
          if (
            err
              .toString()
              .indexOf("Tax and burn fees cannot be greater than 10%") == -1
          )
            assert.fail(err.toString());
          else assert.equal(1, 1);
        });
    });
  });

  describe("transfer functionality", async () => {
    it("when tax is 0", async () => {
      contract.transfer(stranger, tokensToWei("100"), {
        from: owner2,
      });

      strangerBalance1 = weiToTokens(await contract.balanceOf(stranger));
      owner2Balance1 = weiToTokens(await contract.balanceOf(owner2));

      contract.transfer(owner, tokensToWei("100"), {
        from: owner2,
      });

      strangerBalance2 = weiToTokens(await contract.balanceOf(stranger));
      owner2Balance2 = weiToTokens(await contract.balanceOf(owner2));
      ownerBalance2 = weiToTokens(await contract.balanceOf(owner));

      contract.transfer(owner2, tokensToWei("100"), {
        from: stranger,
      });

      strangerBalance3 = weiToTokens(await contract.balanceOf(stranger));
      owner2Balance3 = weiToTokens(await contract.balanceOf(owner2));

      const supply = await contract.totalSupply();

      assert.equal(strangerBalance1, 100);
      assert.equal(owner2Balance1, 9900);
      assert.equal(strangerBalance2, 100);
      assert.equal(owner2Balance2, 9800);
      assert.equal(ownerBalance2, 100);
      assert.equal(strangerBalance3, 0);
      assert.equal(owner2Balance3, 9900);
      assert.equal(supply / Math.pow(10, 9), 10000);
    });

    it("when tax is 10", async () => {
      await contract
        .changeFee(10, {
          from: owner,
        })
        .then(async (receipt) => {
          newFee = await contract.fee();
        })
        .catch((err) => assert.fail(err.toString()));

      contract.transfer(stranger, tokensToWei("100"), {
        from: owner2,
      });

      strangerBalance1 = weiToTokens(await contract.balanceOf(stranger));
      owner2Balance1 = weiToTokens(await contract.balanceOf(owner2));

      contract.transfer(owner, tokensToWei("100"), {
        from: owner2,
      });

      strangerBalance2 = weiToTokens(await contract.balanceOf(stranger));
      owner2Balance2 = weiToTokens(await contract.balanceOf(owner2));
      ownerBalance2 = weiToTokens(await contract.balanceOf(owner));

      contract.transfer(owner2, tokensToWei("50"), {
        from: stranger,
      });

      strangerBalance3 = weiToTokens(await contract.balanceOf(stranger));
      owner2Balance3 = weiToTokens(await contract.balanceOf(owner2));

      assert.equal(strangerBalance1, 90.09009009);
      assert.equal(owner2Balance1, 9909.909909909);
      assert.equal(strangerBalance2, 90.18027036);
      assert.equal(owner2Balance2, 9819.729639549);
      assert.equal(ownerBalance2, 90.09009009);
      assert.equal(strangerBalance3, 40.200370545);
      assert.equal(owner2Balance3, 9869.664471785);
    });

    it("when tax is 1 and burn fee is 1", async () => {
      let newFee, newBurnFee;
      await contract
        .changeFee(1, {
          from: owner,
        })
        .then(async (receipt) => {
          newFee = await contract.fee();
        })
        .catch((err) => assert.fail(err.toString()));

      await contract
        .changeBurnFee(1, {
          from: owner,
        })
        .then(async (receipt) => {
          newBurnFee = await contract.burnFee();
        })
        .catch((err) => assert.fail(err.toString()));

      contract.transfer(stranger, tokensToWei("100"), {
        from: owner2,
      });

      supply1 = await contract.totalSupply();
      strangerBalance1 = weiToTokens(await contract.balanceOf(stranger));
      owner2Balance1 = weiToTokens(await contract.balanceOf(owner2));

      contract.transfer(owner, tokensToWei("100"), {
        from: owner2,
      });

      supply2 = await contract.totalSupply();
      strangerBalance2 = weiToTokens(await contract.balanceOf(stranger));
      owner2Balance2 = weiToTokens(await contract.balanceOf(owner2));
      ownerBalance2 = weiToTokens(await contract.balanceOf(owner));

      contract.transfer(owner2, tokensToWei("50"), {
        from: stranger,
      });

      supply3 = await contract.totalSupply();
      strangerBalance3 = weiToTokens(await contract.balanceOf(stranger));
      owner2Balance3 = weiToTokens(await contract.balanceOf(owner2));

      assert.equal(newFee, 1);
      assert.equal(newBurnFee, 1);
      assert.equal(supply1 / Math.pow(10, 9), 9999);
      assert.equal(supply2 / Math.pow(10, 9), 9998);
      assert.equal(supply3 / Math.pow(10, 9), 9997.5);
      assert.equal(strangerBalance1, 98.00980196);
      assert.equal(owner2Balance1, 9900.990198039);
      assert.equal(strangerBalance2, 98.019605881);
      assert.equal(owner2Balance2, 9801.970591177);
      assert.equal(ownerBalance2, 98.00980294);
      assert.equal(strangerBalance3, 48.022007582);
      assert.equal(owner2Balance3, 9851.463287515);
    });
  });
});

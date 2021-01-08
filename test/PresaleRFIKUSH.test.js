const { toEth, toWei, tokensToWei, weiToTokens, toBN } = require("../utils");
const Web3 = require("web3");
const { WETH } = require("@uniswap/sdk");
const rpcURL = "http://127.0.0.1:7545";
const web3 = new Web3(rpcURL);
const abi = require("../build/contracts/RFIKUSH.json").abi;

const Contract = artifacts.require("PresaleRFIKUSH");
require("chai").use(require("chai-as-promised")).should();

contract.only("PresaleRFIKUSH", ([owner, stranger, stranger2]) => {
  let contract;

  beforeEach(async () => {
    contract = await Contract.new(
      "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
      "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
      WETH[1].address
    );
  });

  describe("instantiation", async () => {
    it("presale is inactive", async () => {
      const isActive = await contract.isActive();
      assert.equal(isActive, false);
    });

    it("description is 'RFIKUSH presale - t.me/rfikush'", async () => {
      const desc = await contract.presaleInfo();
      assert.equal(desc, "RFIKUSH presale - t.me/rfikush");
    });

    it("token gets deployed correctly", async () => {
      const tokenAddress = await contract.token();
      const tokenContract = new web3.eth.Contract(abi, tokenAddress);

      const name = await tokenContract.methods.name().call();
      const symbol = await tokenContract.methods.symbol().call();
      const decimals = await tokenContract.methods.decimals().call();
      const supply = await tokenContract.methods.totalSupply().call();
      const feePercent = await tokenContract.methods.fee().call();

      assert.equal(name, "RFIKUSH");
      assert.equal(symbol, "RFIKUSH");
      assert.equal(decimals, 9);
      assert.equal(supply / Math.pow(10, 9), 10000);
      assert.equal(feePercent, 0);
    });
  });

  describe("starting presale", async () => {
    it("stranger cannot start presale", async () => {
      await contract
        .startPresale(toWei("1"), toWei("3"), toWei("50"), tokensToWei("500"), {
          from: stranger,
        })
        .catch(async (err) => {
          if (err.toString().indexOf("Ownable: caller is not the owner") == -1)
            assert.fail(err.toString());
          else {
            const isActive = await contract.isActive();
            assert.equal(isActive, false);
          }
        });
    });

    it("start presale", async () => {
      await contract
        .startPresale(toWei("0.5"), toWei("3"), toWei("50"), 100, {
          from: owner,
        })
        .catch(async (err) => {
          assert.fail(err.toString());
        });

      const minInvestment = toEth(await contract.minInvestment());
      const maxInvestment = toEth(await contract.maxInvestment());
      const cap = toEth(await contract.cap());
      const rate = parseInt(await contract.rate());
      const isActive = await contract.isActive();

      assert.equal(minInvestment, 0.5);
      assert.equal(maxInvestment, 3);
      assert.equal(cap, 50);
      assert.equal(rate, 100);
      assert.equal(isActive, true);
    });
  });

  describe("dont allow buying tokens", async () => {
    it("when less than minimum", async () => {
      await contract.startPresale(
        toWei("1"),
        toWei("3"),
        toWei("50"),
        tokensToWei("100"),
        {
          from: owner,
        }
      );

      await contract
        .sendTransaction({ from: stranger, value: toWei("0.1") })
        .catch(async (err) => {
          if (err.toString().indexOf("ERROR: Must be 1 - 3 ETH") == -1)
            assert.fail(err.toString());
          else assert.equal(1, 1);
        });
    });

    it("when more than maximum", async () => {
      await contract.startPresale(
        toWei("1"),
        toWei("3"),
        toWei("50"),
        tokensToWei("100"),
        {
          from: owner,
        }
      );

      await contract
        .sendTransaction({ from: stranger, value: toWei("3.1") })
        .catch(async (err) => {
          if (err.toString().indexOf("ERROR: Must be 1 - 3 ETH") == -1)
            assert.fail(err.toString());
          else assert.equal(1, 1);
        });
    });

    it("when cap reached", async () => {
      const tokenContract = new web3.eth.Contract(abi, await contract.token());
      await contract
        .startPresale(toWei("0.1"), toWei("3"), toWei("0.1"), 100, {
          from: owner,
        })
        .then(async (receipt) => {
          await web3.eth
            .sendTransaction({
              to: contract.address,
              from: stranger,
              value: toWei("0.1"),
              gas: 200000,
            })
            .then(async (res) => {
              const strangerBalance = weiToTokens(
                await tokenContract.methods.balanceOf(stranger).call()
              );
              const contractBalance = weiToTokens(
                await tokenContract.methods.balanceOf(contract.address).call()
              );
              assert.equal(strangerBalance, 10);
              assert.equal(contractBalance, 9990);

              await web3.eth
                .sendTransaction({
                  to: contract.address,
                  from: stranger,
                  value: toWei("0.1"),
                  gas: 200000,
                })
                .then((receipt) => console.log(receipt))
                .catch(async (err) => {
                  if (
                    err.toString().indexOf("ERROR: Presale is not active") == -1
                  )
                    assert.fail(err.toString());
                  else assert.equal(1, 1);
                });
            })
            .catch((err) => assert.fail(err.toString()));
        });
    });

    it("when total bought would be greater than maximum", async () => {
      const tokenContract = new web3.eth.Contract(abi, await contract.token());
      await contract
        .startPresale(toWei("0.1"), toWei("3"), toWei("50"), 100, {
          from: owner,
        })
        .then(async (receipt) => {
          await web3.eth
            .sendTransaction({
              to: contract.address,
              from: stranger,
              value: toWei("3"),
              gas: 200000,
            })
            .then(async (receipt) => {
              const strangerBalance = weiToTokens(
                await tokenContract.methods.balanceOf(stranger).call()
              );
              const contractBalance = weiToTokens(
                await tokenContract.methods.balanceOf(contract.address).call()
              );
              assert.equal(strangerBalance, 300);
              assert.equal(contractBalance, 9700);

              await web3.eth
                .sendTransaction({
                  to: contract.address,
                  from: stranger,
                  value: toWei("0.1"),
                  gas: 200000,
                })
                .then((receipt) => console.log(receipt))
                .catch(async (err) => {
                  if (err.toString().indexOf("ERROR: Limit of 3 ETH") == -1)
                    assert.fail(err.toString());
                  else assert.equal(1, 1);
                });
            })
            .catch((err) => assert.fail(err.toString()));
        });
    });
  });

  describe("buying tokens", async () => {
    it("send tokens to buyers at rate with no tax fee and store eth", async () => {
      const tokenContract = new web3.eth.Contract(abi, await contract.token());
      await contract
        .startPresale(toWei("0.1"), toWei("3"), toWei("9"), 100, {
          from: owner,
        })
        .then(async (receipt) => {
          await web3.eth
            .sendTransaction({
              to: contract.address,
              from: stranger,
              value: toWei("3"),
              gas: 200000,
            })
            .then(async (receipt) => {
              var strangerBalance = weiToTokens(
                await tokenContract.methods.balanceOf(stranger).call()
              );
              var contractBalance = weiToTokens(
                await tokenContract.methods.balanceOf(contract.address).call()
              );
              assert.equal(strangerBalance, 300);
              assert.equal(contractBalance, 9700);

              await web3.eth
                .sendTransaction({
                  to: contract.address,
                  from: owner,
                  value: toWei("3"),
                  gas: 200000,
                })
                .then(async (receipt) => {
                  var ownerBalance = weiToTokens(
                    await tokenContract.methods.balanceOf(owner).call()
                  );
                  var strangerBalance = weiToTokens(
                    await tokenContract.methods.balanceOf(stranger).call()
                  );
                  var contractBalance = weiToTokens(
                    await tokenContract.methods
                      .balanceOf(contract.address)
                      .call()
                  );
                  assert.equal(strangerBalance, 300);
                  assert.equal(ownerBalance, 300);
                  assert.equal(contractBalance, 9400);

                  await web3.eth
                    .sendTransaction({
                      to: contract.address,
                      from: stranger2,
                      value: toWei("3"),
                      gas: 200000,
                    })
                    .then(async (receipt) => {
                      var ownerBalance = weiToTokens(
                        await tokenContract.methods.balanceOf(owner).call()
                      );
                      var strangerBalance = weiToTokens(
                        await tokenContract.methods.balanceOf(stranger).call()
                      );
                      var stranger2Balance = weiToTokens(
                        await tokenContract.methods.balanceOf(stranger2).call()
                      );
                      var contractBalance = weiToTokens(
                        await tokenContract.methods
                          .balanceOf(contract.address)
                          .call()
                      );
                      assert.equal(strangerBalance, 300);
                      assert.equal(ownerBalance, 300);
                      assert.equal(stranger2Balance, 300);
                      assert.equal(contractBalance, 9100);

                      var isActive = await contract.isActive();
                      assert.equal(isActive, false);
                    });
                })
                .catch((err) => assert.fail(err.toString()));
            })
            .catch((err) => assert.fail(err.toString()));
        });
    });
  });

  describe.only("ending presale and adding liquidity", async () => {
    it("works as expected", async () => {
      //Start presale
      await contract
        .startPresale(toWei("0.5"), toWei("3.21431423423"), toWei("50"), 100, {
          from: owner,
        })
        .then(async (receipt) => {
          //Send Eth
          await web3.eth
            .sendTransaction({
              to: contract.address,
              from: stranger,
              value: toWei("3.2123424342"),
              gas: 200000,
            })
            .then(async (receipt) => {
              //End presale
              await contract
                .endPresale()
                .then(async (receipt) => {
                  const isActive = await contract.isActive();
                  const tokenAddress = await contract.token();
                  const tokenContract = new web3.eth.Contract(
                    abi,
                    tokenAddress
                  );
                  const feePercent = await tokenContract.methods.fee().call();
                  const burnFeePercent = await tokenContract.methods.burnFee().call();
                  assert.equal(isActive, false);
                  assert.equal(feePercent, 2);
                  assert.equal(burnFeePercent, 1);
                })
                .catch((err) => assert.fail(err.toString()));
            });
        })
        .catch((err) => assert.fail(err.toString()));
    });
  });

  describe("removing liquidity and sending to owner", async () => {
    it("works as expected", async () => {
      const tokenContract = new web3.eth.Contract(abi, await contract.token());
      //Start presale
      await contract
        .startPresale(toWei("0.5"), toWei("3.21431423423"), toWei("50"), 100, {
          from: owner,
        })
        .then(async (receipt) => {
          //Send Eth
          await web3.eth
            .sendTransaction({
              to: contract.address,
              from: stranger,
              value: toWei("3.2123424342"),
              gas: 200000,
            })
            .then(async (receipt) => {
              //End presale
              await contract
                .endPresale()
                .then(async (receipt) => {
                  const isActive = await contract.isActive();
                  const tokenAddress = await contract.token();
                  const tokenContract = new web3.eth.Contract(
                    abi,
                    tokenAddress
                  );
                  const feePercent = await tokenContract.methods.fee().call();
                  const burnFeePercent = await tokenContract.methods.burnFee().call();
                  assert.equal(isActive, false);
                  assert.equal(feePercent, 2);
                  assert.equal(burnFeePercent, 1);

                  var ownerBalance = weiToTokens(
                    await tokenContract.methods.balanceOf(owner).call()
                  );
                  var ownerBalanceEth = toEth(
                    await web3.eth.getBalance(owner)
                  );
                  console.log(ownerBalance, ownerBalanceEth)

                  await contract.transferLiquidity()
                  .then(async (receipt) => {
                    var ownerBalance = weiToTokens(
                      await tokenContract.methods.balanceOf(owner).call()
                    );
                    var ownerBalanceEth = toEth(
                      await web3.eth.getBalance(owner)
                    );
                    console.log(ownerBalance, ownerBalanceEth)
                  })
                  .catch((err) => assert.fail(err.toString()));
                })
                .catch((err) => assert.fail(err.toString()));
            });
        })
        .catch((err) => assert.fail(err.toString()));
    })
  });
});

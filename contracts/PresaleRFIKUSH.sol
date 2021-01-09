// SPDX-License-Identifier: MIT

pragma solidity ^0.6.2;

import "./libraries/UniswapV2Library.sol";

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import './interfaces/IUniswapV2Router02.sol';
import "./interfaces/IUniswapV2Factory.sol";
import "./interfaces/IUniswapV2Pair.sol";

import "./RFIKUSH.sol";

contract PresaleRFIKUSH is Ownable {
  using SafeMath for uint;
  using Address for address;

  RFIKUSH public token;

  mapping (address => uint256) public addresses;
  uint public cap;
  uint public minInvestment;
  uint public maxInvestment;
  uint public rate;
  uint public unlockLiquidity;
  bool private _isActive;

  address private _router;
  address private _factory;
  address private _weth;
  //mapping (address => uint256) private _liquidityProviders;

  string public presaleInfo;

  constructor(address router, address factory, address weth) public {
    token = createTokenContract();
    presaleInfo = "RFIKUSH presale - t.me/rfikush";
    _isActive = false;

    _weth = weth;
    _router = router;
    _factory = factory;
    unlockLiquidity = block.timestamp + 0 weeks;
  }

  function isActive() public view returns (bool) {
    return _isActive == true && address(this).balance < cap;
  }

  function startPresale(uint min, uint max, uint hardCap, uint tokensPerEth) onlyOwner() public {
    require(min >= 0);
    require(max >= min);
    require(hardCap > max);
    require(tokensPerEth > 0);
    
    rate = tokensPerEth;
    minInvestment = min;
    maxInvestment = max;
    cap = hardCap;
    _isActive = true;
  }

  function createTokenContract() internal returns (RFIKUSH) {
    return new RFIKUSH(address(this));
  }

  receive() external payable {
    require(_isActive == true && address(this).balance <= cap, "ERROR: Presale is not active");
    require(msg.value <= maxInvestment && msg.value >= minInvestment, "ERROR: Must be 1 - 3 ETH");
    require(addresses[msg.sender] + msg.value <= maxInvestment, "ERROR: Limit of 3 ETH");
    require(!address(msg.sender).isContract() && msg.sender == tx.origin, "ERROR: Contracts are not allowed");
    
    uint tokens = msg.value.div(10 * 10**8);
    tokens = rate.mul(tokens);
    addresses[msg.sender] = addresses[msg.sender].add(msg.value);
    token.transfer(msg.sender, tokens);
  }

  function endPresale() onlyOwner() public {
    //80%-20% liquidity-dev
    uint devEth = address(this).balance.div(5);
    uint liquidityEth = address(this).balance.sub(devEth);

    //Set price 10% higher than presale
    uint newRate = rate.sub(rate.div(10));
    uint liquidityTokens = newRate.mul(liquidityEth.div(10 * 10**8));

    if (liquidityTokens > token.balanceOf(address(this))) {
      liquidityTokens = token.balanceOf(address(this));
      liquidityEth = liquidityTokens.mul(10 * 10**8).div(newRate);
    }

    require(newRate < rate && liquidityTokens.div(liquidityEth.div(10 * 10**8)) == newRate, "ERROR: Invalid rate");

    //Create uniswap pair and add liquidity
    token.approve(_router, liquidityTokens);
    IUniswapV2Router02(_router).addLiquidityETH{value: liquidityEth}(
      address(token), 
      liquidityTokens, 
      0, 
      0, 
      address(this), 
      block.timestamp + 20 minutes
    );
    
    //Send dev funds to owner
    msg.sender.transfer(address(this).balance);

    //Start tax and burn fees
    token.changeFee(2);
    token.changeBurnFee(1);

    //End presale
    _isActive = false;
  }

  function transferLiquidity() onlyOwner() public {
    require(unlockLiquidity < block.timestamp, "ERROR: 6 month liquidity lock still active");

    address pair = UniswapV2Library.pairFor(_factory, address(token), _weth);
    IUniswapV2Pair(pair).transfer(msg.sender, IUniswapV2Pair(pair).balanceOf(address(this)));
  }

  // function claimLPTokens() public {
  //   require(_liquidityProviders[msg.sender] < block.timestamp, "ERROR: Please wait 24 hours before trying again");
  //   address pair = UniswapV2Library.pairFor(_factory, address(token), _weth);
  //   require(IUniswapV2Pair(pair).balanceOf(msg.sender) > 0);
    
  //   uint totalSupply = IUniswapV2Pair(pair).totalSupply();
  //   uint rewardFraction = totalSupply.div(IUniswapV2Pair(pair).balanceOf(msg.sender));
  //   uint dailyRewardPool = 10 * 10**9; //10 tokens
  //   uint reward = dailyRewardPool.div(rewardFraction);

  //   _liquidityProviders[msg.sender] = block.timestamp + 24 hours;
  //   IUniswapV2Pair(pair).transfer(msg.sender, reward);
  // }
}
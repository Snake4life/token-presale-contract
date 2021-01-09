pragma solidity >=0.5.0;

interface IUniswapV2Pair {
    function transfer(address to, uint value) external returns (bool);
    function balanceOf(address owner) external view returns (uint);
    function totalSupply() external view returns (uint);
}

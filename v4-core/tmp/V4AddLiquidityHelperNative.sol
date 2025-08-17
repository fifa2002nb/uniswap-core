
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPoolManagerMinimal {
    struct PoolKey { address currency0; address currency1; uint24 fee; int24 tickSpacing; address hooks; }
    struct ModifyLiquidityParams { int24 tickLower; int24 tickUpper; int256 liquidityDelta; bytes32 salt; }

    function unlock(bytes calldata data) external returns (bytes memory);
    function modifyLiquidity(PoolKey memory key, ModifyLiquidityParams memory params, bytes calldata hookData)
        external
        returns (int256 callerDelta, int256 feesAccrued);

    function sync(address currency) external;
    function settle() external payable returns (uint256);
    function mint(address to, uint256 id, uint256 amount) external;
    function take(address currency, address to, uint256 amount) external;
    function burn(address from, uint256 id, uint256 amount) external;
}

interface IUnlockCallbackMinimal {
    function unlockCallback(bytes calldata data) external returns (bytes memory);
}

interface IERC20Minimal {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
}

contract V4AddLiquidityHelper is IUnlockCallbackMinimal {
    IPoolManagerMinimal public immutable manager;

    constructor(IPoolManagerMinimal _m) { manager = _m; }

    struct Data {
        address sender;
        IPoolManagerMinimal.PoolKey key;
        IPoolManagerMinimal.ModifyLiquidityParams params;
        bytes hookData;
        bool useBurn;
        bool useClaims;
    }

    // Add receive function to accept native tokens
    receive() external payable {}

    function run(
        IPoolManagerMinimal.PoolKey memory key,
        IPoolManagerMinimal.ModifyLiquidityParams memory params,
        bytes memory hookData,
        bool useBurn,
        bool useClaims
    ) external payable returns (int256,int256) {
        bytes memory ret = manager.unlock(abi.encode(Data(msg.sender, key, params, hookData, useBurn, useClaims)));
        return abi.decode(ret,(int256,int256));
    }

    function unlockCallback(bytes calldata rawData) external returns (bytes memory) {
        require(msg.sender == address(manager), 'only manager');
        Data memory d = abi.decode(rawData,(Data));
        (int256 callerDelta, ) = manager.modifyLiquidity(d.key, d.params, d.hookData);
        (int128 amt0, int128 amt1) = _decodeDelta(callerDelta);
        if (amt0 < 0) _settle(d.key.currency0, d.sender, uint256(uint128(-amt0)), d.useBurn);
        if (amt1 < 0) _settle(d.key.currency1, d.sender, uint256(uint128(-amt1)), d.useBurn);
        if (amt0 > 0) _take(d.key.currency0, d.sender, uint256(uint128(amt0)), d.useClaims);
        if (amt1 > 0) _take(d.key.currency1, d.sender, uint256(uint128(amt1)), d.useClaims);
        return abi.encode(amt0, amt1);
    }

    function _settle(address currency, address payer, uint256 amount, bool burn) internal {
        if (burn) {
            manager.burn(payer, uint160(currency), amount);
        } else if (currency == address(0)) {
            // For native token, we need to ensure the contract has enough balance
            // The contract should have received the native tokens via msg.value in the run() function
            require(address(this).balance >= amount, "Insufficient native token balance");
            manager.settle{value: amount}();
        } else {
            manager.sync(currency);
            if (payer != address(this)) {
                IERC20Minimal(currency).transferFrom(payer, address(manager), amount);
            } else {
                IERC20Minimal(currency).transfer(address(manager), amount);
            }
            manager.settle();
        }
    }

    function _take(address currency, address to, uint256 amount, bool claims) internal {
        if (claims) {
            manager.mint(to, uint160(currency), amount);
        } else {
            manager.take(currency, to, amount);
        }
    }

    function _decodeDelta(int256 d) internal pure returns (int128 amt0, int128 amt1) {
        assembly {
            amt0 := sar(128, d)
            amt1 := signextend(15, d)
        }
    }

    // Emergency function to withdraw any stuck native tokens
    function withdrawNative() external {
        payable(msg.sender).transfer(address(this).balance);
    }
}

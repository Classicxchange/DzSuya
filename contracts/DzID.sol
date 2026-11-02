// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title DZ ID
/// @notice Permanent wallet names and atomic USDC payments for the DzSuya app.
/// @dev Intended for standard six-decimal USDC. No administrative or name-transfer functions.
contract DzID is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice USDC token configured at deployment.
    IERC20 public immutable usdc;

    /// @notice Wallet owning a name, or address(0) if unclaimed.
    mapping(string name => address owner) public ownerOf;

    /// @notice Wallet's permanent name, or an empty string if none.
    mapping(address owner => string name) public nameOf;

    /// @notice Total number of claimed names.
    uint256 public totalNames;

    error ZeroAddress();
    error InvalidName();
    error NameTaken();
    error AlreadyHasName();
    error NameNotFound();
    error InvalidAmount();
    error MemoTooLong();
    error SelfPayment();

    event Claimed(address indexed owner, string name);
    event Sent(address indexed from, address indexed to, uint256 amount, string name, string memo);

    /// @param usdc_ Nonzero address of the USDC token on the deployment network.
    constructor(address usdc_) {
        if (usdc_ == address(0)) revert ZeroAddress();
        usdc = IERC20(usdc_);
    }

    /// @notice Claim an available name permanently for the calling wallet.
    /// @param name Valid lowercase name; each wallet may claim only one.
    function claim(string calldata name) external {
        if (!isValidName(name)) revert InvalidName();
        if (ownerOf[name] != address(0)) revert NameTaken();
        if (bytes(nameOf[msg.sender]).length != 0) revert AlreadyHasName();

        ownerOf[name] = msg.sender;
        nameOf[msg.sender] = name;
        ++totalNames;
        emit Claimed(msg.sender, name);
    }

    /// @notice Pay a claimed name using a prior USDC approval to this contract.
    /// @param name Claimed name of a wallet other than the sender.
    /// @param amount Positive payment in six-decimal USDC base units.
    /// @param memo Public payment memo of at most 80 bytes; may be empty.
    /// @return to Wallet receiving the payment.
    /// @dev Both transfers are atomic: a failed forwarding transfer reverts the pull too.
    function sendToName(string calldata name, uint256 amount, string calldata memo)
        external
        nonReentrant
        returns (address to)
    {
        to = ownerOf[name];
        if (to == address(0)) revert NameNotFound();
        if (amount == 0) revert InvalidAmount();
        if (bytes(memo).length > 80) revert MemoTooLong();
        if (to == msg.sender) revert SelfPayment();

        usdc.safeTransferFrom(msg.sender, address(this), amount);
        usdc.safeTransfer(to, amount);
        emit Sent(msg.sender, to, amount, name, memo);
    }

    /// @notice Whether a name is valid and has not been claimed.
    function isAvailable(string calldata name) external view returns (bool) {
        return isValidName(name) && ownerOf[name] == address(0);
    }

    /// @notice Validate 3–20 ASCII bytes: lowercase letters, digits, or interior underscores.
    /// @dev Uppercase, non-ASCII bytes, and leading or trailing underscores are invalid.
    function isValidName(string calldata name) public pure returns (bool) {
        bytes calldata value = bytes(name);
        uint256 length = value.length;
        if (length < 3 || length > 20) return false;
        if (value[0] == 0x5f || value[length - 1] == 0x5f) return false;

        for (uint256 i; i < length; ++i) {
            uint8 character = uint8(value[i]);
            if (
                !(character >= 0x61 && character <= 0x7a)
                    && !(character >= 0x30 && character <= 0x39)
                    && character != 0x5f
            ) return false;
        }
        return true;
    }
}

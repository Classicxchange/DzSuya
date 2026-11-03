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

    /// @notice Minimum time before a commitment may be revealed.
    uint256 public constant MIN_COMMIT_AGE = 6 seconds;
    /// @notice Maximum time a commitment remains valid, inclusive.
    uint256 public constant MAX_COMMIT_AGE = 1 days;

    /// @notice Commitment timestamp, or zero if no commitment is stored.
    mapping(bytes32 commitment => uint64 committedAt) public commitments;

    /// @notice Total number of claimed names.
    uint256 public totalNames;

    error ZeroAddress();
    /// @param name Name that fails validation.
    error InvalidName(string name);
    /// @param name Name that is already claimed.
    error NameTaken(string name);
    /// @param account Wallet that already owns a permanent name.
    error AlreadyHasName(address account);
    /// @param commitment Commitment that already exists and has not expired.
    error CommitmentExists(bytes32 commitment);
    /// @param commitment Commitment that is not stored.
    error NoCommitment(bytes32 commitment);
    /// @param commitment Commitment that cannot yet be revealed.
    /// @param committedAt Timestamp when the commitment was stored.
    /// @param earliestReveal Earliest timestamp at which reveal is permitted, inclusive.
    error CommitmentTooNew(bytes32 commitment, uint64 committedAt, uint64 earliestReveal);
    /// @param commitment Commitment whose reveal window has expired.
    /// @param committedAt Timestamp when the commitment was stored.
    /// @param latestReveal Latest timestamp at which reveal is permitted, inclusive.
    error CommitmentExpired(bytes32 commitment, uint64 committedAt, uint64 latestReveal);
    /// @param name Name that has not been claimed.
    error NameNotFound(string name);
    /// @param amount Invalid payment amount in six-decimal USDC base units.
    error InvalidAmount(uint256 amount);
    /// @param length Payment memo length in bytes that exceeds the limit.
    error MemoTooLong(uint256 length);
    /// @param account Wallet attempting to pay itself.
    error SelfPayment(address account);

    event Committed(address indexed claimant, bytes32 commitment);
    event Claimed(address indexed owner, string name);
    event Sent(address indexed from, address indexed to, uint256 amount, string name, string memo);

    /// @param usdc_ Nonzero address of the USDC token on the deployment network.
    constructor(address usdc_) {
        if (usdc_ == address(0)) revert ZeroAddress();
        usdc = IERC20(usdc_);
    }

    /// @notice Compute a commitment binding a name and salt to a claimant.
    /// @param name Name to claim upon reveal.
    /// @param claimant Wallet that will reveal and own the name.
    /// @param salt Secret random value to conceal the name until reveal.
    function makeCommitment(string calldata name, address claimant, bytes32 salt) public pure returns (bytes32) {
        return keccak256(abi.encode(name, claimant, salt));
    }

    /// @notice Store a commitment; an existing commitment may be replaced only after expiry.
    /// @param commitment Hash returned by makeCommitment for the intended claimant.
    function commit(bytes32 commitment) external {
        uint64 committedAt = commitments[commitment];
        if (committedAt != 0 && block.timestamp <= uint256(committedAt) + MAX_COMMIT_AGE) {
            revert CommitmentExists(commitment);
        }
        commitments[commitment] = uint64(block.timestamp);
        emit Committed(msg.sender, commitment);
    }

    /// @notice Reveal a commitment aged 6 seconds to 1 day and claim a name permanently.
    /// @param name Valid lowercase name; each wallet may claim only one.
    /// @param salt Secret value used when making the commitment for the calling wallet.
    function claim(string calldata name, bytes32 salt) external {
        bytes32 commitment = makeCommitment(name, msg.sender, salt);
        uint64 committedAt = commitments[commitment];
        if (committedAt == 0) revert NoCommitment(commitment);
        if (block.timestamp < uint256(committedAt) + MIN_COMMIT_AGE) revert CommitmentTooNew(commitment, committedAt, uint64(uint256(committedAt) + MIN_COMMIT_AGE));
        if (block.timestamp > uint256(committedAt) + MAX_COMMIT_AGE) revert CommitmentExpired(commitment, committedAt, uint64(uint256(committedAt) + MAX_COMMIT_AGE));
        delete commitments[commitment];

        if (!isValidName(name)) revert InvalidName(name);
        if (ownerOf[name] != address(0)) revert NameTaken(name);
        if (bytes(nameOf[msg.sender]).length != 0) revert AlreadyHasName(msg.sender);

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
        if (to == address(0)) revert NameNotFound(name);
        if (amount == 0) revert InvalidAmount(amount);
        if (bytes(memo).length > 80) revert MemoTooLong(bytes(memo).length);
        if (to == msg.sender) revert SelfPayment(msg.sender);

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

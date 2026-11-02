// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Professor Dozzie's Suya
/// @notice Onchain orders and receipts paid directly to the shop in USDC.
/// @dev Intended for six-decimal USDC. The shop is the explicit merchant wallet passed at deployment.
contract SuyaShop is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_ORDER = 1000e6;
    uint256 public constant MAX_DETAILS_BYTES = 1024;
    uint256 public constant MAX_PAGE_SIZE = 50;

    uint8 public constant CONFIRMED = 0;
    uint8 public constant PREPARING = 1;
    uint8 public constant READY = 2;
    uint8 public constant COLLECTED = 3;

    IERC20 public immutable usdc;
    address public shop;

    struct Order {
        address customer;
        uint128 amount;
        uint8 status;
        uint64 createdAt;
        uint64 updatedAt;
        string details;
    }

    struct OrderView {
        uint256 id;
        address customer;
        uint256 amount;
        uint8 status;
        uint64 createdAt;
        uint64 updatedAt;
        string details;
    }

    uint256 private _orderCount;
    mapping(uint256 id => Order) private _orders;
    mapping(address customer => uint256[]) private _customerOrderIds;

    error ZeroAddress();
    error NotShop();
    error InvalidAmount();
    error InvalidDetails();
    error OrderNotFound();
    error InvalidStatus();

    event ShopTransferred(address indexed previousShop, address indexed newShop);
    event OrderPlaced(uint256 indexed id, address indexed customer, uint256 amount, string details);
    event StatusUpdated(uint256 indexed id, uint8 status);

    modifier onlyShop() {
        if (msg.sender != shop) revert NotShop();
        _;
    }

    /// @param usdc_ USDC token address; supply the Arc Testnet USDC address on that network.
    constructor(address usdc_, address shop_) {
        if (usdc_ == address(0) || shop_ == address(0)) revert ZeroAddress();
        usdc = IERC20(usdc_);
        shop = shop_;
        emit ShopTransferred(address(0), shop_);
    }

    /// @notice Transfer shop control and future payment receipts to a nonzero wallet.
    function transferShop(address newShop) external onlyShop {
        if (newShop == address(0)) revert ZeroAddress();
        address previousShop = shop;
        shop = newShop;
        emit ShopTransferred(previousShop, newShop);
    }

    /// @notice Place an order and pay the shop directly using a prior USDC approval.
    /// @param amount Payment in six-decimal USDC base units, at most MAX_ORDER.
    /// @param details Public order details, between 1 and 1024 bytes inclusive.
    /// @return id The newly created order's identifier, starting at one.
    /// @dev All order effects precede the token call; a failed payment rolls them back.
    function placeOrder(uint256 amount, string calldata details) external nonReentrant returns (uint256 id) {
        address recipient = shop;
        if (amount == 0 || amount > MAX_ORDER) revert InvalidAmount();
        uint256 length = bytes(details).length;
        if (length == 0 || length > MAX_DETAILS_BYTES) revert InvalidDetails();

        id = ++_orderCount;
        uint64 timestamp = uint64(block.timestamp);
        _orders[id] = Order({
            customer: msg.sender,
            amount: uint128(amount),
            status: CONFIRMED,
            createdAt: timestamp,
            updatedAt: timestamp,
            details: details
        });
        _customerOrderIds[msg.sender].push(id);
        emit OrderPlaced(id, msg.sender, amount, details);

        usdc.safeTransferFrom(msg.sender, recipient, amount);
    }

    /// @notice Advance an existing order's status; forward skips are permitted.
    /// @param id Existing order identifier.
    /// @param newStatus A strictly higher status, no greater than COLLECTED (3).
    function setStatus(uint256 id, uint8 newStatus) external onlyShop {
        _requireOrder(id);
        Order storage order = _orders[id];
        if (newStatus <= order.status || newStatus > COLLECTED) revert InvalidStatus();
        order.status = newStatus;
        order.updatedAt = uint64(block.timestamp);
        emit StatusUpdated(id, newStatus);
    }

    /// @notice Return the total number of successfully paid orders.
    function orderCount() external view returns (uint256) {
        return _orderCount;
    }

    /// @notice Read a complete receipt without indexing events.
    function getOrder(uint256 id) external view returns (OrderView memory) {
        _requireOrder(id);
        return _orderView(id);
    }

    /// @notice Read all customers' orders newest first, with at most 50 results.
    /// @param offset Number of newest orders to skip; zero starts at the newest.
    /// @param limit Requested page size, capped at 50; zero returns an empty page.
    function getOrders(uint256 offset, uint256 limit) external view returns (OrderView[] memory page) {
        uint256 total = _orderCount;
        uint256 size = _pageSize(total, offset, limit);
        page = new OrderView[](size);
        for (uint256 i; i < size; ++i) {
            page[i] = _orderView(total - offset - i);
        }
    }

    /// @notice Return all of a customer's order identifiers in oldest-first order.
    /// @dev Unbounded full-history getter; use getOrdersOf for bounded receipt pages.
    function orderIdsOf(address customer) external view returns (uint256[] memory) {
        return _customerOrderIds[customer];
    }

    /// @notice Read a customer's orders newest first, with at most 50 results.
    /// @param customer Customer whose receipts are requested.
    /// @param offset Number of that customer's newest orders to skip.
    /// @param limit Requested page size, capped at 50; zero returns an empty page.
    function getOrdersOf(address customer, uint256 offset, uint256 limit)
        external
        view
        returns (OrderView[] memory page)
    {
        uint256[] storage ids = _customerOrderIds[customer];
        uint256 total = ids.length;
        uint256 size = _pageSize(total, offset, limit);
        page = new OrderView[](size);
        for (uint256 i; i < size; ++i) {
            page[i] = _orderView(ids[total - offset - i - 1]);
        }
    }

    function _requireOrder(uint256 id) private view {
        if (id == 0 || id > _orderCount) revert OrderNotFound();
    }

    function _orderView(uint256 id) private view returns (OrderView memory) {
        Order storage order = _orders[id];
        return OrderView({
            id: id,
            customer: order.customer,
            amount: uint256(order.amount),
            status: order.status,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            details: order.details
        });
    }

    function _pageSize(uint256 total, uint256 offset, uint256 limit) private pure returns (uint256) {
        if (offset >= total) return 0;
        uint256 size = limit > MAX_PAGE_SIZE ? MAX_PAGE_SIZE : limit;
        uint256 remaining = total - offset;
        return size > remaining ? remaining : size;
    }
}

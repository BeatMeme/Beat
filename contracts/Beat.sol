// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IERC721 {
    function balanceOf(address owner) external view returns (uint256 balance);
    function tokenOfOwnerByIndex(
        address owner,
        uint256 index
    ) external view returns (uint256 tokenId);
}

/// @title Beat Experimental Meme Token
contract Beat is ERC20 {
    IERC721 public immutable SUBSCRIPTIONS_NFT;

    uint256 public constant MAX_CLAIMABLE_ID = 1_000_000; // 1 million claimable IDs
    uint256 public constant INITIAL_MINT = 500_000_000_000; // 500 billion to community fund
    uint256 public constant MAX_SUBSCRIPTIONS = 10; // Maximum number of subscriptions supported

    mapping(uint256 => bool) private claimed;

    /// @notice Initializes the BEAT token contract
    /// @param _subscriptionsNFT Address of the subscriptions NFT contract
    /// @param _initialMintRecipient Address that receives the initial token mint
    constructor(
        address _subscriptionsNFT,
        address _initialMintRecipient
    ) ERC20("Beat Experimental Meme Token", "BEAT") {
        SUBSCRIPTIONS_NFT = IERC721(_subscriptionsNFT);
        _mint(_initialMintRecipient, INITIAL_MINT * 10 ** decimals());
    }

    /// @notice Returns the balance of an account
    /// @param account The address to check the balance of
    /// @return uint256 The balance
    function balanceOf(
        address account
    ) public view virtual override returns (uint256) {
        return super.balanceOf(account) + claimableAmount(account);
    }

    /// @notice Calculates the maximum supply of BEAT tokens
    /// @return uint256 The maximum supply of BEAT tokens
    function maxSupply() public pure returns (uint256) {
        unchecked {
            return
                (INITIAL_MINT +
                    ((MAX_CLAIMABLE_ID * (MAX_CLAIMABLE_ID + 1)) / 2)) *
                10 ** 18;
        }
    }

    /// @notice Checks if a subscription NFT is claimable
    /// @param tokenId The ID of the subscription NFT
    /// @return bool True if the subscription is claimable, false otherwise
    function claimableSubscription(uint256 tokenId) public view returns (bool) {
        return tokenId < MAX_CLAIMABLE_ID && !claimed[tokenId];
    }

    /// @notice Calculates the BEAT value for a given subscription NFT ID
    /// @param tokenId The ID of the subscription NFT
    /// @return uint256 The amount of BEAT tokens that subscription is entitled to
    function subscriptionAmount(uint256 tokenId) public pure returns (uint256) {
        if (tokenId >= MAX_CLAIMABLE_ID) return 0;
        unchecked {
            return (MAX_CLAIMABLE_ID - tokenId) * 10 ** 18;
        }
    }

    /// @notice Calculates the total claimable amount for an account
    /// @param account The address to calculate claimable amount for
    /// @return uint256 The total claimable amount of BEAT tokens
    function claimableAmount(address account) public view returns (uint256) {
        uint256 claimable = 0;
        uint256 balance = SUBSCRIPTIONS_NFT.balanceOf(account);
        balance = balance > MAX_SUBSCRIPTIONS ? MAX_SUBSCRIPTIONS : balance;
        for (uint256 i = 0; i < balance; ) {
            uint256 tokenId = SUBSCRIPTIONS_NFT.tokenOfOwnerByIndex(account, i);
            if (claimableSubscription(tokenId)) {
                claimable += subscriptionAmount(tokenId);
            }
            unchecked {
                ++i;
            }
        }
        return claimable;
    }

    /// @notice Handles token transfers (claims unclaimed BEAT before transfer)
    /// @param from The address tokens are transferred from
    /// @param to The address tokens are transferred to
    /// @param amount The amount of tokens transferred
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        if (from != address(0)) {
            // Prevent claim on mint
            claim(from);
        }
        super._beforeTokenTransfer(from, to, amount);
    }

    /// @notice Claims BEAT tokens for the given account
    /// @param account The address to claim tokens for
    function claim(address account) internal {
        uint256 claimable = 0;
        uint256 balance = SUBSCRIPTIONS_NFT.balanceOf(account);
        balance = balance > MAX_SUBSCRIPTIONS ? MAX_SUBSCRIPTIONS : balance;
        for (uint256 i = 0; i < balance; ) {
            uint256 tokenId = SUBSCRIPTIONS_NFT.tokenOfOwnerByIndex(account, i);
            if (claimableSubscription(tokenId)) {
                uint256 amount = subscriptionAmount(tokenId);
                claimable += amount;
                claimed[tokenId] = true;
            }
            unchecked {
                ++i;
            }
        }
        if (claimable > 0) {
            _mint(account, claimable);
        }
    }
}

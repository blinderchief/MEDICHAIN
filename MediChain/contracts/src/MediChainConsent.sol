// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title MediChainConsent
 * @notice On-chain consent management for clinical trial matching
 * @dev Records and verifies patient consent with immutable audit trail
 * 
 * Key Features:
 * - Privacy-preserving consent records (only hashes stored)
 * - Revocable consent with full audit trail
 * - ASI token reward distribution
 * - Role-based access control
 */
contract MediChainConsent is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════════════════════════════
    // ROLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant REWARD_DISTRIBUTOR_ROLE = keccak256("REWARD_DISTRIBUTOR_ROLE");

    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    /// @notice ASI token used for rewards
    IERC20 public immutable asiToken;
    
    /// @notice Counter for consent IDs
    uint256 public consentCounter;
    
    /// @notice Total rewards distributed
    uint256 public totalRewardsDistributed;

    // ═══════════════════════════════════════════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    struct ConsentRecord {
        bytes32 patientDid;      // Hash of patient DID
        bytes32 trialId;         // Hash of trial identifier
        bytes32 consentHash;     // Hash of consent document
        uint256 timestamp;       // When consent was recorded
        uint256 revokedAt;       // When revoked (0 if active)
        bool isValid;            // Current validity status
    }
    
    struct RewardRecord {
        address recipient;
        uint256 amount;
        string reason;
        uint256 timestamp;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MAPPINGS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /// @notice Consent ID => Consent Record
    mapping(uint256 => ConsentRecord) public consents;
    
    /// @notice Patient DID => Trial ID => Consent ID
    mapping(bytes32 => mapping(bytes32 => uint256)) public patientTrialConsent;
    
    /// @notice Patient DID => All consent IDs
    mapping(bytes32 => uint256[]) public patientConsents;
    
    /// @notice Trial ID => All consent IDs
    mapping(bytes32 => uint256[]) public trialConsents;
    
    /// @notice Reward records by ID
    mapping(uint256 => RewardRecord) public rewards;
    uint256 public rewardCounter;

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event ConsentRecorded(
        bytes32 indexed patientDid,
        bytes32 indexed trialId,
        uint256 indexed consentId,
        bytes32 consentHash,
        uint256 timestamp
    );
    
    event ConsentRevoked(
        bytes32 indexed patientDid,
        bytes32 indexed trialId,
        uint256 indexed consentId,
        uint256 timestamp
    );
    
    event RewardDistributed(
        address indexed recipient,
        uint256 indexed rewardId,
        uint256 amount,
        string reason,
        uint256 timestamp
    );
    
    event TokensDeposited(
        address indexed depositor,
        uint256 amount
    );
    
    event TokensWithdrawn(
        address indexed recipient,
        uint256 amount
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════════
    
    error ConsentAlreadyExists();
    error ConsentNotFound();
    error ConsentAlreadyRevoked();
    error InsufficientRewardBalance();
    error InvalidAmount();
    error ZeroAddress();

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Initialize the MediChain consent contract
     * @param _asiToken Address of the ASI token contract
     * @param _admin Admin address with full access
     */
    constructor(address _asiToken, address _admin) {
        if (_asiToken == address(0) || _admin == address(0)) {
            revert ZeroAddress();
        }
        
        asiToken = IERC20(_asiToken);
        
        // Setup roles
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
        _grantRole(REWARD_DISTRIBUTOR_ROLE, _admin);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSENT MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Record patient consent for a clinical trial
     * @param patientDid Hash of patient's decentralized identifier
     * @param trialId Hash of trial identifier
     * @param consentHash Hash of the consent document content
     * @param timestamp Unix timestamp of consent
     * @return consentId Unique identifier for this consent record
     */
    function recordConsent(
        bytes32 patientDid,
        bytes32 trialId,
        bytes32 consentHash,
        uint256 timestamp
    ) 
        external 
        onlyRole(OPERATOR_ROLE) 
        whenNotPaused 
        returns (uint256 consentId) 
    {
        // Check if consent already exists
        if (patientTrialConsent[patientDid][trialId] != 0) {
            revert ConsentAlreadyExists();
        }
        
        // Generate consent ID
        consentCounter++;
        consentId = consentCounter;
        
        // Store consent record
        consents[consentId] = ConsentRecord({
            patientDid: patientDid,
            trialId: trialId,
            consentHash: consentHash,
            timestamp: timestamp,
            revokedAt: 0,
            isValid: true
        });
        
        // Update indexes
        patientTrialConsent[patientDid][trialId] = consentId;
        patientConsents[patientDid].push(consentId);
        trialConsents[trialId].push(consentId);
        
        emit ConsentRecorded(
            patientDid,
            trialId,
            consentId,
            consentHash,
            timestamp
        );
        
        return consentId;
    }
    
    /**
     * @notice Verify if consent exists and is valid
     * @param patientDid Patient's DID hash
     * @param trialId Trial identifier hash
     * @return isValid Whether consent is currently valid
     * @return consentHash The consent document hash
     * @return timestamp When consent was recorded
     */
    function verifyConsent(
        bytes32 patientDid,
        bytes32 trialId
    ) 
        external 
        view 
        returns (
            bool isValid,
            bytes32 consentHash,
            uint256 timestamp
        ) 
    {
        uint256 consentId = patientTrialConsent[patientDid][trialId];
        
        if (consentId == 0) {
            return (false, bytes32(0), 0);
        }
        
        ConsentRecord storage consent = consents[consentId];
        return (
            consent.isValid,
            consent.consentHash,
            consent.timestamp
        );
    }
    
    /**
     * @notice Revoke patient consent
     * @param patientDid Patient's DID hash
     * @param trialId Trial identifier hash
     * @return success Whether revocation succeeded
     */
    function revokeConsent(
        bytes32 patientDid,
        bytes32 trialId
    ) 
        external 
        onlyRole(OPERATOR_ROLE) 
        whenNotPaused 
        returns (bool success) 
    {
        uint256 consentId = patientTrialConsent[patientDid][trialId];
        
        if (consentId == 0) {
            revert ConsentNotFound();
        }
        
        ConsentRecord storage consent = consents[consentId];
        
        if (!consent.isValid) {
            revert ConsentAlreadyRevoked();
        }
        
        consent.isValid = false;
        consent.revokedAt = block.timestamp;
        
        emit ConsentRevoked(
            patientDid,
            trialId,
            consentId,
            block.timestamp
        );
        
        return true;
    }
    
    /**
     * @notice Get full consent record by ID
     * @param consentId Consent identifier
     * @return Consent record struct
     */
    function getConsentRecord(uint256 consentId) 
        external 
        view 
        returns (ConsentRecord memory) 
    {
        return consents[consentId];
    }
    
    /**
     * @notice Get all consent IDs for a patient
     * @param patientDid Patient's DID hash
     * @return Array of consent IDs
     */
    function getPatientConsents(bytes32 patientDid) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return patientConsents[patientDid];
    }
    
    /**
     * @notice Get all consent IDs for a trial
     * @param trialId Trial identifier hash
     * @return Array of consent IDs
     */
    function getTrialConsents(bytes32 trialId) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return trialConsents[trialId];
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // REWARD DISTRIBUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Distribute ASI token rewards to a participant
     * @param recipient Address to receive rewards
     * @param amount Amount of ASI tokens to distribute
     * @param reason Reason for the reward
     * @return success Whether distribution succeeded
     */
    function distributeReward(
        address recipient,
        uint256 amount,
        string calldata reason
    ) 
        external 
        onlyRole(REWARD_DISTRIBUTOR_ROLE) 
        nonReentrant 
        whenNotPaused 
        returns (bool success) 
    {
        if (recipient == address(0)) {
            revert ZeroAddress();
        }
        if (amount == 0) {
            revert InvalidAmount();
        }
        
        uint256 balance = asiToken.balanceOf(address(this));
        if (balance < amount) {
            revert InsufficientRewardBalance();
        }
        
        // Record reward
        rewardCounter++;
        rewards[rewardCounter] = RewardRecord({
            recipient: recipient,
            amount: amount,
            reason: reason,
            timestamp: block.timestamp
        });
        
        totalRewardsDistributed += amount;
        
        // Transfer tokens
        asiToken.safeTransfer(recipient, amount);
        
        emit RewardDistributed(
            recipient,
            rewardCounter,
            amount,
            reason,
            block.timestamp
        );
        
        return true;
    }
    
    /**
     * @notice Get contract's ASI token balance
     * @return balance Current reward pool balance
     */
    function getRewardPoolBalance() external view returns (uint256 balance) {
        return asiToken.balanceOf(address(this));
    }
    
    /**
     * @notice Deposit ASI tokens to the reward pool
     * @param amount Amount of tokens to deposit
     */
    function depositRewards(uint256 amount) external {
        if (amount == 0) {
            revert InvalidAmount();
        }
        
        asiToken.safeTransferFrom(msg.sender, address(this), amount);
        
        emit TokensDeposited(msg.sender, amount);
    }
    
    /**
     * @notice Emergency withdrawal of tokens (admin only)
     * @param amount Amount to withdraw
     * @param recipient Address to receive tokens
     */
    function emergencyWithdraw(uint256 amount, address recipient) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        if (recipient == address(0)) {
            revert ZeroAddress();
        }
        
        uint256 balance = asiToken.balanceOf(address(this));
        uint256 withdrawAmount = amount > balance ? balance : amount;
        
        asiToken.safeTransfer(recipient, withdrawAmount);
        
        emit TokensWithdrawn(recipient, withdrawAmount);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Pause the contract
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get contract statistics
     * @return totalConsents Total number of consent records
     * @return totalRewards Total ASI distributed
     * @return poolBalance Current reward pool balance
     */
    function getStats() 
        external 
        view 
        returns (
            uint256 totalConsents,
            uint256 totalRewards,
            uint256 poolBalance
        ) 
    {
        return (
            consentCounter,
            totalRewardsDistributed,
            asiToken.balanceOf(address(this))
        );
    }
}

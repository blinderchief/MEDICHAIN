// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MediChainConsent
 * @notice Simplified consent management for clinical trial matching
 * @dev Records patient consent on-chain with immutable audit trail
 */
contract MediChainConsent is AccessControl, ReentrancyGuard {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    
    uint256 public consentCounter;
    
    struct ConsentRecord {
        bytes32 patientHash;    // Hash of patient identifier
        bytes32 trialHash;      // Hash of trial identifier  
        bytes32 consentHash;    // Hash of consent document
        uint256 timestamp;      // When recorded
        bool isValid;           // Current status
    }
    
    mapping(uint256 => ConsentRecord) public consents;
    mapping(bytes32 => mapping(bytes32 => uint256)) public patientTrialConsent;
    
    event ConsentRecorded(
        uint256 indexed consentId,
        bytes32 indexed patientHash,
        bytes32 indexed trialHash,
        bytes32 consentHash,
        uint256 timestamp
    );
    
    event ConsentRevoked(uint256 indexed consentId, uint256 timestamp);
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
    }
    
    function recordConsent(
        bytes32 patientHash,
        bytes32 trialHash,
        bytes32 consentHash
    ) external onlyRole(OPERATOR_ROLE) returns (uint256) {
        require(patientTrialConsent[patientHash][trialHash] == 0, "Consent exists");
        
        consentCounter++;
        uint256 consentId = consentCounter;
        
        consents[consentId] = ConsentRecord({
            patientHash: patientHash,
            trialHash: trialHash,
            consentHash: consentHash,
            timestamp: block.timestamp,
            isValid: true
        });
        
        patientTrialConsent[patientHash][trialHash] = consentId;
        
        emit ConsentRecorded(consentId, patientHash, trialHash, consentHash, block.timestamp);
        
        return consentId;
    }
    
    function revokeConsent(uint256 consentId) external onlyRole(OPERATOR_ROLE) {
        require(consents[consentId].isValid, "Invalid consent");
        consents[consentId].isValid = false;
        emit ConsentRevoked(consentId, block.timestamp);
    }
    
    function verifyConsent(
        bytes32 patientHash,
        bytes32 trialHash
    ) external view returns (bool isValid, uint256 consentId, uint256 timestamp) {
        consentId = patientTrialConsent[patientHash][trialHash];
        if (consentId == 0) return (false, 0, 0);
        
        ConsentRecord memory record = consents[consentId];
        return (record.isValid, consentId, record.timestamp);
    }
    
    function getConsent(uint256 consentId) external view returns (ConsentRecord memory) {
        return consents[consentId];
    }
}

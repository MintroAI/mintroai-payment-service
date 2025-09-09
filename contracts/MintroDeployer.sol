// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract MintroContractDeployer is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;
    
    // Events
    event ContractDeployed(
        address indexed deployedAddress, 
        address indexed deployer,
        bytes32 indexed bytecodeHash,
        uint256 paymentAmount
    );
    event SignerUpdated(address indexed oldSigner, address indexed newSigner);
    event PaymentWithdrawn(address indexed to, uint256 amount);
    event LegacyDeploymentStatusUpdated(bool enabled);
    
    // State variables
    address public signer;
    bool public isLegacyDeploymentEnabled = true; // Controls whether deployBytecode can be used 
    mapping(bytes32 => bool) public usedSignatures;
    
    // Signature data structure
    struct DeploymentData {
        bytes32 bytecodeHash;
        uint256 paymentAmount;
        address deployer;
        uint256 deadline;
        uint256 nonce;
        uint256 chainId;
    }
    
    // Errors
    error InvalidSignature();
    error SignatureExpired();
    error SignatureAlreadyUsed();
    error InsufficientPayment();
    error InvalidSigner();
    error DeploymentFailed();
    error InvalidDeadline();
    error InvalidBytecode();
    error UnauthorizedDeployer();
    error LegacyDeploymentDisabled();
    
    constructor(address _signer) {
        if (_signer == address(0)) revert InvalidSigner();
        signer = _signer;
    }
    
    /**
     * @dev Deploy contract with payment and signature verification
     * @param bytecode The bytecode to deploy
     * @param paymentAmount The required payment amount
     * @param deadline Signature expiration timestamp
     * @param nonce Unique nonce for this deployment
     * @param signature The signature from the backend signer
     */
    function deployBytecodeWithPayment(
        bytes memory bytecode,
        uint256 paymentAmount,
        uint256 deadline,
        uint256 nonce,
        bytes memory signature
    ) external payable nonReentrant returns (address) {
        // Check deadline
        if (block.timestamp > deadline) revert SignatureExpired();
        if (deadline > block.timestamp + 365 days) revert InvalidDeadline();
        
        // Check payment
        if (msg.value < paymentAmount) revert InsufficientPayment();
        
        // Verify bytecode
        if (bytecode.length == 0) revert InvalidBytecode();
        bytes32 bytecodeHash = keccak256(bytecode);
        
        // Create deployment data
        DeploymentData memory data = DeploymentData({
            bytecodeHash: bytecodeHash,
            paymentAmount: paymentAmount,
            deployer: msg.sender,
            deadline: deadline,
            nonce: nonce,
            chainId: block.chainid
        });
        
        // Verify signature
        bytes32 messageHash = getMessageHash(data);
        bytes32 signatureHash = keccak256(signature);
        
        // Check if signature has been used
        if (usedSignatures[signatureHash]) revert SignatureAlreadyUsed();
        
        // Verify signer
        address recoveredSigner = messageHash.toEthSignedMessageHash().recover(signature);
        if (recoveredSigner != signer) revert InvalidSignature();
        
        // Mark signature as used
        usedSignatures[signatureHash] = true;
        
        // Deploy contract
        address deployedAddress;
        assembly {
            deployedAddress := create(0, add(bytecode, 0x20), mload(bytecode))
        }
        
        if (deployedAddress == address(0)) revert DeploymentFailed();
        
        emit ContractDeployed(deployedAddress, msg.sender, bytecodeHash, msg.value);
        return deployedAddress;
    }
    
    /**
     * @dev Deploy with CREATE2 for deterministic addresses with payment
     */
    function deployBytecodeWithSaltAndPayment(
        bytes memory bytecode,
        bytes32 salt,
        uint256 paymentAmount,
        uint256 deadline,
        uint256 nonce,
        bytes memory signature
    ) external payable nonReentrant returns (address) {
        // Check deadline
        if (block.timestamp > deadline) revert SignatureExpired();
        if (deadline > block.timestamp + 365 days) revert InvalidDeadline();
        
        // Check payment
        if (msg.value < paymentAmount) revert InsufficientPayment();
        
        // Verify bytecode
        if (bytecode.length == 0) revert InvalidBytecode();
        bytes32 bytecodeHash = keccak256(bytecode);
        
        // Create deployment data (including salt in the hash)
        bytes32 messageHash = keccak256(abi.encodePacked(
            bytecodeHash,
            salt,
            paymentAmount,
            msg.sender,
            deadline,
            nonce,
            block.chainid
        ));
        
        bytes32 signatureHash = keccak256(signature);
        
        // Check if signature has been used
        if (usedSignatures[signatureHash]) revert SignatureAlreadyUsed();
        
        // Verify signer
        address recoveredSigner = messageHash.toEthSignedMessageHash().recover(signature);
        if (recoveredSigner != signer) revert InvalidSignature();
        
        // Mark signature as used
        usedSignatures[signatureHash] = true;
        
        // Deploy with CREATE2
        address deployedAddress;
        assembly {
            deployedAddress := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
        }
        
        if (deployedAddress == address(0)) revert DeploymentFailed();
        
        emit ContractDeployed(deployedAddress, msg.sender, bytecodeHash, msg.value);
        return deployedAddress;
    }
    
    /**
     * @dev Legacy deployment without payment (for backwards compatibility)
     * Disabled by default. Owner must explicitly enable via setLegacyDeploymentStatus
     */
    function deployBytecode(bytes memory bytecode) external returns (address) {
        if (!isLegacyDeploymentEnabled) revert LegacyDeploymentDisabled();
        
        address deployedAddress;
        assembly {
            deployedAddress := create(0, add(bytecode, 0x20), mload(bytecode))
        }
        
        if (deployedAddress == address(0)) revert DeploymentFailed();
        
        emit ContractDeployed(deployedAddress, msg.sender, keccak256(bytecode), 0);
        return deployedAddress;
    }
    
    /**
     * @dev Compute the address that would be deployed with CREATE2
     */
    function computeAddress(bytes memory bytecode, bytes32 salt) 
        public 
        view 
        returns (address) 
    {
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                salt,
                keccak256(bytecode)
            )
        );
        return address(uint160(uint256(hash)));
    }
    
    /**
     * @dev Get the message hash for signature verification
     */
    function getMessageHash(DeploymentData memory data) 
        public 
        pure 
        returns (bytes32) 
    {
        return keccak256(abi.encodePacked(
            data.bytecodeHash,
            data.paymentAmount,
            data.deployer,
            data.deadline,
            data.nonce,
            data.chainId
        ));
    }
    
    /**
     * @dev Update the signer address (only owner)
     */
    function updateSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert InvalidSigner();
        address oldSigner = signer;
        signer = newSigner;
        emit SignerUpdated(oldSigner, newSigner);
    }
    
    /**
     * @dev Enable or disable legacy deployment function (only owner)
     * @param enabled True to enable legacy deployments, false to disable
     */
    function setLegacyDeploymentStatus(bool enabled) external onlyOwner {
        isLegacyDeploymentEnabled = enabled;
        emit LegacyDeploymentStatusUpdated(enabled);
    }
    
    /**
     * @dev Withdraw collected payments (only owner)
     */
    function withdraw(address payable to, uint256 amount) 
        external 
        onlyOwner 
        nonReentrant 
    {
        if (amount > address(this).balance) {
            amount = address(this).balance;
        }
        emit PaymentWithdrawn(to, amount);
        to.transfer(amount);
    }
    
    /**
     * @dev Withdraw all collected payments (only owner)
     */
    function withdrawAll(address payable to) 
        external 
        onlyOwner 
        nonReentrant 
    {
        uint256 amount = address(this).balance;
        emit PaymentWithdrawn(to, amount);
        to.transfer(amount);
    }
    
    /**
     * @dev Check if a signature has been used
     */
    function isSignatureUsed(bytes memory signature) 
        external 
        view 
        returns (bool) 
    {
        return usedSignatures[keccak256(signature)];
    }
    
    /**
     * @dev Get contract balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Verify a signature without executing deployment
     */
    function verifySignature(
        bytes32 bytecodeHash,
        uint256 paymentAmount,
        address deployer,
        uint256 deadline,
        uint256 nonce,
        bytes memory signature
    ) external view returns (bool) {
        DeploymentData memory data = DeploymentData({
            bytecodeHash: bytecodeHash,
            paymentAmount: paymentAmount,
            deployer: deployer,
            deadline: deadline,
            nonce: nonce,
            chainId: block.chainid
        });
        
        bytes32 messageHash = getMessageHash(data);
        address recoveredSigner = messageHash.toEthSignedMessageHash().recover(signature);
        return recoveredSigner == signer && !usedSignatures[keccak256(signature)];
    }
}
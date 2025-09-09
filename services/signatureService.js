const { ethers } = require('ethers');
require('dotenv').config();

class SignatureService {
  constructor() {
    const privateKey = process.env.SIGNER_PRIVATE_KEY;
    if (!privateKey) {
      console.warn('WARNING: SIGNER_PRIVATE_KEY not set in environment variables');
      // Use a test key for development only
      this.signer = new ethers.Wallet('0x0000000000000000000000000000000000000000000000000000000000000001');
      this.signerAddress = this.signer.address;
      console.warn(`Using test signer address: ${this.signerAddress}`);
    } else {
      this.signer = new ethers.Wallet(privateKey);
      this.signerAddress = this.signer.address;
      console.log(`Signer initialized with address: ${this.signerAddress}`);
    }
  }

  /**
   * Generate a unique nonce for deployment
   */
  generateNonce() {
    return Date.now() + Math.floor(Math.random() * 1000000);
  }

  /**
   * Generate deadline (default 1 hour from now)
   */
  generateDeadline(hoursFromNow = 1) {
    return Math.floor(Date.now() / 1000) + (hoursFromNow * 3600);
  }

  /**
   * Generate deployment signature for standard CREATE deployment
   */
  async generateDeploymentSignature(params) {
    const {
      bytecode,
      paymentAmount,
      deployerAddress,
      deadline = this.generateDeadline(),
      nonce = this.generateNonce(),
      chainId
    } = params;

    if (!bytecode || !deployerAddress || !chainId) {
      throw new Error('Missing required parameters: bytecode, deployerAddress, and chainId are required');
    }

    // Calculate bytecode hash
    const bytecodeHash = ethers.keccak256(bytecode);
    
    // Create message hash (must match smart contract's getMessageHash function)
    const messageHash = ethers.solidityPackedKeccak256(
      ['bytes32', 'uint256', 'address', 'uint256', 'uint256', 'uint256'],
      [bytecodeHash, paymentAmount, deployerAddress, deadline, nonce, chainId]
    );
    
    // Sign the message
    const signature = await this.signer.signMessage(ethers.getBytes(messageHash));
    
    return {
      signature,
      deploymentData: {
        bytecode,
        bytecodeHash,
        paymentAmount: paymentAmount.toString(),
        deployerAddress,
        deadline,
        nonce,
        chainId
      },
      signer: this.signerAddress,
      txValue: paymentAmount.toString() // Wei amount to send with transaction
    };
  }

  /**
   * Generate deployment signature for CREATE2 deployment
   */
  async generateCreate2DeploymentSignature(params) {
    const {
      bytecode,
      salt,
      paymentAmount,
      deployerAddress,
      deadline = this.generateDeadline(),
      nonce = this.generateNonce(),
      chainId
    } = params;

    if (!bytecode || !salt || !deployerAddress || !chainId) {
      throw new Error('Missing required parameters: bytecode, salt, deployerAddress, and chainId are required');
    }

    // Calculate bytecode hash
    const bytecodeHash = ethers.keccak256(bytecode);
    
    // Create message hash (must match smart contract's function)
    const messageHash = ethers.solidityPackedKeccak256(
      ['bytes32', 'bytes32', 'uint256', 'address', 'uint256', 'uint256', 'uint256'],
      [bytecodeHash, salt, paymentAmount, deployerAddress, deadline, nonce, chainId]
    );
    
    // Sign the message
    const signature = await this.signer.signMessage(ethers.getBytes(messageHash));
    
    return {
      signature,
      deploymentData: {
        bytecode,
        bytecodeHash,
        salt,
        paymentAmount: paymentAmount.toString(),
        deployerAddress,
        deadline,
        nonce,
        chainId
      },
      signer: this.signerAddress,
      txValue: paymentAmount.toString()
    };
  }

  /**
   * Verify a signature locally
   */
  verifySignature(deploymentData, signature) {
    const {
      bytecodeHash,
      paymentAmount,
      deployerAddress,
      deadline,
      nonce,
      chainId
    } = deploymentData;
    
    // Create message hash
    const messageHash = ethers.solidityPackedKeccak256(
      ['bytes32', 'uint256', 'address', 'uint256', 'uint256', 'uint256'],
      [bytecodeHash, paymentAmount, deployerAddress, deadline, nonce, chainId]
    );
    
    // Recover signer
    const recoveredSigner = ethers.verifyMessage(ethers.getBytes(messageHash), signature);
    
    return recoveredSigner.toLowerCase() === this.signerAddress.toLowerCase();
  }


  /**
   * Convert USD amount to Wei based on token price
   */
  convertUsdToWei(usdAmount, tokenPriceInUsd) {
    if (!tokenPriceInUsd || tokenPriceInUsd <= 0) {
      throw new Error('Invalid token price');
    }
    
    // Calculate token amount needed
    const tokenAmount = usdAmount / tokenPriceInUsd;
    
    // Convert to Wei (18 decimals)
    const weiAmount = ethers.parseEther(tokenAmount.toString());
    
    return weiAmount.toString();
  }

  /**
   * Get signer information
   */
  getSignerInfo() {
    return {
      address: this.signerAddress,
      ready: !!process.env.SIGNER_PRIVATE_KEY
    };
  }
}

module.exports = new SignatureService();
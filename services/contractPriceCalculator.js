const priceService = require('./priceService');
const networks = require('../config/networks');

class ContractPriceCalculator {
  constructor() {
    this.pricing = {
      token: {
        base: 0,
        basicFeatures: {
          price: 50,
          features: ['mintable', 'burnable', 'pausable', 'blacklist']
        },
        advancedFeatures: {
          maxTx: 20,
          transferTax: 20,
          antiBot: 20
        }
      },
      vesting: {
        base: 100
      }
    };
  }

  calculateTokenPrice(contractData) {
    let totalUSD = this.pricing.token.base;
    const breakdown = {
      base: this.pricing.token.base,
      features: []
    };

    const hasBasicFeature = this.pricing.token.basicFeatures.features.some(
      feature => contractData[feature] === true
    );

    if (hasBasicFeature) {
      totalUSD += this.pricing.token.basicFeatures.price;
      const selectedBasicFeatures = this.pricing.token.basicFeatures.features.filter(
        feature => contractData[feature] === true
      );
      breakdown.features.push({
        name: 'Basic Features',
        features: selectedBasicFeatures,
        price: this.pricing.token.basicFeatures.price
      });
    }

    if (contractData.maxTxAmount > 0) {
      totalUSD += this.pricing.token.advancedFeatures.maxTx;
      breakdown.features.push({
        name: 'Max Transaction Limit',
        price: this.pricing.token.advancedFeatures.maxTx
      });
    }

    if (contractData.transferTax > 0) {
      totalUSD += this.pricing.token.advancedFeatures.transferTax;
      breakdown.features.push({
        name: 'Transfer Tax',
        price: this.pricing.token.advancedFeatures.transferTax
      });
    }

    if (contractData.cooldownTime > 0) {
      totalUSD += this.pricing.token.advancedFeatures.antiBot;
      breakdown.features.push({
        name: 'Anti-Bot Protection',
        price: this.pricing.token.advancedFeatures.antiBot
      });
    }

    breakdown.total = totalUSD;
    return { totalUSD, breakdown };
  }

  calculateVestingPrice() {
    const totalUSD = this.pricing.vesting.base;
    const breakdown = {
      base: this.pricing.vesting.base,
      features: [],
      total: totalUSD
    };

    return { totalUSD, breakdown };
  }

  async calculatePrice(contractData, network) {
    if (!contractData || !contractData.contractType) {
      throw new Error('Contract type is required');
    }

    let priceInfo;
    let isFree = false;
    let freeReason = null;

    // Check if deployment should be free
    if (contractData.isChainSignatures === true) {
      isFree = true;
      freeReason = 'Chain Signatures deployment';
    }

    // Check if network is testnet
    if (network && networks[network] && networks[network].isTestnet === true) {
      isFree = true;
      freeReason = freeReason ? `${freeReason} + Testnet deployment` : 'Testnet deployment';
    }

    if (isFree) {
      // Return free deployment
      priceInfo = {
        totalUSD: 0,
        breakdown: {
          base: 0,
          features: [],
          freeReason: freeReason,
          total: 0
        }
      };
    } else {
      // Calculate normal price
      switch (contractData.contractType) {
        case 'token':
          priceInfo = this.calculateTokenPrice(contractData);
          break;
        case 'vesting':
          priceInfo = this.calculateVestingPrice();
          break;
        default:
          throw new Error(`Unsupported contract type: ${contractData.contractType}`);
      }
    }

    let tokenPrice = null;
    let nativeTokenAmount = null;
    let tokenInfo = null;

    if (network && !isFree) {
      try {
        tokenInfo = await priceService.getTokenPrice(network);
        tokenPrice = tokenInfo.price;
        nativeTokenAmount = priceInfo.totalUSD / tokenPrice;
      } catch (error) {
        console.error(`Failed to fetch token price for ${network}:`, error.message);
      }
    }

    return {
      contractType: contractData.contractType,
      network: network || null,
      pricing: {
        usd: priceInfo.totalUSD,
        breakdown: priceInfo.breakdown,
        isFree: isFree
      },
      token: tokenInfo ? {
        name: tokenInfo.gasToken,
        price: tokenPrice,
        amount: nativeTokenAmount,
        change24h: tokenInfo.change24h
      } : null,
      timestamp: new Date().toISOString()
    };
  }

  validateContractData(contractData) {
    if (!contractData) {
      return { valid: false, error: 'Contract data is required' };
    }

    if (!contractData.contractType) {
      return { valid: false, error: 'Contract type is required' };
    }

    if (contractData.contractType === 'token') {
      const requiredFields = ['tokenName', 'tokenSymbol', 'decimals', 'initialSupply'];
      const missingFields = requiredFields.filter(field => !contractData[field]);
      
      if (missingFields.length > 0) {
        return { 
          valid: false, 
          error: `Missing required fields for token contract: ${missingFields.join(', ')}` 
        };
      }

      if (contractData.initialSupply <= 0) {
        return { valid: false, error: 'Initial supply must be greater than 0' };
      }
    }

    return { valid: true };
  }

  getPricingInfo() {
    return {
      token: {
        base: 'Free (base token features only)',
        features: {
          basic: {
            price: this.pricing.token.basicFeatures.price,
            features: this.pricing.token.basicFeatures.features,
            description: 'One-time fee for any combination of basic features'
          },
          advanced: {
            maxTx: {
              price: this.pricing.token.advancedFeatures.maxTx,
              description: 'Maximum transaction limit'
            },
            transferTax: {
              price: this.pricing.token.advancedFeatures.transferTax,
              description: 'Transfer tax functionality'
            },
            antiBot: {
              price: this.pricing.token.advancedFeatures.antiBot,
              description: 'Anti-bot protection with cooldown'
            }
          }
        }
      },
      vesting: {
        base: this.pricing.vesting.base,
        description: 'Fixed price for vesting contract'
      }
    };
  }
}

module.exports = new ContractPriceCalculator();
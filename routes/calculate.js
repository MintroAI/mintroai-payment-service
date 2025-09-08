const express = require('express');
const router = express.Router();
const contractPriceCalculator = require('../services/contractPriceCalculator');
const networkHelper = require('../utils/networkHelper');

router.post('/calculate', async (req, res) => {
  try {
    const { contractData } = req.body;

    const validation = contractPriceCalculator.validateContractData(contractData);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    let targetNetwork = null;
    
    if (contractData.chainId) {
      targetNetwork = networkHelper.getNetworkKeyByChainId(contractData.chainId);
      
      if (!targetNetwork) {
        return res.status(400).json({
          success: false,
          error: `Chain ID ${contractData.chainId} is not supported`,
          supportedChainIds: networkHelper.getSupportedChainIds()
        });
      }
    }

    const priceCalculation = await contractPriceCalculator.calculatePrice(contractData, targetNetwork);

    res.json({
      success: true,
      data: priceCalculation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/pricing-info', (req, res) => {
  try {
    const pricingInfo = contractPriceCalculator.getPricingInfo();
    const supportedChainIds = networkHelper.getSupportedChainIds();
    
    res.json({
      success: true,
      data: {
        pricing: pricingInfo,
        supportedChainIds: supportedChainIds
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/estimate', async (req, res) => {
  try {
    const { features, contractType, chainId } = req.body;

    if (!contractType) {
      return res.status(400).json({
        success: false,
        error: 'Contract type is required'
      });
    }

    const contractData = {
      contractType,
      chainId,
      ...features
    };

    if (contractType === 'token') {
      contractData.tokenName = contractData.tokenName || 'Token';
      contractData.tokenSymbol = contractData.tokenSymbol || 'TKN';
      contractData.decimals = contractData.decimals || 18;
      contractData.initialSupply = contractData.initialSupply || 1000000;
    }

    let targetNetwork = null;
    if (chainId) {
      targetNetwork = networkHelper.getNetworkKeyByChainId(chainId);
    }

    const priceCalculation = await contractPriceCalculator.calculatePrice(contractData, targetNetwork);

    res.json({
      success: true,
      data: {
        estimate: true,
        ...priceCalculation
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
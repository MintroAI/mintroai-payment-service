const express = require('express');
const router = express.Router();
const contractPriceCalculator = require('../services/contractPriceCalculator');

router.post('/calculate', async (req, res) => {
  try {
    const { contractData, network } = req.body;

    const validation = contractPriceCalculator.validateContractData(contractData);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    const priceCalculation = await contractPriceCalculator.calculatePrice(contractData, network);

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
    res.json({
      success: true,
      data: pricingInfo
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
    const { features, contractType, network } = req.body;

    if (!contractType) {
      return res.status(400).json({
        success: false,
        error: 'Contract type is required'
      });
    }

    const contractData = {
      contractType,
      ...features
    };

    if (contractType === 'token') {
      contractData.tokenName = contractData.tokenName || 'Token';
      contractData.tokenSymbol = contractData.tokenSymbol || 'TKN';
      contractData.decimals = contractData.decimals || 18;
      contractData.initialSupply = contractData.initialSupply || 1000000;
    }

    const priceCalculation = await contractPriceCalculator.calculatePrice(contractData, network);

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
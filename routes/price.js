const express = require('express');
const router = express.Router();
const priceService = require('../services/priceService');
const networks = require('../config/networks');

router.get('/price/:network', async (req, res) => {
  try {
    const { network } = req.params;
    const priceData = await priceService.getTokenPrice(network);
    res.json({
      success: true,
      data: priceData
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/prices', async (req, res) => {
  try {
    const prices = await priceService.getAllPrices();
    res.json({
      success: true,
      data: prices
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/networks', (req, res) => {
  const networkList = Object.entries(networks).map(([key, network]) => ({
    key,
    name: network.name,
    chainId: network.chainId,
    gasToken: network.gasToken,
    isTestnet: network.isTestnet || false
  }));
  
  res.json({
    success: true,
    data: networkList
  });
});

module.exports = router;
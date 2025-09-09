const express = require('express');
const router = express.Router();
const signatureService = require('../services/signatureService');
const contractPriceCalculator = require('../services/contractPriceCalculator');
const networkHelper = require('../utils/networkHelper');
const priceService = require('../services/priceService');

router.post('/prepare', async (req, res) => {
  try {
    const { contractData, bytecode, deployerAddress, deploymentType = 'create', salt } = req.body;

    // Validate required fields
    if (!contractData || !bytecode || !deployerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: contractData, bytecode, and deployerAddress are required'
      });
    }
             
    if (!contractData.chainId) {
      return res.status(400).json({
        success: false,
        error: 'chainId is required in contractData'
      });
    }

    // Get network from chainId
    const network = networkHelper.getNetworkKeyByChainId(contractData.chainId);
    if (!network) {
      return res.status(400).json({
        success: false,
        error: `Chain ID ${contractData.chainId} is not supported`,
        supportedChainIds: networkHelper.getSupportedChainIds()
      });
    }

    // Calculate price
    const priceCalculation = await contractPriceCalculator.calculatePrice(contractData, network);
    
    // Get payment amount in Wei
    let paymentAmountWei = '0';
    
    if (!priceCalculation.pricing.isFree && priceCalculation.pricing.usd > 0) {
      // Get token price for the network
      const tokenInfo = await priceService.getTokenPrice(network);
      paymentAmountWei = signatureService.convertUsdToWei(
        priceCalculation.pricing.usd,
        tokenInfo.price
      );
    }

    // Generate signature based on deployment type
    let signatureResult;
    
    if (deploymentType === 'create2' && salt) {
      signatureResult = await signatureService.generateCreate2DeploymentSignature({
        bytecode,
        salt,
        paymentAmount: paymentAmountWei,
        deployerAddress,
        chainId: contractData.chainId
      });
    } else {
      signatureResult = await signatureService.generateDeploymentSignature({
        bytecode,
        paymentAmount: paymentAmountWei,
        deployerAddress,
        chainId: contractData.chainId
      });
    }

    res.json({
      success: true,
      data: {
        signature: signatureResult.signature,
        deploymentData: signatureResult.deploymentData,
        pricing: priceCalculation.pricing,
        txValue: signatureResult.txValue,
        network: {
          name: network,
          chainId: contractData.chainId,
          gasToken: priceCalculation.token?.name || null
        },
        signer: signatureResult.signer
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const { deploymentData, signature } = req.body;

    if (!deploymentData || !signature) {
      return res.status(400).json({
        success: false,
        error: 'deploymentData and signature are required'
      });
    }

    const isValid = signatureService.verifySignature(deploymentData, signature);

    res.json({
      success: true,
      data: {
        valid: isValid,
        signer: signatureService.getSignerInfo().address
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
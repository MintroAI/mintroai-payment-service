const express = require('express');
const priceRoutes = require('./routes/price');
const calculateRoutes = require('./routes/calculate');
const deploymentRoutes = require('./routes/signature');
const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());

app.use('/api', priceRoutes);
app.use('/api', calculateRoutes);
app.use('/api/signature', deploymentRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'mintroai-payment-service',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'MintroAI Payment Service',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      networks: '/api/networks',
      priceByNetwork: '/api/price/:network',
      allPrices: '/api/prices',
      calculate: '/api/calculate',
      estimate: '/api/estimate',
      pricingInfo: '/api/pricing-info',
      signature: {
        prepare: '/api/signature/prepare',
        verify: '/api/signature/verify'
      }
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
  console.log(`Price API available at http://localhost:${PORT}/api/price/:network`);
});
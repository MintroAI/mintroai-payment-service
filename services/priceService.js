const axios = require('axios');
const networks = require('../config/networks');

class PriceService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 60000; // 1 minute cache
    this.coingeckoApiUrl = 'https://api.coingecko.com/api/v3';
  }

  async getTokenPrice(networkName) {
    const network = networks[networkName.toLowerCase()];
    
    if (!network) {
      throw new Error(`Network ${networkName} not supported`);
    }

    const cacheKey = network.coingeckoId;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await axios.get(
        `${this.coingeckoApiUrl}/simple/price`,
        {
          params: {
            ids: network.coingeckoId,
            vs_currencies: 'usd',
            include_24hr_change: true,
            include_last_updated_at: true
          }
        }
      );

      const priceData = response.data[network.coingeckoId];
      
      if (!priceData) {
        throw new Error(`Price data not available for ${network.gasToken}`);
      }

      const result = {
        network: network.name,
        gasToken: network.gasToken,
        price: priceData.usd,
        change24h: priceData.usd_24h_change,
        lastUpdated: new Date(priceData.last_updated_at * 1000).toISOString()
      };

      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      throw new Error(`Failed to fetch price: ${error.message}`);
    }
  }

  async getAllPrices() {
    const prices = {};
    const networkNames = Object.keys(networks);
    
    for (const networkName of networkNames) {
      try {
        prices[networkName] = await this.getTokenPrice(networkName);
      } catch (error) {
        prices[networkName] = {
          error: error.message,
          network: networks[networkName].name,
          gasToken: networks[networkName].gasToken
        };
      }
    }
    
    return prices;
  }

  clearCache() {
    this.cache.clear();
  }
}

module.exports = new PriceService();
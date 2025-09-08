const networks = require('../config/networks');

class NetworkHelper {
  constructor() {
    this.chainIdMap = this.buildChainIdMap();
  }

  buildChainIdMap() {
    const map = {};
    for (const [key, network] of Object.entries(networks)) {
      if (network.chainId) {
        map[network.chainId] = key;
      }
    }
    return map;
  }

  getNetworkByChainId(chainId) {
    const networkKey = this.chainIdMap[chainId];
    if (!networkKey) {
      return null;
    }
    return {
      key: networkKey,
      ...networks[networkKey]
    };
  }

  getNetworkKeyByChainId(chainId) {
    return this.chainIdMap[chainId] || null;
  }

  getSupportedChainIds() {
    return Object.keys(this.chainIdMap).map(id => parseInt(id));
  }

  isChainIdSupported(chainId) {
    return this.chainIdMap.hasOwnProperty(chainId);
  }

  getNetworkInfo(chainId) {
    const network = this.getNetworkByChainId(chainId);
    if (!network) {
      return {
        supported: false,
        chainId: chainId,
        message: `Chain ID ${chainId} is not supported`
      };
    }

    return {
      supported: true,
      chainId: chainId,
      network: network.name,
      gasToken: network.gasToken,
      isTestnet: network.isTestnet || false,
      key: network.key
    };
  }
}

module.exports = new NetworkHelper();
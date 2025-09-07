const networks = {
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    gasToken: 'ethereum',
    coingeckoId: 'ethereum',
    rpcUrl: 'https://arb1.arbitrum.io/rpc'
  },
  bsc: {
    name: 'BSC',
    chainId: 56,
    gasToken: 'bnb',
    coingeckoId: 'binancecoin',
    rpcUrl: 'https://bsc-dataseed.binance.org'
  },
  hyperevm: {
    name: 'HyperEVM',
    chainId: 999,
    gasToken: 'hyperliquid',
    coingeckoId: 'hyperliquid',
    rpcUrl: 'https://hyperliquid.drpc.org'
  },
  theta: {
    name: 'Theta',
    chainId: 361,
    gasToken: 'tfuel',
    coingeckoId: 'theta-fuel',
    rpcUrl: 'https://eth-rpc-api.thetatoken.org/rpc'
  },
  aurora: {
    name: 'Aurora',
    chainId: 1313161554,
    gasToken: 'ethereum',
    coingeckoId: 'ethereum',
    rpcUrl: 'https://mainnet.aurora.dev'
  },
  bsctestnet: {
    name: 'BscTestnet',
    chainId: 97,
    gasToken: 'bnb',
    coingeckoId: 'binancecoin',
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    isTestnet: true
  },
  auroratestnet: {
    name: 'AuroraTestnet',
    chainId: 1313161555,
    gasToken: 'ethereum',
    coingeckoId: 'ethereum',
    rpcUrl: 'https://testnet.aurora.dev',
    isTestnet: true
  },
  thetatestnet: {
    name: 'ThetaTestnet',
    chainId: 365,
    gasToken: 'tfuel',
    coingeckoId: 'theta-fuel',
    rpcUrl: 'https://eth-rpc-api-testnet.thetatoken.org/rpc',
    isTestnet: true
  }
};

module.exports = networks;
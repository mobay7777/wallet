/**
 *
 * Wallet - Constants - APIs
 *
 */
// Base URLs
const WALLET_TESTNET = 'https://apiwallet.testnet.rupaya.io';
const SCAN_TESTNET = 'https://scan.testnet.rupaya.io';
const WALLET_MAINNET = 'https://wallet.rupaya.io';
const SCAN_MAINNET = 'https://scan.rupaya.io';

export default {
  TOMOCHAIN_TESTNET: {
    GET_TOKENS: `${WALLET_TESTNET}/api/tokens`,
    GET_TRANSACTIONS: `${SCAN_TESTNET}/api/txs/listByAccount`,
    WALLET_GET_TRANSACTIONS: `${WALLET_TESTNET}/api/transactions/ui`,
    VIEW_TRANSACTION: `${SCAN_TESTNET}/txs`,
    VIEW_ADDRESS: `${SCAN_TESTNET}/address`,
    VIEW_TOKEN: `${SCAN_TESTNET}/tokens`,
  },
  TOMOCHAIN_MAINNET: {
    GET_TOKENS: `${WALLET_MAINNET}/api/tokens`,
    GET_TRANSACTIONS: `${SCAN_MAINNET}/api/txs/listByAccount`,
    WALLET_GET_TRANSACTIONS: `${WALLET_MAINNET}/api/transactions/ui`,
    VIEW_TRANSACTION: `${SCAN_MAINNET}/txs`,
    VIEW_ADDRESS: `${SCAN_MAINNET}/address`,
    VIEW_TOKEN: `${SCAN_MAINNET}/tokens`,
  },
};

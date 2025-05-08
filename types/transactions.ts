export interface Transaction {
  hash: string
  from: string
  to: string
  value: string
  tokenName?: string
  tokenSymbol?: string
  tokenDecimal?: string
  tokenID?: string
  type: 'ETH' | 'ERC20' | 'NFT' | 'CONTRACT'
  timeStamp: string
  walletLabel?: string
}

export interface MonitoringConfig {
  ETH_TRANSFERS: boolean      // Monitor ETH transfers
  ERC20_TRANSFERS: boolean    // Monitor ERC20 token transfers
  NFT_TRANSFERS: boolean      // Monitor NFT transfers (ERC721/ERC1155)
  CONTRACT_INTERACTIONS: boolean // Monitor general contract interactions
  INCOMING_ONLY: boolean      // If true, only monitor incoming transactions
}

export interface WalletConfig {
  address: string
  label: string
} 
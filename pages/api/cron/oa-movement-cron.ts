import type { NextApiRequest, NextApiResponse } from 'next'
import { Resend } from 'resend'

// Monitoring Configuration
const MONITORING_CONFIG = {
  ETH_TRANSFERS: true,      // Monitor ETH transfers
  ERC20_TRANSFERS: true,    // Monitor ERC20 token transfers
  NFT_TRANSFERS: true,      // Monitor NFT transfers (ERC721/ERC1155)
  CONTRACT_INTERACTIONS: true, // Monitor general contract interactions
  INCOMING_ONLY: false      // If true, only monitor incoming transactions
}

interface WalletConfig {
  address: string
  label: string
}

const MONITORED_WALLETS: WalletConfig[] = [
  {
    address: '0x9Cd83BE15a79646A3D22B81fc8dDf7B7240a62cB',
    label: 'Main Sac'
  },
  {
    address: '0x1b7baa734c00298b9429b518d621753bb0f6eff2',
    label: 'Daughter 1'
  },
  {
    address: '0x799bdc3f2075230ff85ec6767eaaa92365fdde0b',
    label: 'Daughter 2'
  },
  {
    address: '0xB17c443c89B0c18e53B6E25aE55297e122B30E5c',
    label: 'Daughter 3'
  },
  {
    address: '0xbFc9C5878245fb9FE49c688a9c554cBA1FAE71fA',
    label: 'Daughter 4'
  },
  {
    address: '0x20fCB7b4E103EC482645E15715c8a2E7a437FBD6',
    label: 'Daughter 5'
  },
  {
    address: '0xB628441794cd41484BE092B3b5f4b2fF7271eb60',
    label: 'Daughter 6'
  },
  {
    address: '0x7bE74346Dc745EA110358810924C9088BC76Db59',
    label: 'Daughter 7'
  },
  {
    address: '0x1a73652bFAdc26C632aE21F52AacbCBdb396d659',
    label: 'Daughter 8'
  },
  {
    address: '0x0658166531c5618e605566eaa97697047fCF559',
    label: 'Daughter 9'
  },
  {
    address: '0xB727d70c04520FA68aE5802859487317496b4F99',
    label: 'Daughter 10'
  },
  {
    address: '0x04652660148bfA25F660A1a783401821f5B541e',
    label: 'Daughter 11'
  },
  {
    address: '0xa99682f323379F788Bc4F004CF0a135ff1e226D7',
    label: 'Daughter 12'
  },
  {
    address: '0x7C90b72Da9344980bF31B20c4b4ab31f026bC54e',
    label: 'Daughter 13'
  },
  {
    address: '0xe6F9aA98e85c703B37e8d9AfEaef2f464750E063',
    label: 'Daughter 14'
  },
  {
    address: '0x63f97aD9fA0d4e8ca5Bb2F21334366806f802547',
    label: 'Daughter 15'
  },
  {
    address: '0xc83DEeAD548E132Cd1a0464D02e2DE128BA75f9b',
    label: 'Daughter 16'
  },
  {
    address: '0xb928a97E5Ecd27C668cc370939C8f62f93DE54fa',
    label: 'Daughter 17'
  },
  {
    address: '0x33cF90c54b777018CB5d7Ff76f30e73235a61c78',
    label: 'Daughter 18'
  },
  {
    address: '0xF8086ee4A78Ab88640EAFB107aE7BC9Ac64C35EC',
    label: 'Daughter 19'
  },
  {
    address: '0x4BB20207BAA8688904F0C35147F19B61ddc16FD0',
    label: 'Daughter 20'
  },
  {
    address: '0xb8691E71F4D0aB9A6abbdeCe20fABC8C7521Cd43',
    label: 'Daughter 21'
  },
  {
    address: '0xaB203F75546C0f2905D71351f0436eFEFA4A0daC',
    label: 'Daughter 22'
  },
  {
    address: '0x1B7BAa734C00298b9429b518D621753Bb0f6efF2',
    label: 'Daughter 23'
  },
  {
    address: '0xc3B7f26d6C64024D5269DB60cEFCC3807ef31C1f',
    label: 'Daughter 24'
  },
  {
    address: '0x13c808Af0281c18a89e8438317c66Dd9645E8662',
    label: 'Daughter 25'
  },
  {
    address: '0x9320249FD87CD011ACf1E3b269180B74cDD3519E',
    label: 'Daughter 26'
  },
  {
    address: '0x0083d744c0949AD9091f236F33E7Fb17e69c03ee',
    label: 'Daughter 27'
  },
  {
    address: '0x0e8Eb2232Fc3fB0c10756cD65D7052987D6316f4',
    label: 'Daughter 28'
  },
  {
    address: '0xFE19b054F7B0cb7F4c051372Ab2bD799472583CC',
    label: 'Daughter 29'
  },
  {
    address: '0x293bF003350f068698036d63eEec322B7F437eEE',
    label: 'Daughter 30'
  }
]

const apiKey = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY
const resendApiKey = process.env.RESEND_API_KEY
const toEmail = process.env.TO_EMAIL
const fromEmail = process.env.FROM_EMAIL
const cronSecret = process.env.CRON_SECRET

interface Transaction {
  hash: string
  from: string
  to: string
  value: string
  tokenName?: string
  tokenSymbol?: string
  tokenDecimal?: string
  tokenID?: string
  type: 'ETH' | 'ERC20' | 'NFT' | 'CONTRACT'
  walletLabel?: string
}

// Track last check timestamp
let lastCheckTimestamp = Math.floor(Date.now() / 1000) - 300 // Start with 5 minutes ago

async function fetchTransactions(wallet: WalletConfig, apiKey: string): Promise<Transaction[]> {
  const transactions: Transaction[] = []

  // Fetch normal ETH transactions
  if (MONITORING_CONFIG.ETH_TRANSFERS) {
    const ethUrl = `https://api.etherscan.io/api?module=account&action=txlist&address=${wallet.address}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}&starttime=${lastCheckTimestamp}`
    const ethResponse = await fetch(ethUrl)
    const ethData = await ethResponse.json()
    
    if (ethData.status === '1' && ethData.result?.length > 0) {
      const ethTxs = ethData.result
        .filter((tx: any) => tx.value !== '0')
        .map((tx: any) => ({
          ...tx,
          type: 'ETH',
          walletLabel: wallet.label
        }))
      transactions.push(...ethTxs)
    }
  }

  // Fetch ERC20 token transfers
  if (MONITORING_CONFIG.ERC20_TRANSFERS) {
    const erc20Url = `https://api.etherscan.io/api?module=account&action=tokentx&address=${wallet.address}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}&starttime=${lastCheckTimestamp}`
    const erc20Response = await fetch(erc20Url)
    const erc20Data = await erc20Response.json()
    
    if (erc20Data.status === '1' && erc20Data.result?.length > 0) {
      const erc20Txs = erc20Data.result.map((tx: any) => ({
        ...tx,
        type: 'ERC20',
        walletLabel: wallet.label
      }))
      transactions.push(...erc20Txs)
    }
  }

  // Fetch NFT transfers (both ERC721 and ERC1155)
  if (MONITORING_CONFIG.NFT_TRANSFERS) {
    // ERC721
    const nftUrl = `https://api.etherscan.io/api?module=account&action=tokennfttx&address=${wallet.address}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}&starttime=${lastCheckTimestamp}`
    const nftResponse = await fetch(nftUrl)
    const nftData = await nftResponse.json()
    
    if (nftData.status === '1' && nftData.result?.length > 0) {
      const nftTxs = nftData.result.map((tx: any) => ({
        ...tx,
        type: 'NFT',
        walletLabel: wallet.label
      }))
      transactions.push(...nftTxs)
    }

    // ERC1155
    const nft1155Url = `https://api.etherscan.io/api?module=account&action=token1155tx&address=${wallet.address}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}&starttime=${lastCheckTimestamp}`
    const nft1155Response = await fetch(nft1155Url)
    const nft1155Data = await nft1155Response.json()
    
    if (nft1155Data.status === '1' && nft1155Data.result?.length > 0) {
      const nft1155Txs = nft1155Data.result.map((tx: any) => ({
        ...tx,
        type: 'NFT',
        walletLabel: wallet.label
      }))
      transactions.push(...nft1155Txs)
    }
  }

  return transactions
}

function formatTransactionDetails(tx: Transaction): string {
  let details = `
    <p><strong>Wallet:</strong> ${tx.walletLabel}</p>
    <p><strong>Type:</strong> ${tx.type}</p>
    <p><strong>Hash:</strong> ${tx.hash}</p>
    <p><strong>From:</strong> ${tx.from}</p>
    <p><strong>To:</strong> ${tx.to}</p>
  `

  if (tx.type === 'ETH') {
    details += `<p><strong>Value:</strong> ${Number(tx.value) / 1e18} ETH</p>`
  } else if (tx.type === 'ERC20') {
    const value = Number(tx.value) / Math.pow(10, Number(tx.tokenDecimal))
    details += `
      <p><strong>Token:</strong> ${tx.tokenName} (${tx.tokenSymbol})</p>
      <p><strong>Value:</strong> ${value} ${tx.tokenSymbol}</p>
    `
  } else if (tx.type === 'NFT') {
    details += `
      <p><strong>NFT:</strong> ${tx.tokenName}</p>
      <p><strong>Token ID:</strong> ${tx.tokenID}</p>
    `
  }

  details += `<p><a href="https://etherscan.io/tx/${tx.hash}">View on Etherscan</a></p>`
  return details
}

export const handler = async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('Cron job started at:', new Date().toISOString())
  console.log('Checking for transactions since:', new Date(lastCheckTimestamp * 1000).toISOString())
  
  // Check for authentication
  const authHeader = req.headers.authorization
  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    console.error('Authentication failed:', { authHeader })
    return res.status(401).json({ message: 'Unauthorized' })
  }

  // Log environment variables status (without exposing values)
  console.log('Environment variables check:', {
    hasApiKey: !!apiKey,
    hasResendKey: !!resendApiKey,
    hasToEmail: !!toEmail,
    hasFromEmail: !!fromEmail,
    hasCronSecret: !!cronSecret
  })

  if (!apiKey || !resendApiKey || !toEmail || !fromEmail || !cronSecret) {
    console.error('Missing environment variables:', {
      hasApiKey: !!apiKey,
      hasResendKey: !!resendApiKey,
      hasToEmail: !!toEmail,
      hasFromEmail: !!fromEmail,
      hasCronSecret: !!cronSecret
    })
    return res
      .status(500)
      .json({ message: 'Missing required environment variables' })
  }

  try {
    let allNewTransactions: Transaction[] = []

    // Fetch and process transactions for each wallet
    for (const wallet of MONITORED_WALLETS) {
      console.log(`Fetching transactions for ${wallet.label} (${wallet.address})`)
      const transactions = await fetchTransactions(wallet, apiKey)
      console.log(`Transactions fetched for ${wallet.label}:`, transactions.length)
      
      // Filter for incoming transactions if configured
      const relevantTransactions = MONITORING_CONFIG.INCOMING_ONLY 
        ? transactions.filter(tx => tx.to.toLowerCase() === wallet.address.toLowerCase())
        : transactions

      if (relevantTransactions.length > 0) {
        allNewTransactions.push(...relevantTransactions)
      }
    }

    // Update the last check timestamp
    lastCheckTimestamp = Math.floor(Date.now() / 1000)

    const currentTime = new Date().toLocaleString('en-US', { 
      timeZone: 'America/New_York',
      hour12: true,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    })

    // Only send email if new transactions are found
    if (allNewTransactions.length > 0) {
      const resend = new Resend(resendApiKey)
      console.log('New transactions found, sending email to:', toEmail)

      // Group transactions by wallet
      const transactionsByWallet = allNewTransactions.reduce((acc, tx) => {
        const label = tx.walletLabel || 'Unknown'
        if (!acc[label]) {
          acc[label] = []
        }
        acc[label].push(tx)
        return acc
      }, {} as { [key: string]: Transaction[] })

      // Format email content with transactions grouped by wallet
      let emailContent = `
        <h2>Transaction Check Report</h2>
        <p><strong>Time:</strong> ${currentTime}</p>
      `

      for (const [label, transactions] of Object.entries(transactionsByWallet)) {
        emailContent += `
          <h3>${label}</h3>
          ${transactions.map(tx => formatTransactionDetails(tx)).join('<hr/>')}
        `
      }
      
      const emailResponse = await resend.emails.send({
        from: fromEmail,
        to: toEmail,
        subject: `🔍 New Transactions Found - ${currentTime}`,
        html: emailContent
      })
      console.log('Email sent successfully:', emailResponse)

      return res.status(200).json({ 
        message: 'New transactions found and email sent',
        transactionsFound: allNewTransactions.length,
        response: emailResponse 
      })
    }

    // If no new transactions, just return success without sending email
    return res.status(200).json({ 
      message: 'Check completed, no new transactions',
      transactionsFound: 0
    })

  } catch (error) {
    console.error('Error in cron job:', error)
    return res.status(500).json({ message: 'Failed to process transactions', error: error.message })
  }
}

// Default export for Vercel cron
export default handler

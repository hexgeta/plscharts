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

const address = process.env.MONITORED_ADDRESS
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
}

let lastTransactions: { [key: string]: string | null } = {
  eth: null,
  erc20: null,
  nft: null
}

async function fetchTransactions(address: string, apiKey: string): Promise<Transaction[]> {
  const transactions: Transaction[] = []

  // Fetch normal ETH transactions
  if (MONITORING_CONFIG.ETH_TRANSFERS) {
    const ethUrl = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&sort=desc&apikey=${apiKey}`
    const ethResponse = await fetch(ethUrl)
    const ethData = await ethResponse.json()
    
    if (ethData.status === '1' && ethData.result?.length > 0) {
      const ethTxs = ethData.result
        .filter((tx: any) => tx.value !== '0')
        .map((tx: any) => ({
          ...tx,
          type: 'ETH'
        }))
      transactions.push(...ethTxs)
    }
  }

  // Fetch ERC20 token transfers
  if (MONITORING_CONFIG.ERC20_TRANSFERS) {
    const erc20Url = `https://api.etherscan.io/api?module=account&action=tokentx&address=${address}&sort=desc&apikey=${apiKey}`
    const erc20Response = await fetch(erc20Url)
    const erc20Data = await erc20Response.json()
    
    if (erc20Data.status === '1' && erc20Data.result?.length > 0) {
      const erc20Txs = erc20Data.result.map((tx: any) => ({
        ...tx,
        type: 'ERC20'
      }))
      transactions.push(...erc20Txs)
    }
  }

  // Fetch NFT transfers (both ERC721 and ERC1155)
  if (MONITORING_CONFIG.NFT_TRANSFERS) {
    // ERC721
    const nftUrl = `https://api.etherscan.io/api?module=account&action=tokennfttx&address=${address}&sort=desc&apikey=${apiKey}`
    const nftResponse = await fetch(nftUrl)
    const nftData = await nftResponse.json()
    
    if (nftData.status === '1' && nftData.result?.length > 0) {
      const nftTxs = nftData.result.map((tx: any) => ({
        ...tx,
        type: 'NFT'
      }))
      transactions.push(...nftTxs)
    }

    // ERC1155
    const nft1155Url = `https://api.etherscan.io/api?module=account&action=token1155tx&address=${address}&sort=desc&apikey=${apiKey}`
    const nft1155Response = await fetch(nft1155Url)
    const nft1155Data = await nft1155Response.json()
    
    if (nft1155Data.status === '1' && nft1155Data.result?.length > 0) {
      const nft1155Txs = nft1155Data.result.map((tx: any) => ({
        ...tx,
        type: 'NFT'
      }))
      transactions.push(...nft1155Txs)
    }
  }

  return transactions
}

function formatTransactionDetails(tx: Transaction): string {
  let details = `
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('Cron job started at:', new Date().toISOString())
  
  // Check for authentication
  const authHeader = req.headers.authorization
  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    console.error('Authentication failed:', { authHeader })
    return res.status(401).json({ message: 'Unauthorized' })
  }

  // Log environment variables status (without exposing values)
  console.log('Environment variables check:', {
    hasAddress: !!address,
    hasApiKey: !!apiKey,
    hasResendKey: !!resendApiKey,
    hasToEmail: !!toEmail,
    hasFromEmail: !!fromEmail,
    hasCronSecret: !!cronSecret
  })

  if (!apiKey || !resendApiKey || !toEmail || !fromEmail || !address || !cronSecret) {
    console.error('Missing environment variables:', {
      hasAddress: !!address,
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
    console.log('Fetching transactions for address:', address)
    const transactions = await fetchTransactions(address, apiKey)
    console.log('Transactions fetched:', transactions.length)
    
    const currentTime = new Date().toLocaleString('en-US', { 
      timeZone: 'America/New_York',
      hour12: true,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    })
    
    // Filter for incoming transactions if configured
    const relevantTransactions = MONITORING_CONFIG.INCOMING_ONLY 
      ? transactions.filter(tx => tx.to.toLowerCase() === address.toLowerCase())
      : transactions
    console.log('Relevant transactions:', relevantTransactions.length)

    // Check for new transactions
    const newTransactions = relevantTransactions.filter(tx => {
      const isNew = lastTransactions[tx.type.toLowerCase()] !== tx.hash
      if (isNew) {
        lastTransactions[tx.type.toLowerCase()] = tx.hash
      }
      return isNew
    })
    console.log('New transactions found:', newTransactions.length)

    const resend = new Resend(resendApiKey)
    console.log('Attempting to send email to:', toEmail)
    
    // Send email regardless of transaction status
    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: `🔍 Transaction Check - ${currentTime}`,
      html: `
        <h2>Transaction Check Report</h2>
        <p><strong>Time:</strong> ${currentTime}</p>
        <p><strong>Address Monitored:</strong> ${address}</p>
        <p><strong>Status:</strong> ${newTransactions.length > 0 ? 'New Transactions Found!' : 'No New Transactions'}</p>
        ${newTransactions.length > 0 ? `
          <h3>New Transactions:</h3>
          ${newTransactions.map(tx => formatTransactionDetails(tx)).join('<hr/>')}
        ` : `
          <p>No new transactions were found in this check. Monitoring continues...</p>
          <p>Monitoring Settings:</p>
          <ul>
            <li>ETH Transfers: ${MONITORING_CONFIG.ETH_TRANSFERS ? '✅' : '❌'}</li>
            <li>ERC20 Transfers: ${MONITORING_CONFIG.ERC20_TRANSFERS ? '✅' : '❌'}</li>
            <li>NFT Transfers: ${MONITORING_CONFIG.NFT_TRANSFERS ? '✅' : '❌'}</li>
            <li>Contract Interactions: ${MONITORING_CONFIG.CONTRACT_INTERACTIONS ? '✅' : '❌'}</li>
            <li>Incoming Only: ${MONITORING_CONFIG.INCOMING_ONLY ? '✅' : '❌'}</li>
          </ul>
        `}
      `,
    })
    console.log('Email sent successfully:', emailResponse)

    return res.status(200).json({ 
      message: 'Check completed and email sent',
      transactionsFound: newTransactions.length,
      response: emailResponse 
    })
  } catch (error) {
    console.error('Error in cron job:', error)
    return res.status(500).json({ message: 'Failed to process transactions', error: error.message })
  }
}

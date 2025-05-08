import type { NextApiRequest, NextApiResponse } from 'next'
import { Resend } from 'resend'
import { fetchTransactions, formatTransactionDetails } from '@/utils/transaction-monitor'
import { MonitoringConfig } from '@/types/transactions'

// Monitoring Configuration
const MONITORING_CONFIG: MonitoringConfig = {
  ETH_TRANSFERS: true,      // Monitor ETH transfers
  ERC20_TRANSFERS: true,    // Monitor ERC20 token transfers
  NFT_TRANSFERS: true,      // Monitor NFT transfers (ERC721/ERC1155)
  CONTRACT_INTERACTIONS: true, // Monitor general contract interactions
  INCOMING_ONLY: false      // If true, only monitor incoming transactions
}

const address = '0x705C053d69eB3B8aCc7C404690bD297700cCf169'
const apiKey = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY
const resendApiKey = process.env.RESEND_API_KEY
const toEmail = process.env.TO_EMAIL
const fromEmail = process.env.FROM_EMAIL
const cronSecret = process.env.CRON_SECRET

export const handler = async function handler(
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
    console.log('Fetching transactions for address:', address)
    const transactions = await fetchTransactions(address, apiKey, MONITORING_CONFIG)
    console.log('Recent transactions found:', transactions.length)
    
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

    // Only send email if transactions are found
    if (relevantTransactions.length > 0) {
      const resend = new Resend(resendApiKey)
      console.log('Sending email notification to:', toEmail)
      
      const emailResponse = await resend.emails.send({
        from: fromEmail,
        to: toEmail,
        subject: `🔍 New Transactions Found - ${currentTime}`,
        html: `
          <h2>Transaction Check Report</h2>
          <p><strong>Time:</strong> ${currentTime}</p>
          <p><strong>Address Monitored:</strong> ${address}</p>
          <h3>Recent Transactions:</h3>
          ${relevantTransactions.map(tx => formatTransactionDetails(tx)).join('')}
        `
      })
      console.log('Email sent successfully:', emailResponse)

      return res.status(200).json({ 
        message: 'New transactions found and email sent',
        transactionsFound: relevantTransactions.length,
        response: emailResponse 
      })
    }

    // If no transactions, just return success
    return res.status(200).json({ 
      message: 'Check completed, no recent transactions',
      transactionsFound: 0
    })

  } catch (error) {
    console.error('Error in cron job:', error)
    return res.status(500).json({ message: 'Failed to process transactions', error: error.message })
  }
}

// Default export for Vercel cron
export default handler

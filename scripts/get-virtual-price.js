#!/usr/bin/env node

/**
 * Script to read get_virtual_price from PulseChain contract
 * Contract: 0xE3acFA6C40d53C3faf2aa62D0a715C737071511c
 * Chain: PulseChain (369)
 * 
 * Usage: node scripts/get-virtual-price.js
 */

const { createPublicClient, http, formatUnits } = require('viem')
const { pulsechain } = require('viem/chains')

// Contract configuration
const CONTRACT_ADDRESS = '0xE3acFA6C40d53C3faf2aa62D0a715C737071511c'
const CHAIN_ID = 369

// Create public client for PulseChain
const client = createPublicClient({
  chain: pulsechain,
  transport: http('https://rpc.pulsechain.com') // Public PulseChain RPC
})

// ABI for get_virtual_price function (standard Curve pool function)
const CONTRACT_ABI = [
  {
    name: 'get_virtual_price',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256'
      }
    ]
  }
]

async function getVirtualPrice() {
  try {
    console.log('🔗 Connecting to PulseChain...')
    console.log(`📄 Contract: ${CONTRACT_ADDRESS}`)
    console.log(`⛓️  Chain ID: ${CHAIN_ID}`)
    console.log('')

    // Read the get_virtual_price function
    const result = await client.readContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'get_virtual_price',
    })

    // Format the result (typically returns value with 18 decimals)
    const formattedPrice = formatUnits(result, 18)
    
    console.log('✅ Virtual Price Retrieved:')
    console.log(`   Raw Value: ${result.toString()}`)
    console.log(`   Formatted: ${formattedPrice}`)
    console.log(`   Timestamp: ${new Date().toISOString()}`)

    // Return for potential use in other scripts
    return {
      raw: result.toString(),
      formatted: formattedPrice,
      timestamp: new Date().toISOString(),
      contractAddress: CONTRACT_ADDRESS,
      chainId: CHAIN_ID
    }

  } catch (error) {
    console.error('❌ Error reading virtual price:', error.message)
    
    if (error.message.includes('execution reverted')) {
      console.error('💡 Contract execution reverted - check if function exists or contract is valid')
    } else if (error.message.includes('network')) {
      console.error('💡 Network error - check RPC endpoint and internet connection')
    }
    
    process.exit(1)
  }
}

// Run the script if called directly
if (require.main === module) {
  getVirtualPrice()
    .then((result) => {
      console.log('\n📊 Result Summary:')
      console.log(JSON.stringify(result, null, 2))
    })
    .catch((error) => {
      console.error('Script failed:', error)
      process.exit(1)
    })
}

module.exports = { getVirtualPrice }

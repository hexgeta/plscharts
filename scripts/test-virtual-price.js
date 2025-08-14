#!/usr/bin/env node

/**
 * Test script for virtual price reader
 * Run this to verify the setup works before deploying to Vercel
 */

const { getVirtualPrice } = require('./get-virtual-price.js')

async function test() {
  console.log('🧪 Testing Virtual Price Reader...\n')
  
  try {
    const startTime = Date.now()
    const result = await getVirtualPrice()
    const duration = Date.now() - startTime
    
    console.log(`\n⏱️  Request took: ${duration}ms`)
    console.log('✅ Test PASSED - Script working correctly!')
    
    // Validate result structure
    if (!result.raw || !result.formatted || !result.timestamp) {
      throw new Error('Missing required fields in result')
    }
    
    // Validate data types
    if (isNaN(parseFloat(result.formatted))) {
      throw new Error('Formatted price is not a valid number')
    }
    
    console.log('✅ Data validation PASSED')
    
  } catch (error) {
    console.error('\n❌ Test FAILED:', error.message)
    console.error('\n🔧 Troubleshooting:')
    console.error('   1. Check internet connection')
    console.error('   2. Verify PulseChain RPC is accessible')
    console.error('   3. Confirm contract address is correct')
    console.error('   4. Ensure viem package is installed')
    process.exit(1)
  }
}

test()

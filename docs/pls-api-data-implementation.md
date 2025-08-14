# PLS API Data Implementation

This document describes the implementation of the PLS API data system for tracking the USDT/USDC/DAI PulseChain stable pool virtual price.

## Overview

The system fetches daily virtual price data from the PulseChain stable pool contract `0xE3acFA6C40d53C3faf2aa62D0a715C737071511c` and stores it in Supabase for use throughout the application.

## Components

### 1. Database Table

**File:** `supabase/migrations/create_pls_api_data_table.sql`

Creates the `pls_api_data` table with the following structure:

- `pool_address`: The stable pool contract address
- `chain_id`: PulseChain ID (369)
- `virtual_price_raw`: Raw virtual price as string (handles large numbers)
- `virtual_price_formatted`: Decimal version with 18 decimal precision
- `contract_address`: Same as pool_address
- `timestamp`: Exact collection time
- `date`: Date in YYYY-MM-DD format

### 2. Daily Cron Job

**File:** `app/api/cron/daily-pls-pool-data/route.ts`

- Runs daily at midnight UTC (configured in `vercel.json`)
- Calls the `get_virtual_price()` function on the stable pool contract
- Uses viem/wagmi for blockchain interactions
- Stores data in Supabase with upsert to prevent duplicates
- Includes comprehensive error handling and logging

### 3. Data Access API

**File:** `app/api/pls-pool-data/route.ts`

- RESTful endpoint to fetch historical PLS pool data
- Supports query parameters:
  - `limit`: Number of records to return (default 30)
  - `days`: Number of days to look back (default 30)
- Returns data sorted by timestamp (newest first)

### 4. React Hook

**File:** `hooks/crypto/usePlsApiData.ts`

- SWR-based hook for fetching PLS pool data
- Refreshes every hour
- Returns latest virtual price and last updated timestamp
- Includes error handling and loading states

### 5. Test Endpoint

**File:** `app/api/test-pls-pool/route.ts`

- Manual test endpoint to verify the virtual price call works
- Compares against hardcoded value for validation
- Useful for debugging and verification

### 6. Portfolio Integration

**File:** `components/Portfolio.tsx`

Updated the `getTokenPrice` function to:

- Use real-time PLS virtual price data when available
- Fallback to hardcoded price if API data unavailable
- Specifically handles the "USDT \/ USDC \/ DAI" LP token

## Usage

### Manual Testing

Test the virtual price call:

```bash
curl http://localhost:3000/api/test-pls-pool
```

### Cron Job Testing

The cron job can be tested manually by calling:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
     http://localhost:3000/api/cron/daily-pls-pool-data
```

### Data Fetching

Fetch historical data:

```bash
curl http://localhost:3000/api/pls-pool-data?days=7&limit=10
```

## Configuration

### Environment Variables

Required for the cron job:

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for database writes
- `CRON_SECRET`: Secret for authenticating cron requests

### Cron Schedule

The cron job runs daily at midnight UTC:

```json
{
  "path": "/api/cron/daily-pls-pool-data",
  "schedule": "0 0 * * *"
}
```

## Current Implementation Status

✅ **Completed:**

- Database table created
- Daily cron job implemented
- API endpoints for data access
- React hook for frontend integration
- Portfolio component integration
- Test endpoint for verification

🔧 **Testing Results:**

- Virtual price API call working: `1.080504894956859409`
- Close to hardcoded value: `1.080501437346006612`
- Difference: ~0.000003457590852797 (minimal)

## Next Steps

1. **Deploy to Production:**

   - Run the Supabase migration to create the table
   - Deploy the cron job to Vercel
   - Verify cron job runs successfully

2. **Monitor Performance:**

   - Check cron job logs for successful execution
   - Monitor API response times
   - Verify data accuracy over time

3. **Optional Enhancements:**
   - Add alerts for failed cron jobs
   - Implement data validation checks
   - Add historical price charts
   - Create admin dashboard for monitoring

## Contract Information

- **Pool Address:** `0xE3acFA6C40d53C3faf2aa62D0a715C737071511c`
- **Chain:** PulseChain (369)
- **Function:** `get_virtual_price()`
- **Returns:** Virtual price as uint256 (18 decimals)
- **Pool Type:** USDT/USDC/DAI stable pool

## Error Handling

The system includes comprehensive error handling for:

- Network connectivity issues
- Contract execution failures
- Database connection problems
- Data validation errors
- Rate limiting and timeouts

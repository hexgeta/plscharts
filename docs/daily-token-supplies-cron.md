# Daily Token Supplies Cron Job

This cron job runs daily at midnight UTC to collect total supply data for all tokens defined in `TOKEN_CONSTANTS` and stores the data in a Supabase table.

## Setup

### 1. Environment Variables

Make sure these environment variables are set in your Vercel project:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CRON_SECRET=your_cron_secret_key
```

### 2. Database Setup

Run the migration to create the required table:

```sql
-- Run this in your Supabase SQL editor
-- File: supabase/migrations/create_daily_token_supplies_table.sql
```

### 3. Vercel Cron Configuration

The cron job is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-token-supplies",
      "schedule": "0 0 * * *"
    }
  ]
}
```

## How It Works

### Data Collection Process

1. **Token Filtering**: Filters `TOKEN_CONSTANTS` to exclude native tokens (`0x0` addresses)
2. **Batch Processing**: Processes tokens in batches of 10 to avoid overwhelming RPC endpoints
3. **RPC Calls**: Uses the same G4MM4 RPC endpoints as the airdrop page:
   - Ethereum: `https://rpc-ethereum.g4mm4.io`
   - PulseChain: `https://rpc-pulsechain.g4mm4.io`
4. **Supply Fetching**: Calls the ERC-20 `totalSupply()` function for each token
5. **Data Storage**: Saves both raw and formatted supply data to Supabase

### Data Structure

Each record contains:

- `ticker`: Token symbol (e.g., "PLS", "HEX", "MAXI")
- `chain`: Blockchain ID (1 = Ethereum, 369 = PulseChain)
- `address`: Token contract address
- `name`: Full token name
- `decimals`: Number of decimal places
- `total_supply`: Raw supply as string (handles very large numbers)
- `total_supply_formatted`: Human-readable supply (divided by 10^decimals)
- `timestamp`: Exact collection time
- `date`: Date in YYYY-MM-DD format

### Error Handling

- Failed token fetches are logged but don't stop the process
- Tokens with failed fetches get recorded with `0` supply
- Batch processing with delays prevents RPC rate limiting
- Unique constraints prevent duplicate daily entries

## Usage Examples

### Query Latest Supplies

```sql
SELECT ticker, total_supply_formatted, date
FROM daily_token_supplies
WHERE date = CURRENT_DATE
ORDER BY total_supply_formatted DESC;
```

### Track Supply Changes Over Time

```sql
SELECT
  ticker,
  date,
  total_supply_formatted,
  LAG(total_supply_formatted) OVER (PARTITION BY ticker ORDER BY date) as previous_supply,
  total_supply_formatted - LAG(total_supply_formatted) OVER (PARTITION BY ticker ORDER BY date) as daily_change
FROM daily_token_supplies
WHERE ticker = 'PLS'
ORDER BY date DESC
LIMIT 30;
```

### Get Supply History for Multiple Tokens

```sql
SELECT ticker, date, total_supply_formatted
FROM daily_token_supplies
WHERE ticker IN ('PLS', 'HEX', 'PLSX')
  AND date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY ticker, date DESC;
```

## Manual Testing

You can manually trigger the cron job for testing:

```bash
curl -X GET "https://your-domain.vercel.app/api/cron/daily-token-supplies" \
  -H "Authorization: Bearer your_cron_secret"
```

## Monitoring

The cron job returns a summary with:

- Total tokens processed
- Successful vs failed fetches
- Combined total supply across all tokens
- Execution timestamp

Check Vercel function logs for detailed execution information and any errors.

## Performance Notes

- Processes ~200+ tokens in batches of 10
- Each batch has a 1-second delay between requests
- Total execution time: ~2-3 minutes
- Uses BigInt to handle very large token supplies accurately
- Stores raw supply as text to prevent precision loss

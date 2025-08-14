# Virtual Price Reader Script

This script reads the `get_virtual_price` function from a PulseChain contract using wagmi/viem.

## Setup

1. **Install dependencies** (if not already installed):

```bash
npm install viem
```

2. **Make script executable**:

```bash
chmod +x scripts/get-virtual-price.js
```

## Usage

### Local Testing

```bash
node scripts/get-virtual-price.js
```

### Expected Output

```
🔗 Connecting to PulseChain...
📄 Contract: 0xE3acFA6C40d53C3faf2aa62D0a715C737071511c
⛓️  Chain ID: 369

✅ Virtual Price Retrieved:
   Raw Value: 1005234567890123456789
   Formatted: 1005.234567890123456789
   Timestamp: 2024-01-15T10:30:45.123Z

📊 Result Summary:
{
  "raw": "1005234567890123456789",
  "formatted": "1005.234567890123456789",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "contractAddress": "0xE3acFA6C40d53C3faf2aa62D0a715C737071511c",
  "chainId": 369
}
```

## Vercel Cron Setup

### 1. Create API Route

Create `pages/api/cron/virtual-price.js`:

```javascript
import { getVirtualPrice } from "../../../scripts/get-virtual-price.js";

export default async function handler(req, res) {
  // Verify cron request (optional security)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await getVirtualPrice();

    // Log to Vercel logs
    console.log("Virtual Price Cron Result:", result);

    // Optional: Store in database, send to webhook, etc.

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Virtual Price Cron Error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
```

### 2. Add to vercel.json

```json
{
  "crons": [
    {
      "path": "/api/cron/virtual-price",
      "schedule": "0 */1 * * *"
    }
  ]
}
```

### 3. Environment Variables

Add to Vercel environment variables:

- `CRON_SECRET`: Random secret for cron authentication

## Configuration

### RPC Endpoints

The script uses the public PulseChain RPC. For production, consider:

- `https://rpc.pulsechain.com` (public)
- `https://rpc-pulsechain.g4mm4.io` (alternative)
- Your own RPC endpoint for reliability

### Function ABI

The script includes the standard Curve pool `get_virtual_price` ABI. If the contract uses a different signature, update the ABI in the script.

## Troubleshooting

### Common Errors

- **"execution reverted"**: Function doesn't exist or contract invalid
- **"network error"**: RPC endpoint issues or internet connectivity
- **"invalid address"**: Check contract address format

### Testing Contract

Verify the contract has the function:

```bash
# Check on PulseChain explorer
https://scan.pulsechain.com/address/0xE3acFA6C40d53C3faf2aa62D0a715C737071511c
```

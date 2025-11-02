# Aptos Smart Contract Deployment Guide

## Prerequisites

1. **Install Aptos CLI**
```bash
# Windows (PowerShell)
iwr "https://aptos.dev/scripts/install_cli.py" -useb | Select-Object -ExpandProperty Content | python3

# Verify installation
aptos --version
```

2. **Get Testnet Tokens**
- Install Petra Wallet: https://petra.app
- Create account
- Get testnet APT from faucet

## Deployment Steps

### 1. Initialize Aptos Profile

```bash
cd aptos
aptos init --network devnet
```

This will:
- Generate a new private key
- Create `.aptos/config.yaml`
- Fund your account with testnet APT

**Save your private key securely!**

### 2. Update Contract Address

Edit `aptos/Move.toml`:
```toml
[addresses]
genome_guard = "_"  # Replace with your address from step 1
```

Or use named addresses during deploy:
```bash
# Your address from aptos init
export DEPLOYER_ADDRESS=0x123abc...
```

### 3. Compile Contract

```bash
cd aptos
aptos move compile --named-addresses genome_guard=$DEPLOYER_ADDRESS
```

Expected output:
```
Compiling, may take a little while to download git dependencies...
INCLUDING DEPENDENCY AptosFramework
INCLUDING DEPENDENCY AptosStdlib
INCLUDING DEPENDENCY MoveStdlib
BUILDING GenomeGuard
Success!
```

### 4. Test Contract (Optional but Recommended)

```bash
aptos move test --named-addresses genome_guard=$DEPLOYER_ADDRESS
```

### 5. Publish Contract

```bash
aptos move publish \
  --named-addresses genome_guard=$DEPLOYER_ADDRESS \
  --assume-yes
```

**Important:** Save the transaction hash and module address!

### 6. Verify Deployment

Check on Aptos Explorer:
```
https://explorer.aptoslabs.com/account/$DEPLOYER_ADDRESS?network=devnet
```

You should see:
- Module: `genome_guard::privacy_analysis`
- Functions: initialize, request_analysis, submit_results, etc.

### 7. Initialize Platform

```bash
aptos move run \
  --function-id $DEPLOYER_ADDRESS::privacy_analysis::initialize \
  --args address:$DEPLOYER_ADDRESS \
  --assume-yes
```

This creates the Platform resource at your account.

### 8. Verify Initialization

```bash
aptos account list --account $DEPLOYER_ADDRESS
```

You should see:
```
Resource: 0x<your_address>::privacy_analysis::Platform
```

## Configuration

### Backend (.env)

Add these variables:
```env
# Aptos Configuration
APTOS_NODE_URL=https://fullnode.devnet.aptoslabs.com
APTOS_FAUCET_URL=https://faucet.devnet.aptoslabs.com
APTOS_OPERATOR_ADDRESS=0x123abc...  # Your deployer address
APTOS_OPERATOR_PRIVATE_KEY=0x456def...  # Your private key
CONTRACT_ADDRESS=0x123abc...  # Same as operator address for now
```

### Frontend (.env)

Create `web/.env`:
```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_APTOS_NODE_URL=https://fullnode.devnet.aptoslabs.com
REACT_APP_APTOS_FAUCET_URL=https://faucet.devnet.aptoslabs.com
REACT_APP_CONTRACT_ADDRESS=0x123abc...  # Your deployed contract address
REACT_APP_PINATA_API_KEY=your_pinata_key  # Get from pinata.cloud
REACT_APP_PINATA_SECRET_KEY=your_pinata_secret
```

## Testing the Contract

### Test Request Analysis

```bash
# User requests analysis
aptos move run \
  --function-id $DEPLOYER_ADDRESS::privacy_analysis::request_analysis \
  --args string:"QmTestHashABC123..." \
  --assume-yes
```

### Test Submit Results

```bash
# Operator submits results
aptos move run \
  --function-id $DEPLOYER_ADDRESS::privacy_analysis::submit_results \
  --args u64:1 string:"QmResultHashXYZ789..." \
  --assume-yes
```

### Query Analysis Status

```bash
aptos move view \
  --function-id $DEPLOYER_ADDRESS::privacy_analysis::get_analysis_status \
  --args u64:1
```

Expected output:
```json
{
  "Result": [2]  // 0=PENDING, 1=PROCESSING, 2=COMPLETED, 3=FAILED
}
```

### Query Total Analyses

```bash
aptos move view \
  --function-id $DEPLOYER_ADDRESS::privacy_analysis::get_total_analyses
```

## Troubleshooting

### Error: "Module already exists"

Solution: Use `--upgrade-policy compatible` flag:
```bash
aptos move publish \
  --named-addresses genome_guard=$DEPLOYER_ADDRESS \
  --upgrade-policy compatible \
  --assume-yes
```

### Error: "Insufficient gas"

Solution: Get more testnet APT:
```bash
aptos account fund-with-faucet --account $DEPLOYER_ADDRESS
```

### Error: "Unable to find package manifest"

Solution: Make sure you're in the `aptos/` directory with `Move.toml`.

### Error: "Address must be a valid hex string"

Solution: Ensure your address starts with `0x`:
```bash
export DEPLOYER_ADDRESS=0x$(cat .aptos/config.yaml | grep account | cut -d: -f2 | tr -d ' ')
```

## Mainnet Deployment

**⚠️ WARNING: Only deploy to mainnet after thorough testing!**

### 1. Switch to Mainnet

```bash
aptos init --network mainnet
```

### 2. Fund Account with Real APT

Purchase APT from an exchange and send to your address.

### 3. Deploy

```bash
aptos move publish \
  --named-addresses genome_guard=$DEPLOYER_ADDRESS \
  --network mainnet \
  --assume-yes
```

### 4. Update Frontend

```env
REACT_APP_APTOS_NODE_URL=https://fullnode.mainnet.aptoslabs.com
REACT_APP_CONTRACT_ADDRESS=0x...  # New mainnet address
```

## Monitoring & Maintenance

### View Recent Transactions

```bash
aptos account list --account $DEPLOYER_ADDRESS
```

### Check Platform Stats

```bash
aptos move view \
  --function-id $DEPLOYER_ADDRESS::privacy_analysis::get_total_analyses
```

### Monitor Events

Use Aptos Indexer or build custom event listener:
```typescript
import { AptosClient } from "aptos";

const client = new AptosClient("https://fullnode.devnet.aptoslabs.com");

// Poll for events
const events = await client.getEventsByEventHandle(
  contractAddress,
  `${contractAddress}::privacy_analysis::AnalysisRequestedEvent`,
  "analysis_requested_events"
);
```

## Security Checklist

Before mainnet deployment:

- [ ] Audit smart contract code
- [ ] Test all functions with various inputs
- [ ] Verify access control (only operator can submit results)
- [ ] Test payment and refund logic
- [ ] Validate event emissions
- [ ] Test error handling
- [ ] Review gas costs
- [ ] Secure private key storage
- [ ] Set up monitoring alerts
- [ ] Document upgrade strategy

## Support

- **Aptos Discord:** https://discord.gg/aptoslabs
- **Aptos Docs:** https://aptos.dev
- **Move Book:** https://move-language.github.io/move/

---

**Next Steps:**
1. Deploy contract to devnet
2. Test with frontend
3. Run end-to-end workflow
4. Submit bounty with contract address!

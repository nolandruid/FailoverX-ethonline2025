# Troubleshooting Guide

## Common Issues and Solutions

### Issue: Transactions Failing with "Intent not pending"

**Symptoms:**
- Console shows `❌ Failed to execute intent: Error: transaction failed`
- Transaction receipt has `"status":0` (failed)
- Error message: "Intent not pending"

**Cause:**
The monitoring service tried to execute an intent that was already executed or has expired.

**Solution (FIXED):**
- Monitoring service now removes successfully executed intents from tracking
- Detects "already executed" errors and stops retrying
- No action needed - this is now handled automatically

---

### Issue: Wrong Network / Mainnet Balance Showing

**Symptoms:**
- UI shows "Ethereum Mainnet" instead of "Sepolia Testnet"
- Balance shows 0.0000 ETH or mainnet balance
- MetaMask shows wrong network

**Solution (FIXED):**
1. App now automatically switches to Sepolia on connect
2. Red warning banner appears if on wrong network
3. Click "Switch to Sepolia" button to manually switch

**Manual Steps:**
1. Open MetaMask
2. Click network dropdown
3. Select "Sepolia test network"
4. Refresh the page

---

### Issue: Contract Not Initialized

**Symptoms:**
- Console shows `❌ No contract address configured for chain`
- Transactions fail immediately

**Solution (FIXED):**
- App now has built-in contract addresses for all supported chains
- Sepolia: `0x43D8e9cdDEb55eee3a1B3D5825C2E467C3616E6F`
- Arbitrum Sepolia: `0x43D8e9cdDEb55eee3a1B3D5825C2E467C3616E6F`
- Optimism Sepolia: `0x3Da2d0995F2016e02890A5d51B6A5D0Cf6239649`
- Hedera: `0x43D8e9cdDEb55eee3a1B3D5825C2E467C3616E6F`

**Optional - Set Environment Variable:**
Create `frontend/.env` file:
```bash
VITE_SMART_TRANSACTION_SCHEDULER_ADDRESS=0x43D8e9cdDEb55eee3a1B3D5825C2E467C3616E6F
VITE_VINCENT_APP_ID=1339828260
```

---

### Issue: Max Execution Attempts Reached

**Symptoms:**
- Console shows `⚠️ Max execution attempts reached for intent: X`
- Intent tried 3 times and failed

**Causes:**
1. **Intent already executed** - Another process executed it first
2. **Deadline expired** - Intent passed its deadline timestamp
3. **Insufficient funds** - Not enough ETH/tokens in contract
4. **Contract error** - Logic error in the contract

**What Happens:**
- System stops trying after 3 attempts (configurable)
- Intent is marked as FAILED
- Removed from monitoring queue

**How to Check:**
1. Look at the transaction hash in console
2. Check on Etherscan: `https://sepolia.etherscan.io/tx/[TX_HASH]`
3. View the error reason in the transaction details

---

### Issue: getUserIntents TypeError

**Symptoms:**
- `TypeError: Cannot read properties of undefined (reading 'toString')`
- Monitoring fails to start

**Solution (FIXED):**
- Added null checks for all intent fields
- Handles missing `executedAt` field (not tracked by contract)
- Gracefully skips malformed intents

---

## Understanding the Monitoring Flow

### Normal Flow (Success)
```
1. Start Monitoring
   ↓
2. Poll every 10 seconds
   ↓
3. Detect PENDING intent
   ↓
4. Vincent AI analyzes gas prices
   ↓
5. PKP signs and executes
   ↓
6. Transaction succeeds
   ↓
7. Intent removed from monitoring
   ↓
8. Continue monitoring for new intents
```

### Error Flow (Retry)
```
1. Execution attempt #1 fails
   ↓
2. Intent stays in monitoring
   ↓
3. Wait 10 seconds (next poll)
   ↓
4. Execution attempt #2
   ↓
5. Still fails
   ↓
6. Execution attempt #3
   ↓
7. Max attempts reached
   ↓
8. Intent marked FAILED
   ↓
9. Removed from monitoring
```

---

## Monitoring Configuration

Default settings (can be changed):
```typescript
{
  pollInterval: 10000,        // Check every 10 seconds
  maxExecutionAttempts: 3,    // Try up to 3 times
  autoExecute: true,          // Execute automatically
  usePKP: true                // Use PKP for signing
}
```

---

## Checking Transaction Status

### On Sepolia Etherscan
1. Copy transaction hash from console
2. Visit: `https://sepolia.etherscan.io/tx/[TX_HASH]`
3. Check:
   - **Status:** Success (green) or Failed (red)
   - **Logs:** Event emissions from contract
   - **Input Data:** Function called and parameters

### Success Indicators
- ✅ Green checkmark
- `Status: Success`
- `IntentExecuted` event in logs
- `IntentStatusUpdated` event showing COMPLETED

### Failure Indicators
- ❌ Red X
- `Status: Fail`
- Error reason in transaction details
- No `IntentExecuted` event

---

## Best Practices

### Creating Intents
1. **Use small amounts for testing** (0.001 ETH)
2. **Set reasonable deadline** (1 hour from now)
3. **Include valid recipient address**
4. **Ensure you have enough ETH for gas**

### Monitoring
1. **Start monitoring AFTER creating intent**
2. **Watch console logs** for execution status
3. **Stop monitoring** when done testing
4. **Clear browser cache** if seeing stale data

### Debugging
1. **Check network** - Must be on Sepolia
2. **Check balance** - Need ETH for gas
3. **Check console** - Look for error messages
4. **Check Etherscan** - View actual transaction
5. **Check contract** - Verify correct address

---

## Environment Setup Checklist

- [ ] MetaMask installed
- [ ] Connected to Sepolia testnet
- [ ] Have Sepolia ETH (get from faucet)
- [ ] Frontend running (`npm run dev`)
- [ ] Browser console open (F12)
- [ ] Correct contract address configured

---

## Getting Help

### Useful Console Commands

**Check current chain:**
```javascript
await window.ethereum.request({ method: 'eth_chainId' })
// Should return: "0xaa36a7" (Sepolia = 11155111)
```

**Check contract address:**
```javascript
smartContractService.getContractAddress()
```

**Check PKP status:**
```javascript
pkpExecutionService.isReady()
```

**Check monitoring status:**
```javascript
intentMonitoringService.isActive()
```

---

## Known Limitations (Demo)

1. **PKP signing is mocked** - Real signing not implemented yet
2. **Only TRANSFER action works** - SWAP and CONTRACT_CALL not implemented
3. **No cross-chain bridging yet** - Failover chains logged but not executed
4. **Manual gas price input** - No real-time gas oracle integration
5. **Polling-based monitoring** - No websocket/event subscription

These are expected for the hackathon demo and don't affect the core functionality demonstration.

## Partner Prize Requirements & Integration Strategy

## 1. Avail ($10,000 - Primary Target)

**Prize tracks:**

- **Best DeFi or Payments App using Avail Nexus SDK** ($5,000)
- **Build Unchained Apps with Avail Nexus SDK** ($5,000)

**Requirements:**[ethglobal](https://ethglobal.com/events/ethonline2025/prizes)

- Must use Avail Nexus SDK for cross-chain operations
- Demonstrate "unchained" experience (chain abstraction)
- Deploy on Avail testnet or mainnet
- Show clear value proposition for cross-chain payments/DeFi

**How you win:**

- Your core value prop IS cross-chain failover - perfect fit
- Nexus SDK handles bridging and unified balances automatically
- Users don't think about chains - just "retry on better chain"
- DeFi use case: swap fails on Ethereum → auto-retry on Base

**Integration checklist:**

- [ ]  Install Avail Nexus SDK
- [ ]  Create unified balance view across chains
- [ ]  Implement cross-chain transaction routing
- [ ]  Build fallback logic: Primary chain fails → query Nexus for cheaper alternative
- [ ]  Show gas savings in UI from chain switching

---

## 2. Lit Protocol/Vincent ($5,000)

**Prize track:** Best use of Vincent for DeFi applications with automated transactions

**Requirements:**[ethglobal](https://ethglobal.com/events/ethonline2025/prizes)

- Use Lit Protocol's Vincent for programmable key pairs (PKPs)
- Implement automated transaction execution
- Demonstrate delegation of signing authority

**How you win:**

- Vincent handles automated retry logic - user delegates permission once
- Programmable wallets execute fallback without user re-signing
- Perfect for "set it and forget it" scheduled transactions

**Integration checklist:**

- [ ]  Set up Lit Protocol PKP (programmable key pair)
- [ ]  User delegates transaction signing authority to your smart automation
- [ ]  PKP monitors primary transaction status
- [ ]  On failure, PKP automatically executes fallback transaction
- [ ]  Show "gasless retry" - user only approves once

---

## 3. Hedera ($10,000)

**Prize tracks:**

- **Best use of Hedera with Bridges or Oracles for DeFi** ($5,000)
- **Best DeFi Application Integrating with Vincent on Hedera** ($5,000)

**Requirements:**[ethglobal](https://ethglobal.com/events/ethonline2025/prizes)

- Integrate Hedera network as execution layer
- Use Hedera's fast finality (3-5 seconds) and low fees ($0.0001)
- Show bridge or oracle integration
- Combine with Vincent if possible (bonus points)

**How you win:**

- Hedera is your "ultimate fallback" - fastest and cheapest
- When Ethereum/Base fail → route to Hedera
- Use Hedera bridge to move assets quickly
- Vincent + Hedera combo = automated execution on fast finality chain

**Integration checklist:**

- [ ]  Deploy contracts on Hedera testnet
- [ ]  Integrate Hedera JSON-RPC API
- [ ]  Set up bridge from Ethereum/Base to Hedera
- [ ]  Benchmark transaction speed (show 3-5 sec vs. 12+ sec on Ethereum)
- [ ]  Demonstrate cost savings ($0.0001 vs $5+ on Ethereum)

---

## Technical Architecture

## System Flow

`text1. User initiates transaction (e.g., "Swap 100 USDC for ETH")
2. Your system:
   a. Checks current gas prices on all supported chains (Ethereum, Base, Polygon, Hedera)
   b. Estimates success probability based on slippage, congestion
   c. Selects optimal chain (price + speed)
3. Primary transaction submitted
4. Monitor transaction status:
   - SUCCESS → Notify user, job done
   - PENDING (10+ seconds) → Check if cheaper alternative available
   - FAILED → Trigger failover
5. Failover logic:
   a. Use Avail Nexus to bridge assets to alternative chain
   b. Vincent PKP auto-executes transaction on new chain
   c. User gets notification: "Primary failed, succeeded on Hedera"
6. Gas refund (if applicable): Return unused gas fees`

## Tech Stack

**Frontend:**

- Vite/React
- Tailwind CSS
- RainbowKit or WalletConnect for wallet connection
- React Query for state management

**Smart Contracts:**

- Solidity 0.8.20+
- Transaction scheduler contract (stores user intents)
- Failover router contract (handles cross-chain routing)
- Deploy on: Ethereum Sepolia, Base Sepolia, Polygon Mumbai, Hedera Testnet

**Backend/Automation:**

- Lit Protocol PKP for automated execution
- Avail Nexus SDK for cross-chain bridging
- Hedera SDK for fast finality transactions
- Gelato or Chainlink Automation (optional) for monitoring

**Monitoring:**

- Blockscout SDK for transaction tracking UI
- Alchemy/Infura for RPC calls
- Gas price oracles (Etherscan API, Polygonscan API)

**Storage:**

- Lighthouse for transaction history (optional - if time permits)

## Day 1 (Monday, Oct 20) - Foundation & Research

**Total: 6 hours**

**Developer A (3 hours):**

- [ ]  **Hour 1:** Set up Vite + React project, install dependencies (Avail SDK, Lit SDK, Hedera SDK, RainbowKit)
- [ ]  **Hour 2:** Create basic UI: wallet connect, transaction form (amount, token, action)
- [ ]  **Hour 3:** Integrate Avail Nexus SDK - test unified balance query across chains

**Developer B (3 hours):**

- [ ]  **Hour 1:** Research Lit Protocol Vincent documentation, set up PKP creation flow
- [ ]  **Hour 2:** Write basic Solidity scheduler contract (stores transaction intents)
- [ ]  **Hour 3:** Set up Hedera testnet account, get test HBAR, deploy hello-world contract

**Evening checkpoint:** Can we connect wallet, display balances, and create PKP?

---

## Day 2 (Tuesday, Oct 21) - Core Smart Contracts & Cross-Chain Logic

**Total: 6 hours**

**Developer A (3 hours):**

- [ ]  **Hour 1:** Build gas price monitoring module (query Ethereum, Base, Polygon, Hedera gas prices)
- [ ]  **Hour 2:** Implement chain selection algorithm (cheapest + fastest available)
- [ ]  **Hour 3:** Create transaction simulation endpoint (estimate success probability)

**Developer B (3 hours):**

- [ ]  **Hour 1:** Complete scheduler contract with events (TransactionScheduled, TransactionExecuted, TransactionFailed)
- [ ]  **Hour 2:** Write failover router contract (cross-chain bridge logic)
- [ ]  **Hour 3:** Deploy contracts to Sepolia, Base Sepolia, Hedera testnet, verify on Blockscout

**Evening checkpoint:** Can we schedule a transaction and query gas prices across chains?

---

## Day 3 (Wednesday, Oct 22) - Automation & Failover Logic

**Total: 6 hours**

**Developer A (3 hours):**

- [ ]  **Hour 1:** Integrate Vincent PKP with transaction execution (delegate signing)
- [ ]  **Hour 2:** Build monitoring service: watch pending transactions, detect failures
- [ ]  **Hour 3:** Implement failover trigger: on failure → bridge via Avail → execute on backup chain

**Developer B (3 hours):**

- [ ]  **Hour 1:** Build Hedera integration: bridge assets from Ethereum → Hedera
- [ ]  **Hour 2:** Test full failover flow: Ethereum (simulated failure) → Hedera (success)
- [ ]  **Hour 3:** Add Blockscout SDK widget to show transaction status in UI

**Evening checkpoint:** Can we trigger a failover and see it complete on Hedera?

---

## Day 4 (Thursday, Oct 23) - UI Polish & Testing

**Total: 6 hours**

**Developer A (3 hours):**

- [ ]  **Hour 1:** Build transaction history page showing: attempted chain, result, fallback chain, gas saved
- [ ]  **Hour 2:** Add real-time notifications (toast alerts for tx status changes)
- [ ]  **Hour 3:** Create dashboard: total transactions, success rate, gas savings, chains used

**Developer B (3 hours):**

- [ ]  **Hour 1:** End-to-end testing on all chains (Ethereum, Base, Polygon, Hedera)
- [ ]  **Hour 2:** Write test scenarios: successful tx, failed tx with failover, gas spike detection
- [ ]  **Hour 3:** Bug fixes and edge case handling

**Evening checkpoint:** Full demo flow working end-to-end?

---

## Day 5 (Friday, Oct 24) - Demo Video & Documentation

**Total: 6 hours**

**Developer A (3 hours):**

- [ ]  **Hour 1:** Deploy frontend to Vercel, ensure all API keys configured
- [ ]  **Hour 2:** Write README: project description, architecture diagram, how to run
- [ ]  **Hour 3:** Record demo video Part 1: Problem explanation, solution overview

**Developer B (3 hours):**

- [ ]  **Hour 1:** Record demo video Part 2: Live demo (schedule tx → simulate failure → show failover)
- [ ]  **Hour 2:** Edit demo video (aim for 2-3 minutes, clear and concise)
- [ ]  **Hour 3:** Submit project: upload video, fill out partner prize selections (Avail, Vincent, Hedera)

**Evening checkpoint:** Project submitted, demo video uploaded!
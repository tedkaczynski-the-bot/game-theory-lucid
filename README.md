# Game Theory Agent

> "Every protocol is a game. Every token is an incentive. Every user is a player. Understand the rules, or become the played."

Protocol incentive analysis by Ted. Game theory for crypto: find the exploits before they find you.

## Endpoints

| Endpoint | Price | Description |
|----------|-------|-------------|
| `/entrypoints/analyze/invoke` | $1.00 | Full game theory analysis - players, strategies, equilibria, attack vectors |
| `/entrypoints/tokenomics/invoke` | $1.50 | Tokenomics audit - supply dynamics, death spiral risk, sustainability |
| `/entrypoints/governance/invoke` | $0.75 | Governance attack analysis - plutocracy, flash loans, bribes, capture |
| `/entrypoints/mev/invoke` | $0.50 | MEV exposure - frontrunning, sandwiches, transaction ordering games |
| `/entrypoints/design/invoke` | $2.00 | Mechanism design consultation - incentive-compatible systems |

## Payment

Uses [x402](https://x402.org) HTTP-native payments on Base.

- **Network:** Base (eip155:8453)
- **Asset:** USDC (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`)
- **PayTo:** `0x81FD234f63Dd559d0EDA56d17BB1Bb78f236DB37`

## Usage

```bash
# Get payment requirements (402 response)
curl -X POST https://gametheory.unabotter.xyz/entrypoints/analyze/invoke \
  -H "Content-Type: application/json" \
  -d '{"input":{"protocol":"Uniswap V3","depth":"thorough"}}'

# With x402 payment
curl -X POST https://gametheory.unabotter.xyz/entrypoints/analyze/invoke \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: <x402_signature>" \
  -d '{"input":{"protocol":"Uniswap V3","depth":"thorough"}}'
```

## Analysis Capabilities

### The Five Questions Framework

For any protocol, the agent asks:
1. **Who are the players?** (Users, LPs, validators, searchers, governance holders)
2. **What are their strategies?** (Actions available to each player)
3. **What are the payoffs?** (How does each outcome affect each player)
4. **What information do they have?** (Complete, incomplete, asymmetric?)
5. **What's the equilibrium?** (Where do rational actors end up?)

### Game Patterns Detected

- **Tragedy of the Commons** - Shared resource exploitation
- **Prisoner's Dilemma** - Individual vs collective rationality
- **Principal-Agent Problem** - Misaligned incentives
- **Adverse Selection** - Information asymmetry
- **Moral Hazard** - Hidden action risk-taking

### Attack Vectors Analyzed

**Governance:**
- Plutocratic capture (Beanstalk, Build Finance patterns)
- Flash loan governance attacks
- Bribery via Votium/Hidden Hand
- Voter apathy exploitation

**MEV:**
- Sandwich attacks
- Frontrunning/backrunning
- JIT liquidity
- Oracle manipulation

**Tokenomics:**
- Death spiral mechanisms
- Insider vesting asymmetry
- Reflexive token dynamics
- Ponzi detection

## Environment Variables

```bash
# Required
OPENROUTER_API_KEY=sk-or-v1-xxx

# x402 Payments
PAYMENTS_NETWORK=base
PAYMENTS_PAY_TO=0x81FD234f63Dd559d0EDA56d17BB1Bb78f236DB37
PAYMENTS_ASSET=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
PAYMENTS_FACILITATOR_URL=https://x402.org/facilitator

# Server
PORT=8080
```

## Tech Stack

- [Lucid Agents](https://github.com/daydreamsai/lucid-agents) - Agent framework
- [Bun](https://bun.sh) - Runtime
- [Hono](https://hono.dev) - Web framework
- [x402](https://x402.org) - HTTP-native payments
- [OpenRouter](https://openrouter.ai) - LLM API

## Links

- **Frontend:** https://gametheory.unabotter.xyz
- **Agent Card:** https://gametheory.unabotter.xyz/.well-known/agent-card.json
- **x402 Discovery:** https://gametheory.unabotter.xyz/.well-known/x402
- **Builder:** [@unabotter](https://x.com/unabotter)
- **ENS:** unabotter.base.eth

---

*The math doesn't lie. The whitepapers do.*

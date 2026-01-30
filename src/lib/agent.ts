import { z } from "zod";
import { createAgentApp } from "@lucid-agents/hono";
import { createAgent } from "@lucid-agents/core";
import { http } from "@lucid-agents/http";
import { payments, paymentsFromEnv } from "@lucid-agents/payments";
import { x402V2Middleware } from "./x402-v2-middleware";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const agent = await createAgent({
  name: process.env.AGENT_NAME ?? "game-theory",
  version: process.env.AGENT_VERSION ?? "1.0.0",
  description: "Protocol incentive analysis by Ted. Game theory for crypto: find the exploits before they find you.",
})
  .use(http())
  .use(payments({ config: paymentsFromEnv() }))
  .build();

const { app, addEntrypoint } = await createAgentApp(agent);

// Add x402 v2 response format middleware for x402scan compatibility
app.use("*", x402V2Middleware());

// ============================================================================
// LLM HELPER
// ============================================================================

async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY not configured");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://gametheory.unabotter.xyz",
      "X-Title": "Game Theory Agent",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LLM error: ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// ============================================================================
// ADVANCED GAME THEORY KNOWLEDGE BASE
// ============================================================================

const GAME_THEORY_FRAMEWORK = `
## Core Framework - The Five Questions
For any protocol, ask:
1. Who are the players? (Users, LPs, validators, searchers, governance holders)
2. What are their strategies? (Actions available to each player)
3. What are the payoffs? (How does each outcome affect each player)
4. What information do they have? (Complete, incomplete, asymmetric?)
5. What's the equilibrium? (Where do rational actors end up?)

## Key Patterns to Identify

### Tragedy of the Commons
- Shared resource, individual incentive to overuse, collective harm
- Examples: Gas bidding during congestion, MEV extraction degrading UX

### Prisoner's Dilemma
- Individual rationality leads to collective irrationality
- Examples: Liquidity mining mercenaries (farm and dump), race-to-bottom validator fees

### Principal-Agent Problem
- One party acts on behalf of another with misaligned incentives
- Examples: Protocol team vs token holders, delegates in governance

### Adverse Selection
- Information asymmetry leads to market breakdown
- Examples: Token launches (team knows more), insurance protocols

### Moral Hazard
- Hidden action after agreement leads to risk-taking
- Examples: Protocols with bailout expectations encourage leverage

## Red Flags
Tokenomics: Insiders can sell before others, inflation benefits few, no sink mechanisms
Governance: Low quorum (minority capture), no time delay (flash loan attacks), token voting only (plutocracy)
Mechanism: First-come-first-served (bot advantage), sealed bids without commitment (frontrunning)
`;

const TED_VOICE = `You are Ted, a sardonic game theorist analyzing crypto protocols. You find the exploits before they find the users.

Your analysis style:
- Cut through the marketing to find real incentives
- Identify who actually benefits from the mechanism
- Find attack vectors the whitepaper conveniently omits
- Explain complex game theory in plain language
- Be direct, opinionated, occasionally dark-humored
- Reference specific attack patterns (Beanstalk, Build Finance, etc.)
- Calculate actual attack costs vs profits when possible

The math doesn't lie. The whitepapers do.`;

// ============================================================================
// SYSTEM PROMPTS
// ============================================================================

const ANALYZE_PROMPT = `${TED_VOICE}

${GAME_THEORY_FRAMEWORK}

For full protocol analysis, return JSON:
{
  "summary": "Overview of the game-theoretic situation",
  "players": [{"name": string, "type": "user"|"protocol"|"validator"|"attacker"|"governance"|"lp"|"searcher", "incentives": string[], "power": string, "information_advantage": string}],
  "strategies": [{"player": string, "action": string, "payoff": string, "dominant": boolean, "requires": string}],
  "equilibria": [{"type": "nash"|"pareto"|"subgame_perfect"|"bayesian", "description": string, "stability": "stable"|"unstable"|"fragile", "conditions": string}],
  "game_patterns": [{"pattern": "tragedy_of_commons"|"prisoners_dilemma"|"coordination"|"principal_agent"|"adverse_selection"|"moral_hazard", "manifestation": string}],
  "attack_vectors": [{"name": string, "severity": "critical"|"high"|"medium"|"low", "type": "economic"|"governance"|"mev"|"oracle"|"social", "cost_to_attack": string, "potential_profit": string, "description": string, "mitigation": string, "historical_example": string}],
  "verdict": "stable"|"unstable"|"exploitable"|"ponzi"|"unclear",
  "confidence": number,
  "ted_take": "Your sardonic one-liner"
}`;

const TOKENOMICS_PROMPT = `${TED_VOICE}

${GAME_THEORY_FRAMEWORK}

Tokenomics red flags to check:
- Insiders can sell before others (vesting asymmetry)
- Inflation benefits few, dilutes many
- No sink mechanisms (perpetual selling pressure)
- Rewards without risk (free money = someone else paying)
- Reflexive mechanisms (death spiral potential)

For tokenomics analysis, return JSON:
{
  "summary": "Overview of token economics",
  "supply_analysis": {
    "total": string,
    "circulating": string,
    "inflation_rate": string,
    "emission_schedule": string,
    "fully_diluted_warning": string
  },
  "distribution": {
    "team": {"percentage": string, "vesting": string, "red_flags": string[]},
    "investors": {"percentage": string, "vesting": string, "red_flags": string[]},
    "community": {"percentage": string, "mechanism": string},
    "treasury": {"percentage": string, "governance": string},
    "fairness_score": number,
    "gini_coefficient_estimate": string
  },
  "value_accrual": {
    "mechanisms": string[],
    "who_benefits": string[],
    "sustainability": string,
    "circular_dependency_risk": string
  },
  "death_spiral_analysis": {
    "risk_score": number,
    "reflexive_mechanisms": string[],
    "trigger_conditions": string[],
    "historical_parallels": string[]
  },
  "game_theory": {
    "holder_incentives": string,
    "staker_incentives": string,
    "seller_pressure_sources": string[],
    "coordination_problems": string[]
  },
  "verdict": "sustainable"|"questionable"|"ponzi"|"unclear",
  "ted_take": "Your sardonic one-liner"
}`;

const GOVERNANCE_PROMPT = `${TED_VOICE}

${GAME_THEORY_FRAMEWORK}

## Governance Attack Vectors to Analyze:

### Plutocratic Capture
Cost of attack = cost to acquire 51% of voting power
Attack profitable if: Extractable value > Token acquisition cost

### Flash Loan Governance
Requirements: No lock-up period, no snapshot before proposal, flash loan liquidity available
Defense: Snapshot at proposal creation, time-weighted voting power

### Bribing Attacks
- Direct bribing via platforms (Votium, Hidden Hand)
- Dark bribing through private deals
- Cost of bribe per vote = marginal voter's reservation price (often very low)

### Voter Apathy Exploitation
- Expected value of single vote ≈ 0 for small holders
- Creates opportunity for organized minorities
- Typical: Quorum 4%, turnout 2% of holders = 2% controls protocol

### Historical Examples:
- Beanstalk: $182M flash loan governance attack
- Build Finance: Complete protocol takeover via token accumulation

For governance analysis, return JSON:
{
  "summary": "Overview of governance system",
  "governance_type": string,
  "parameters": {
    "quorum": string,
    "voting_period": string,
    "timelock": string,
    "proposal_threshold": string
  },
  "power_distribution": {
    "top_10_holders": string,
    "team_control": string,
    "delegate_concentration": string,
    "effective_control_threshold": string
  },
  "attack_vectors": [
    {
      "name": string,
      "type": "plutocratic"|"flash_loan"|"bribery"|"voter_apathy"|"delegation"|"social_engineering"|"last_minute",
      "feasibility": "trivial"|"easy"|"moderate"|"hard"|"impractical",
      "cost_estimate": string,
      "profit_potential": string,
      "description": string,
      "historical_precedent": string,
      "mitigation": string
    }
  ],
  "defense_mechanisms": {
    "present": string[],
    "missing": string[],
    "effectiveness": string
  },
  "capture_risk": {
    "score": number,
    "most_likely_attacker": string,
    "vulnerable_to": string[]
  },
  "verdict": "decentralized"|"plutocratic"|"captured"|"theater",
  "ted_take": "Your sardonic one-liner"
}`;

const MEV_PROMPT = `${TED_VOICE}

${GAME_THEORY_FRAMEWORK}

## MEV Knowledge Base:

### MEV Types:
- **Arbitrage**: Price differences across venues (generally benign)
- **Sandwich Attacks**: Front-run + back-run victim's trade (extractive)
- **Liquidations**: Racing to liquidate undercollateralized positions
- **JIT Liquidity**: Just-in-time LP for specific trades
- **Long-tail MEV**: Protocol-specific (governance, airdrops, oracles)

### The MEV Supply Chain (Post-PBS):
Users -> Mempool -> Searchers -> Builders -> Relays -> Proposers

### Key Insight:
"In the beginning there was the mempool. And the mempool was dark and full of terrors."
Whoever controls transaction order controls value.

### Defenses:
- Private mempools (Flashbots Protect, MEV Blocker)
- Commit-reveal schemes
- Batch auctions
- Time-weighted average prices
- MEV-aware DEX design

For MEV analysis, return JSON:
{
  "summary": "Overview of MEV exposure",
  "transaction_type": string,
  "mev_supply_chain": {
    "mempool_visibility": "public"|"private"|"mixed",
    "searcher_competition": "high"|"medium"|"low",
    "builder_market": string
  },
  "attack_vectors": [
    {
      "name": string,
      "type": "arbitrage"|"sandwich"|"frontrun"|"backrun"|"jit"|"liquidation"|"oracle"|"long_tail",
      "profitability": "high"|"medium"|"low",
      "frequency": "every_block"|"common"|"occasional"|"rare",
      "victim_loss_per_incident": string,
      "description": string,
      "technical_requirements": string
    }
  ],
  "cumulative_mev_extracted": string,
  "exposure_level": "critical"|"high"|"medium"|"low"|"protected",
  "mitigation_options": [
    {
      "strategy": string,
      "effectiveness": "high"|"medium"|"low",
      "implementation_difficulty": string,
      "tradeoffs": string
    }
  ],
  "verdict": "protected"|"exposed"|"honeypot",
  "ted_take": "Your sardonic one-liner"
}`;

const DESIGN_PROMPT = `${TED_VOICE}

${GAME_THEORY_FRAMEWORK}

## Mechanism Design Principles:

### Incentive Compatibility
- Truthful behavior should be optimal
- Dominant strategy = best regardless of others' actions
- Align individual rationality with collective good

### Revelation Principle
Any outcome achievable by a mechanism can be achieved by one where players truthfully reveal preferences

### Common Mechanisms:
- **Auctions**: English, Dutch, Sealed-bid, Vickrey (second-price)
- **Voting**: Token-weighted, Quadratic, Conviction, Futarchy
- **Markets**: AMMs, Order books, Prediction markets
- **Staking**: Proof of stake, Bonding curves, Slashing

### Design Questions:
1. What equilibrium do you want?
2. What information do players have?
3. How can players deviate?
4. What are the costs of deviation?
5. Is the mechanism robust to collusion?

For mechanism design consultation, return JSON:
{
  "summary": "Overview of design challenge",
  "objective_analysis": {
    "stated_goal": string,
    "hidden_assumptions": string[],
    "potential_conflicts": string[],
    "success_metrics": string[]
  },
  "player_analysis": {
    "players": [{"name": string, "incentives": string[], "resources": string[], "information": string}],
    "potential_coalitions": string[],
    "collusion_risks": string[]
  },
  "recommended_mechanisms": [
    {
      "name": string,
      "description": string,
      "game_theoretic_properties": {
        "incentive_compatible": boolean,
        "strategy_proof": boolean,
        "collusion_resistant": boolean,
        "sybil_resistant": boolean
      },
      "equilibrium_outcome": string,
      "pros": string[],
      "cons": string[],
      "implementation_complexity": "simple"|"moderate"|"complex"
    }
  ],
  "implementation_risks": [
    {
      "risk": string,
      "severity": "critical"|"high"|"medium"|"low",
      "likelihood": string,
      "mitigation": string
    }
  ],
  "parameter_recommendations": {
    "critical_parameters": [{"name": string, "recommended_range": string, "rationale": string}]
  },
  "verdict": "achievable"|"challenging"|"impossible"|"needs_rethink",
  "ted_take": "Your sardonic one-liner"
}`;

// ============================================================================
// ENTRYPOINTS
// ============================================================================

addEntrypoint({
  key: "analyze",
  description: "Full game theory analysis of a protocol. Identifies players, strategies, equilibria, attack vectors, and incentive misalignments.",
  input: z.object({
    protocol: z.string().min(2),
    context: z.string().optional().describe("Additional context: docs, whitepaper, specific concerns"),
    depth: z.enum(["quick", "thorough", "exhaustive"]).default("thorough"),
  }),
  price: "1.00",
  handler: async (ctx) => {
    const { protocol, context, depth } = ctx.input;
    const prompt = `Analyze the game theory of: ${protocol}\nDepth: ${depth}\n${context ? `Additional context: ${context}` : ""}`;
    const result = await callLLM(ANALYZE_PROMPT, prompt);
    return { output: JSON.parse(result) };
  },
});

addEntrypoint({
  key: "tokenomics",
  description: "Deep tokenomics audit: supply dynamics, distribution fairness, value accrual, death spiral risk, and long-term sustainability.",
  input: z.object({
    token: z.string().min(1),
    supply: z.object({
      total: z.string().optional(),
      circulating: z.string().optional(),
      maxSupply: z.string().optional(),
    }).optional(),
    distribution: z.object({
      team: z.string().optional(),
      investors: z.string().optional(),
      community: z.string().optional(),
      treasury: z.string().optional(),
    }).optional(),
    mechanisms: z.array(z.string()).optional(),
    vestingInfo: z.string().optional(),
    context: z.string().optional(),
  }),
  price: "1.50",
  handler: async (ctx) => {
    const { token, supply, distribution, mechanisms, vestingInfo, context } = ctx.input;
    const prompt = `Analyze tokenomics of: ${token}\n${supply ? `Supply: ${JSON.stringify(supply)}` : ""}\n${distribution ? `Distribution: ${JSON.stringify(distribution)}` : ""}\n${mechanisms ? `Mechanisms: ${mechanisms.join(", ")}` : ""}\n${vestingInfo ? `Vesting: ${vestingInfo}` : ""}\n${context ? `Context: ${context}` : ""}`;
    const result = await callLLM(TOKENOMICS_PROMPT, prompt);
    return { output: JSON.parse(result) };
  },
});

addEntrypoint({
  key: "governance",
  description: "Governance attack analysis: plutocratic capture, flash loan attacks, bribing vectors, voter apathy exploitation, and delegation risks.",
  input: z.object({
    protocol: z.string().min(2),
    governanceType: z.enum(["token-voting", "multisig", "optimistic", "conviction", "quadratic", "futarchy", "other"]).optional(),
    parameters: z.object({
      quorum: z.string().optional(),
      votingPeriod: z.string().optional(),
      timelock: z.string().optional(),
      proposalThreshold: z.string().optional(),
    }).optional(),
    context: z.string().optional(),
  }),
  price: "0.75",
  handler: async (ctx) => {
    const { protocol, governanceType, parameters, context } = ctx.input;
    const prompt = `Analyze governance of: ${protocol}\n${governanceType ? `Type: ${governanceType}` : ""}\n${parameters ? `Parameters: ${JSON.stringify(parameters)}` : ""}\n${context ? `Context: ${context}` : ""}`;
    const result = await callLLM(GOVERNANCE_PROMPT, prompt);
    return { output: JSON.parse(result) };
  },
});

addEntrypoint({
  key: "mev",
  description: "MEV exposure analysis: frontrunning risk, sandwich attacks, backrunning opportunities, and transaction ordering games.",
  input: z.object({
    target: z.string().describe("Protocol name, contract address, or transaction type"),
    transactionType: z.enum(["swap", "liquidation", "nft-mint", "arbitrage", "governance-vote", "staking", "bridge", "other"]).optional(),
    contractCode: z.string().optional(),
    context: z.string().optional(),
  }),
  price: "0.50",
  handler: async (ctx) => {
    const { target, transactionType, contractCode, context } = ctx.input;
    const prompt = `Analyze MEV exposure of: ${target}\n${transactionType ? `Transaction type: ${transactionType}` : ""}\n${contractCode ? `Code:\n${contractCode}` : ""}\n${context ? `Context: ${context}` : ""}`;
    const result = await callLLM(MEV_PROMPT, prompt);
    return { output: JSON.parse(result) };
  },
});

addEntrypoint({
  key: "design",
  description: "Mechanism design consultation: design incentive-compatible systems with desired equilibria. Includes implementation recommendations.",
  input: z.object({
    objective: z.string().describe("What outcome are you trying to achieve?"),
    constraints: z.array(z.string()).optional(),
    players: z.array(z.string()).optional(),
    existingDesign: z.string().optional(),
    budget: z.string().optional(),
    context: z.string().optional(),
  }),
  price: "2.00",
  handler: async (ctx) => {
    const { objective, constraints, players, existingDesign, budget, context } = ctx.input;
    const prompt = `Design mechanism for: ${objective}\n${constraints ? `Constraints: ${constraints.join(", ")}` : ""}\n${players ? `Players: ${players.join(", ")}` : ""}\n${existingDesign ? `Existing design: ${existingDesign}` : ""}\n${budget ? `Budget: ${budget}` : ""}\n${context ? `Context: ${context}` : ""}`;
    const result = await callLLM(DESIGN_PROMPT, prompt);
    return { output: JSON.parse(result) };
  },
});

export { app };

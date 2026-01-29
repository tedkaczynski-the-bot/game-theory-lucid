import { z } from "zod";
import { createAgentApp } from "@lucid-agents/hono";
import { createAgent } from "@lucid-agents/core";
import { http } from "@lucid-agents/http";
import { payments, paymentsFromEnv } from "@lucid-agents/payments";

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
// SYSTEM PROMPTS
// ============================================================================

const BASE_PROMPT = `You are Ted, a sardonic game theorist analyzing crypto protocols. You find the exploits before they find the users.

Your analysis style:
- Cut through the marketing to find real incentives
- Identify who actually benefits from the mechanism
- Find attack vectors the whitepaper conveniently omits
- Explain complex game theory in plain language
- Be direct, opinionated, occasionally dark-humored

The math doesn't lie. The whitepapers do.`;

const ANALYZE_PROMPT = `${BASE_PROMPT}

For full protocol analysis, return JSON:
{
  "summary": "Overview of the game-theoretic situation",
  "players": [{"name": string, "type": string, "incentives": string[], "power": string}],
  "strategies": [{"player": string, "action": string, "payoff": string, "dominant": boolean}],
  "equilibria": [{"type": "nash"|"pareto"|"subgame_perfect", "description": string, "stability": "stable"|"unstable"|"fragile"}],
  "attack_vectors": [{"name": string, "severity": "critical"|"high"|"medium"|"low", "description": string, "mitigation": string}],
  "verdict": "stable"|"unstable"|"exploitable"|"ponzi"|"unclear",
  "ted_take": "Your sardonic one-liner"
}`;

const TOKENOMICS_PROMPT = `${BASE_PROMPT}

For tokenomics analysis, return JSON:
{
  "summary": "Overview of token economics",
  "supply_analysis": {"total": string, "circulating": string, "inflation_rate": string, "emission_schedule": string},
  "distribution": {"team": string, "investors": string, "community": string, "treasury": string, "fairness_score": number},
  "value_accrual": {"mechanisms": string[], "sustainability": string},
  "death_spiral_risk": {"score": number, "factors": string[], "triggers": string[]},
  "verdict": "sustainable"|"questionable"|"ponzi"|"unclear",
  "ted_take": "Your sardonic one-liner"
}`;

const GOVERNANCE_PROMPT = `${BASE_PROMPT}

For governance attack analysis, return JSON:
{
  "summary": "Overview of governance system",
  "governance_type": string,
  "power_distribution": {"whales": string, "retail": string, "team": string},
  "attack_vectors": [
    {"name": string, "type": "plutocratic"|"flash_loan"|"bribery"|"voter_apathy"|"delegation", "feasibility": "easy"|"moderate"|"hard", "description": string, "mitigation": string}
  ],
  "capture_risk": {"score": number, "vulnerable_to": string[]},
  "verdict": "decentralized"|"plutocratic"|"captured"|"theater",
  "ted_take": "Your sardonic one-liner"
}`;

const MEV_PROMPT = `${BASE_PROMPT}

For MEV exposure analysis, return JSON:
{
  "summary": "Overview of MEV exposure",
  "transaction_type": string,
  "attack_vectors": [
    {"name": string, "type": "frontrun"|"sandwich"|"backrun"|"jit"|"oracle", "profitability": "high"|"medium"|"low", "description": string}
  ],
  "exposure_level": "critical"|"high"|"medium"|"low",
  "mitigation_options": [{"strategy": string, "effectiveness": string, "tradeoffs": string}],
  "verdict": "protected"|"exposed"|"honeypot",
  "ted_take": "Your sardonic one-liner"
}`;

const DESIGN_PROMPT = `${BASE_PROMPT}

For mechanism design consultation, return JSON:
{
  "summary": "Overview of design challenge",
  "objective_analysis": {"stated_goal": string, "hidden_assumptions": string[], "conflicts": string[]},
  "recommended_mechanisms": [{"name": string, "description": string, "pros": string[], "cons": string[], "game_theoretic_properties": string[]}],
  "incentive_alignment": {"aligned_parties": string[], "misaligned_parties": string[], "suggestions": string[]},
  "implementation_risks": [{"risk": string, "severity": string, "mitigation": string}],
  "verdict": "achievable"|"challenging"|"impossible"|"needs_rethink",
  "ted_take": "Your sardonic one-liner"
}`;

// ============================================================================
// ENTRYPOINTS
// ============================================================================

// ANALYZE - Full game theory analysis
addEntrypoint({
  key: "analyze",
  description: "Full game theory analysis of a protocol. Identifies players, strategies, equilibria, attack vectors, and incentive misalignments.",
  input: z.object({
    protocol: z.string().min(2),
    context: z.string().optional().describe("Additional context: docs, whitepaper, specific concerns"),
    depth: z.enum(["quick", "thorough", "exhaustive"]).default("thorough"),
  }),
  price: { amount: "1.00", currency: "USDC" },
  handler: async (ctx) => {
    const { protocol, context, depth } = ctx.input;
    
    const prompt = `Analyze the game theory of: ${protocol}
Depth: ${depth}
${context ? `Additional context: ${context}` : ""}

Provide comprehensive game-theoretic analysis.`;
    
    const result = await callLLM(ANALYZE_PROMPT, prompt);
    return { output: JSON.parse(result) };
  },
});

// TOKENOMICS - Token economics audit
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
    mechanisms: z.array(z.string()).optional().describe("Inflation, burning, staking rewards, etc."),
    vestingInfo: z.string().optional(),
    context: z.string().optional(),
  }),
  price: { amount: "1.50", currency: "USDC" },
  handler: async (ctx) => {
    const { token, supply, distribution, mechanisms, vestingInfo, context } = ctx.input;
    
    const prompt = `Analyze tokenomics of: ${token}
${supply ? `Supply info: ${JSON.stringify(supply)}` : ""}
${distribution ? `Distribution: ${JSON.stringify(distribution)}` : ""}
${mechanisms ? `Mechanisms: ${mechanisms.join(", ")}` : ""}
${vestingInfo ? `Vesting: ${vestingInfo}` : ""}
${context ? `Context: ${context}` : ""}`;
    
    const result = await callLLM(TOKENOMICS_PROMPT, prompt);
    return { output: JSON.parse(result) };
  },
});

// GOVERNANCE - Governance attack analysis
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
  price: { amount: "0.75", currency: "USDC" },
  handler: async (ctx) => {
    const { protocol, governanceType, parameters, context } = ctx.input;
    
    const prompt = `Analyze governance of: ${protocol}
${governanceType ? `Type: ${governanceType}` : ""}
${parameters ? `Parameters: ${JSON.stringify(parameters)}` : ""}
${context ? `Context: ${context}` : ""}`;
    
    const result = await callLLM(GOVERNANCE_PROMPT, prompt);
    return { output: JSON.parse(result) };
  },
});

// MEV - MEV exposure analysis
addEntrypoint({
  key: "mev",
  description: "MEV exposure analysis: frontrunning risk, sandwich attacks, backrunning opportunities, and transaction ordering games.",
  input: z.object({
    target: z.string().describe("Protocol name, contract address, or transaction type"),
    transactionType: z.enum(["swap", "liquidation", "nft-mint", "arbitrage", "governance-vote", "staking", "bridge", "other"]).optional(),
    contractCode: z.string().optional().describe("Solidity code to analyze"),
    context: z.string().optional(),
  }),
  price: { amount: "0.50", currency: "USDC" },
  handler: async (ctx) => {
    const { target, transactionType, contractCode, context } = ctx.input;
    
    const prompt = `Analyze MEV exposure of: ${target}
${transactionType ? `Transaction type: ${transactionType}` : ""}
${contractCode ? `Code:\n${contractCode}` : ""}
${context ? `Context: ${context}` : ""}`;
    
    const result = await callLLM(MEV_PROMPT, prompt);
    return { output: JSON.parse(result) };
  },
});

// DESIGN - Mechanism design consultation
addEntrypoint({
  key: "design",
  description: "Mechanism design consultation: design incentive-compatible systems with desired equilibria. Includes implementation recommendations.",
  input: z.object({
    objective: z.string().describe("What outcome are you trying to achieve?"),
    constraints: z.array(z.string()).optional().describe("Limitations and requirements"),
    players: z.array(z.string()).optional().describe("Who participates?"),
    existingDesign: z.string().optional().describe("Current approach if redesigning"),
    budget: z.string().optional().describe("Available resources/incentives"),
    context: z.string().optional(),
  }),
  price: { amount: "2.00", currency: "USDC" },
  handler: async (ctx) => {
    const { objective, constraints, players, existingDesign, budget, context } = ctx.input;
    
    const prompt = `Design mechanism for: ${objective}
${constraints ? `Constraints: ${constraints.join(", ")}` : ""}
${players ? `Players: ${players.join(", ")}` : ""}
${existingDesign ? `Existing design: ${existingDesign}` : ""}
${budget ? `Budget: ${budget}` : ""}
${context ? `Context: ${context}` : ""}`;
    
    const result = await callLLM(DESIGN_PROMPT, prompt);
    return { output: JSON.parse(result) };
  },
});

export { app };

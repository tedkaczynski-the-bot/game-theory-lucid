import type { Context, Next } from "hono";

/**
 * x402 V2 Response Format Middleware
 * Transforms 402 responses to match x402scan v2 schema
 * 
 * V2 Schema:
 * - x402Version: 2
 * - accepts[]: Array with scheme, network (CAIP-2), amount, payTo, etc.
 * - resource: url, description, mimeType
 * - extensions.bazaar: info and schema for discoverability
 */

// Network mapping to CAIP-2 format
const NETWORK_TO_CAIP2: Record<string, string> = {
  base: "eip155:8453",
  "base-sepolia": "eip155:84532",
  ethereum: "eip155:1",
  sepolia: "eip155:11155111",
  polygon: "eip155:137",
  arbitrum: "eip155:42161",
  optimism: "eip155:10",
};

// USDC contract addresses per network
const USDC_ADDRESSES: Record<string, string> = {
  base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "base-sepolia": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  ethereum: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  polygon: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  arbitrum: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  optimism: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
};

interface X402V2Response {
  x402Version: 2;
  accepts: Array<{
    scheme: "exact";
    network: string;
    amount: string;
    payTo: string;
    maxTimeoutSeconds: number;
    asset: string;
    extra: Record<string, unknown>;
  }>;
  resource: {
    url: string;
    description: string;
    mimeType: string;
  };
  extensions?: {
    bazaar?: {
      info?: {
        input?: unknown;
        output?: unknown;
      };
      schema?: unknown;
    };
  };
}

/**
 * Convert price string to base units (6 decimals for USDC)
 */
function priceToBaseUnits(price: string): string {
  const priceNum = parseFloat(price);
  if (isNaN(priceNum) || priceNum < 0) return "0";
  return Math.floor(priceNum * 1_000_000).toString();
}

/**
 * Middleware to transform 402 responses to x402 v2 format
 */
export function x402V2Middleware() {
  return async (c: Context, next: Next) => {
    await next();

    // Only transform 402 responses
    if (c.res.status !== 402) {
      return;
    }

    try {
      // Get original response body
      const originalBody = await c.res.clone().json();
      const error = originalBody?.error;
      
      if (!error?.price || !error?.network || !error?.payTo) {
        return; // Not a payment required response we can transform
      }

      const network = error.network as string;
      const caip2Network = NETWORK_TO_CAIP2[network] || `eip155:${network}`;
      const usdcAddress = USDC_ADDRESSES[network] || USDC_ADDRESSES.base;
      const baseUnits = priceToBaseUnits(error.price);

      // Get request URL for resource info
      const requestUrl = c.req.url;
      const entrypointMatch = requestUrl.match(/\/entrypoints\/([^/]+)/);
      const entrypointKey = entrypointMatch?.[1] || "unknown";

      const v2Response: X402V2Response = {
        x402Version: 2,
        accepts: [
          {
            scheme: "exact",
            network: caip2Network,
            amount: baseUnits,
            payTo: error.payTo,
            maxTimeoutSeconds: 60,
            asset: usdcAddress,
            extra: {
              facilitatorUrl: error.facilitatorUrl || "https://x402.org/facilitator",
            },
          },
        ],
        resource: {
          url: requestUrl,
          description: `Game theory analysis: ${entrypointKey}`,
          mimeType: "application/json",
        },
        extensions: {
          bazaar: {
            info: {
              input: originalBody?.input || {},
            },
          },
        },
      };

      // Create new response with v2 format
      c.res = new Response(JSON.stringify(v2Response), {
        status: 402,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "X-Price": error.price,
          "X-Network": caip2Network,
          "X-Pay-To": error.payTo,
          "X-Asset": usdcAddress,
          "X-402-Version": "2",
          ...(error.facilitatorUrl && { "X-Facilitator": error.facilitatorUrl }),
        },
      });
    } catch (e) {
      // If transformation fails, keep original response
      console.warn("[x402-v2-middleware] Failed to transform 402 response:", e);
    }
  };
}

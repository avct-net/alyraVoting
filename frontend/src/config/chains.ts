import { defineChain, type Chain } from "viem";
import { foundry, sepolia } from "viem/chains";

/**
 * Résout la chaîne cible en fonction des variables d'environnement.
 * Gère nativement Foundry (local), Sepolia (testnet public) et toute L1 personnalisée.
 */
function resolveCurrentChain(): Chain {
  const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || foundry.id);
  const isLocal = chainId === foundry.id;

  // Résolution de l'URL RPC
  const rpcUrl =
    process.env.NEXT_PUBLIC_RPC_URL ||
    (isLocal
      ? typeof window !== "undefined"
        ? `${window.location.origin}/rpc`
        : "http://127.0.0.1:8545"
      : sepolia.rpcUrls.default.http[0]);

  // 1. Réseau local de développement (Anvil / Foundry)
  if (chainId === foundry.id) {
    return defineChain({
      ...foundry,
      rpcUrls: { default: { http: [rpcUrl] } },
    });
  }

  // 2. Testnet Sepolia
  if (chainId === sepolia.id) {
    return defineChain({
      ...sepolia,
      rpcUrls: { default: { http: [rpcUrl] } },
    });
  }

  // 3. L1 personnalisée (Avalanche Subnet, etc.) paramétrée via l'environnement
  return defineChain({
    id: chainId,
    name: process.env.NEXT_PUBLIC_CHAIN_NAME || `Custom Chain (${chainId})`,
    nativeCurrency: {
      name: process.env.NEXT_PUBLIC_CHAIN_CURRENCY_NAME || "Native Token",
      symbol: process.env.NEXT_PUBLIC_CHAIN_CURRENCY_SYMBOL || "TOKEN",
      decimals: Number(process.env.NEXT_PUBLIC_CHAIN_CURRENCY_DECIMALS || 18),
    },
    rpcUrls: {
      default: { http: [rpcUrl] },
    },
  });
}

export const targetChain = resolveCurrentChain();
export const isLocalNetwork = targetChain.id === foundry.id;

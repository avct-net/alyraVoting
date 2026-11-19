import { createConfig, createConnector, http, injected, mock, type Transport } from "wagmi";
import { foundry, sepolia } from "wagmi/chains";
import { defineChain, type Address } from "viem";

const isLocal = (process.env.NEXT_PUBLIC_CHAIN_ID || "31337") === String(foundry.id);

const rpcUrl =
  process.env.NEXT_PUBLIC_RPC_URL ||
  (isLocal
    ? typeof window !== "undefined"
      ? `${window.location.origin}/rpc`
      : "http://127.0.0.1:8545"
    : sepolia.rpcUrls.default.http[0]);

export const chain = defineChain({
  ...(isLocal ? foundry : sepolia),
  rpcUrls: { default: { http: [rpcUrl] } },
});

// Comptes de test Anvil (clés publiques et bien connues) : permettent de tester sans wallet en local.
const ANVIL_ACCOUNTS: Address[] = [
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
];

const anvilConnectors = ANVIL_ACCOUNTS.map((account, i) =>
  createConnector((config) => ({
    ...mock({ accounts: [account], features: { reconnect: true } })(config),
    id: `anvil-${i}`,
    name: i === 0 ? "Compte de test #0 (admin)" : `Compte de test #${i}`,
  })),
);

export const config = createConfig({
  chains: [chain],
  connectors: [injected(), ...(isLocal ? anvilConnectors : [])],
  transports: { [chain.id]: http(rpcUrl) } as Record<typeof chain.id, Transport>,
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}

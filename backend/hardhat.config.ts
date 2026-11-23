import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  ignition: {
    // Indique à Ignition qu'1 seule confirmation suffit | Proof of Autority PoA 
    // hardhat ignition default 5 (bloque le déploiement indéfiniment ou déclenche l'erreur HHE10402)
    requiredConfirmations: 1,
  },
  solidity: {
    profiles: {
      default: {
        version: "0.8.34",
      },
      production: {
        version: "0.8.34",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
    avalanche: {
      type: "http",
      chainType: "l1",
      url: configVariable("AVALANCHE_RPC_URL"),
      accounts: [configVariable("AVALANCHE_PRIVATE_KEY")],
    },
    // L1 Avalanche PoA
    alize: {
      type: "http",
      chainType: "l1",
      url: configVariable("ALIZE_RPC_URL"),
      accounts: [configVariable("ALIZE_PRIVATE_KEY")],
    },
  },
});

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";
const ARTHERA_RPC_URL = process.env.ARTHERA_RPC_URL || "https://rpc.arthera.net";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000
      }
    }
  },
  networks: {
    hardhat: {},
    arthera: {
      url: ARTHERA_RPC_URL,
      accounts: [DEPLOYER_PRIVATE_KEY],
      chainId: 10242,
    },
  },
  etherscan: {
    apiKey: {
      'arthera': 'empty'
    },
    customChains: [
      {
        network: "arthera",
        chainId: 10242,
        urls: {
          apiURL: "https://explorer.arthera.net/api",
          browserURL: "https://explorer.arthera.net:443"
        }
      }
    ]
  }
};

export default config;
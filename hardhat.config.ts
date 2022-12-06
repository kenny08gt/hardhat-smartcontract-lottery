import { HardhatUserConfig, task } from "hardhat/config"
import "@nomicfoundation/hardhat-toolbox"
import "hardhat-gas-reporter"
import "solidity-coverage"
import "hardhat-deploy"
import * as dotenv from "dotenv"

dotenv.config()

const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL! || "https://not.real"
const PRIVATE_KEY = process.env.PRIVATE_KEY! || "0xkey"
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY! || "key"
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY! || "key"

interface NetworkUserConfig {}

const config: HardhatUserConfig & NetworkUserConfig = {
    defaultNetwork: "hardhat",
    networks: {
        goerli: {
            url: GOERLI_RPC_URL,
            accounts: [PRIVATE_KEY],
            chainId: 5,
            gasPrice: 1625502308,
        },
        hardhat: {
            chainId: 31337,
        },
        localhost: {
            url: "http://127.0.0.1:8545/",
            chainId: 31337,
        },
    },
    solidity: {
        compilers: [{ version: "0.8.8" }, { version: "0.6.6" }],
    },
    etherscan: {
        apiKey: ETHERSCAN_API_KEY,
    },
    gasReporter: {
        enabled: true,
        outputFile: "gas-report.txt",
        noColors: true,
        currency: "USD",
        // coinmarketcap: COINMARKETCAP_API_KEY,
    },
    namedAccounts: {
        deployer: {
            default: 0,
        },
        player: {
            default: 1,
        },
    },
    mocha: {
        timeout: 200000, //200 seconds
    },
}

export default config

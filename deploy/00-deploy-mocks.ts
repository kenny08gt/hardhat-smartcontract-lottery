import { network, ethers } from "hardhat"
import { DeployFunction } from "hardhat-deploy/dist/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"

const deployMock: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, getNamedAccounts, network } = hre
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    const BASE_FEE = ethers.utils.parseEther("0.25") // 0.25 is the premium. it cost 0.25 LINK each request
    const GAS_PRICE_LINK = 1e9 //link per gas

    if (chainId === 31337) {
        log("Local network deteted! Deploying mocks...")
        await deploy("VRFCoordinatorV2Mock", {
            contract: "VRFCoordinatorV2Mock",
            from: deployer,
            log: true,
            args: [BASE_FEE, GAS_PRICE_LINK],
        })
        log("Mocks deployed!")
        log("------------------------------------------")
    }
}

export default deployMock

deployMock.tags = ["all", "mocks"]

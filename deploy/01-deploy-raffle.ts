import { verify } from "../utils/verify"
import { ethers, network } from "hardhat"
import { networkConfig, developmentChain } from "../helper-hardhat-config"
import { DeployFunction } from "hardhat-deploy/dist/types"

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("2")

const deployRaffle: DeployFunction = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId: number = network.config.chainId!

    let vrfCoordinatorV2
    let blockConfirmations
    let subscriptionId
    if (developmentChain.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2 = vrfCoordinatorV2Mock.address
        blockConfirmations = 1
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription()
        const txReceipt = await transactionResponse.wait(1)
        subscriptionId = txReceipt.events[0].args.subId
        // fund the subscription
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT)
    } else {
        blockConfirmations = 6
        vrfCoordinatorV2 = networkConfig[chainId]["vrfCoordinatorV2"]
        subscriptionId = networkConfig[chainId]["subscriptionId"]
    }

    const entranceFee = networkConfig[chainId]["entranceFee"]
    const gasLane = networkConfig[chainId]["gasLane"]
    const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"]
    const interval = networkConfig[chainId]["interval"]

    const args = [
        vrfCoordinatorV2,
        entranceFee,
        gasLane,
        subscriptionId,
        callbackGasLimit,
        interval,
    ]

    const Raffle = await deploy("Raffle", {
        contract: "Raffle",
        from: deployer,
        args: args, // put price feed address
        log: true,
        waitConfirmations: blockConfirmations || 1,
    })

    log("------------------------------------------")

    if (!developmentChain.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        await verify(Raffle.address, args)
    }
}

export default deployRaffle

deployRaffle.tags = ["all", "Raffle"]

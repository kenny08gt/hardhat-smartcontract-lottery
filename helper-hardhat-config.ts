import { BigNumber } from "ethers"
import { ethers } from "hardhat"

export interface networkConfigItem {
    vrfCoordinatorV2?: string
    blockConfirmations?: number
    entranceFee?: BigNumber
    gasLane?: string
    name?: string
    subscriptionId?: string
    callbackGasLimit?: string
    interval?: string
}
export interface networkConfigInfo {
    [key: string]: networkConfigItem
}

export const networkConfig: networkConfigInfo = {
    5: {
        name: "goerly",
        vrfCoordinatorV2: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
        blockConfirmations: 6,
        entranceFee: ethers.utils.parseEther("0.01"),
        gasLane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
        subscriptionId: "7318",
        callbackGasLimit: "500000",
        interval: "30",
    },
    31337: {
        blockConfirmations: 1,
        name: "hardhat",
        entranceFee: ethers.utils.parseEther("0.01"),
        gasLane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
        callbackGasLimit: "500000",
        interval: "30",
    },
}

export const developmentChain = ["hardhat", "localhost"]

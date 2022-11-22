import { assert } from "chai"
import { deployments, ethers, getNamedAccounts, network } from "hardhat"
import { describe, it } from "node:test"
import { developmentChain, networkConfig } from "../../helper-hardhat-config"

!developmentChain.includes(network.name)
    ? describe.skip
    : describe("Raffle unit tests", async () => {
          let raffle, vrfCoordinatorV2Mock
          const chainId: number = network.config.chainId!

          beforeEach(async function () {
              const { deployer } = await getNamedAccounts()
              await deployments.fixture(["all"])
              raffle = await ethers.getContract("Raffle", deployer)
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
          })

          describe("constructor", async () => {
              it("Initializes the raffle correctly", async () => {
                  const raffleState = await raffle.getRaffleStat()
                  const interval = await raffle.getInterval()
                  assert.equal(raffleState.toString(), 0)
                  assert.equal(interval.toString(), networkConfig[chainId]["interval"])
              })
          })
      })

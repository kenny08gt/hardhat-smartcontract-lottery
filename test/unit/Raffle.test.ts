import { assert, expect } from "chai"
import { BigNumber, ContractReceipt } from "ethers"
import { deployments, ethers, getNamedAccounts, network } from "hardhat"
import { Address } from "hardhat-deploy/dist/types"
import { developmentChain, networkConfig } from "../../helper-hardhat-config"
import { Raffle, VRFCoordinatorV2Mock } from "../../typechain-types"

!developmentChain.includes(network.name)
    ? describe.skip
    : describe("Raffle unit tests", async () => {
          let deployer: string
          let interval: BigNumber
          let raffle: Raffle
          let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock
          let raffleEntranceFee: BigNumber
          const chainId: number = network.config.chainId!

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])
              raffle = await ethers.getContract("Raffle", deployer)
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
              raffleEntranceFee = await raffle.getEntranceFee()
              interval = await raffle.getInterval()
          })

          describe("constructor", function () {
              it("Initializes the raffle correctly", async function () {
                  const raffleState = await raffle.getRaffleState()
                  assert.equal(raffleState.toString(), "0")
                  assert.equal(interval.toString(), networkConfig[chainId]["interval"])
              })
          })

          describe("EnterRaffle", function () {
              it("reverts when you dont pay enough", async function () {
                  await expect(raffle.enterRaffle()).to.be.rejectedWith(`Raffle__NotEnoughEther`)
              })

              it("records players when they enter", async function () {
                  // raffleentrance
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  const playerFromContract = await raffle.getPlayer(0)
                  assert.equal(playerFromContract, deployer)
              })

              it("emits event on enter", async function () {
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(
                      raffle,
                      "RaffleEnter"
                  )
              })

              it("doesnt allow entrance when raffle is calculating", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  //time travel
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  // we pretend to be chainlink keeper
                  await raffle.performUpkeep([])
                  await expect(
                      raffle.enterRaffle({ value: raffleEntranceFee })
                  ).to.be.revertedWithCustomError(raffle, "Raffle__NotOpen")
              })
          })

          describe("checkUpKeep", function () {
              it("returns false if peope havent sent any ETH", async function () {
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                  assert(!upkeepNeeded)
              })

              it("returns false if raffle isnt open", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  //time travel
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  await raffle.performUpkeep([])
                  const raffleState = await raffle.getRaffleState()
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                  assert.equal(raffleState.toString(), "1")
                  assert.equal(upkeepNeeded, false)
              })
              it("returns false if enough time hasn't passed", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() - 5]) // use a higher number here if this test fails
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                  assert(!upkeepNeeded)
              })
              it("returns true if enough time has passed, has players, eth, and is open", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                  assert(upkeepNeeded)
              })
          })

          describe("performUpkeep", function () {
              it("it can only run if checkupeep is true", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })

                  const tx = await raffle.performUpkeep([])
                  assert(tx)
              })

              it("reverts when checkupkeep is false", async function () {
                  await expect(raffle.performUpkeep([])).to.be.revertedWithCustomError(
                      raffle,
                      "Raffle__UpkeepNotNeeded"
                  )
              })

              it("updates the raffle state, emits an event, and calls the vrf coordinator", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })

                  const tx = await raffle.performUpkeep([])
                  const txReceipt: ContractReceipt = await tx.wait(1)
                  const requestId = txReceipt!.events![1].args!.requestId
                  const raffleState = await raffle.getRaffleState()
                  assert.isTrue(requestId.toNumber() > 0)
                  assert.equal(raffleState.toString(), "1")
              })
          })

          describe("fulfillRandomWords", function () {
              beforeEach(async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
              })

              it("can only be called after performUpkeep", async function () {
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
                  ).to.be.revertedWith("nonexistent request")
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)
                  ).to.be.revertedWith("nonexistent request")
              })

              it("picks a winner, resets, and sends money", async () => {
                  const additionalEntrances = 3
                  const startingIndex = 1
                  const accounts = await ethers.getSigners()
                  for (let i = startingIndex; i < startingIndex + additionalEntrances; i++) {
                      raffle = raffle.connect(accounts[i])
                      await raffle.enterRaffle({ value: raffleEntranceFee })
                  }
                  const startingTimeStamp = await raffle.getLastestTimeStamp()

                  // This will be more important for our staging tests...
                  await new Promise<void>(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          console.log("WinnerPicked event fired!")
                          // assert throws an error if it fails, so we need to wrap
                          // it in a try/catch so that the promise returns event
                          // if it fails.
                          try {
                              // Now lets get the ending values...
                              const recentWinner = await raffle.getRecentWinner()
                              const raffleState = await raffle.getRaffleState()
                              const winnerBalance = await accounts[1].getBalance()
                              const endingTimeStamp = await raffle.getLastestTimeStamp()
                              await expect(raffle.getPlayer(0)).to.be.reverted
                              assert.equal(recentWinner.toString(), accounts[1].address)
                              assert.equal(raffleState, 0)
                              assert.equal(
                                  winnerBalance.toString(),
                                  startingBalance
                                      .add(
                                          raffleEntranceFee
                                              .mul(additionalEntrances)
                                              .add(raffleEntranceFee)
                                      )
                                      .toString()
                              )
                              assert(endingTimeStamp > startingTimeStamp)
                              resolve()
                          } catch (e) {
                              reject(e)
                          }
                      })

                      const tx = await raffle.performUpkeep("0x")
                      const txReceipt = await tx.wait(1)
                      const startingBalance = await accounts[1].getBalance()
                      await vrfCoordinatorV2Mock.fulfillRandomWords(
                          txReceipt!.events![1].args!.requestId,
                          raffle.address
                      )
                  })
              })
          })
      })

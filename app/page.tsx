"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Wallet, Users, Trophy, Dice6 } from "lucide-react"

// Mock ABI - Replace with your actual contract ABI
const CONTRACT_ABI = [
  "function buyTicket() external payable",
  "function drawNumbers() external",
  "function getParticipantCount() external view returns (uint256)",
  "function getLastWinner() external view returns (address)",
  "function getLastDrawnNumbers() external view returns (uint256[])",
  "function owner() external view returns (address)",
  "event TicketPurchased(address indexed player, uint256 ticketNumber)",
  "event NumbersDrawn(uint256[] numbers, address winner, uint256 prize)",
]

// Replace with your actual contract address
const CONTRACT_ADDRESS = "0x1234567890123456789012345678901234567890"
const TICKET_PRICE = "0.01" // ETH

export default function EtherMillionsApp() {
  const [account, setAccount] = useState<string>("")
  const [contract, setContract] = useState<ethers.Contract | null>(null)
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null)
  const [participantCount, setParticipantCount] = useState<number>(0)
  const [lastWinner, setLastWinner] = useState<string>("")
  const [lastDrawnNumbers, setLastDrawnNumbers] = useState<number[]>([])
  const [isOwner, setIsOwner] = useState<boolean>(false)
  const [status, setStatus] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(false)

  // Connect to MetaMask
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        setStatus("Please install MetaMask!")
        return
      }

      const provider = new ethers.BrowserProvider(window.ethereum)
      const accounts = await provider.send("eth_requestAccounts", [])
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)

      setProvider(provider)
      setSigner(signer)
      setContract(contract)
      setAccount(accounts[0])
      setStatus("Wallet connected successfully!")

      // Check if user is owner
      try {
        const owner = await contract.owner()
        setIsOwner(owner.toLowerCase() === accounts[0].toLowerCase())
      } catch (error) {
        console.log("Could not fetch owner:", error)
      }

      // Load initial data
      await loadContractData(contract)
    } catch (error) {
      console.error("Error connecting wallet:", error)
      setStatus("Failed to connect wallet")
    }
  }

  // Load contract data
  const loadContractData = async (contractInstance?: ethers.Contract) => {
    const contractToUse = contractInstance || contract
    if (!contractToUse) return

    try {
      // Get participant count
      const count = await contractToUse.getParticipantCount()
      setParticipantCount(Number(count))

      // Get last winner (if available)
      try {
        const winner = await contractToUse.getLastWinner()
        setLastWinner(winner)
      } catch (error) {
        console.log("No previous winner or function not available")
      }

      // Get last drawn numbers (if available)
      try {
        const numbers = await contractToUse.getLastDrawnNumbers()
        setLastDrawnNumbers(numbers.map((n: bigint) => Number(n)))
      } catch (error) {
        console.log("No previous drawn numbers or function not available")
      }
    } catch (error) {
      console.error("Error loading contract data:", error)
    }
  }

  // Buy lottery ticket
  const buyTicket = async () => {
    if (!contract || !signer) {
      setStatus("Please connect your wallet first")
      return
    }

    try {
      setIsLoading(true)
      setStatus("Purchasing ticket...")

      const tx = await contract.buyTicket({
        value: ethers.parseEther(TICKET_PRICE),
      })

      setStatus("Transaction submitted. Waiting for confirmation...")
      await tx.wait()

      setStatus("Ticket purchased successfully!")
      await loadContractData()
    } catch (error: any) {
      console.error("Error buying ticket:", error)
      if (error.code === "ACTION_REJECTED") {
        setStatus("Transaction cancelled by user")
      } else {
        setStatus("Failed to purchase ticket: " + (error.reason || error.message))
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Draw numbers (owner only)
  const drawNumbers = async () => {
    if (!contract || !isOwner) {
      setStatus("Only the contract owner can draw numbers")
      return
    }

    try {
      setIsLoading(true)
      setStatus("Drawing numbers...")

      const tx = await contract.drawNumbers()
      setStatus("Transaction submitted. Waiting for confirmation...")
      await tx.wait()

      setStatus("Numbers drawn successfully!")
      await loadContractData()
    } catch (error: any) {
      console.error("Error drawing numbers:", error)
      if (error.code === "ACTION_REJECTED") {
        setStatus("Transaction cancelled by user")
      } else {
        setStatus("Failed to draw numbers: " + (error.reason || error.message))
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length === 0) {
          setAccount("")
          setContract(null)
          setProvider(null)
          setSigner(null)
          setIsOwner(false)
          setStatus("Wallet disconnected")
        } else {
          setAccount(accounts[0])
          connectWallet()
        }
      })
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners("accountsChanged")
      }
    }
  }, [])

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    if (contract) {
      const interval = setInterval(() => {
        loadContractData()
      }, 30000)

      return () => clearInterval(interval)
    }
  }, [contract])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-8">
          <h1 className="text-4xl font-bold text-white mb-2">🎰 EtherMillions</h1>
          <p className="text-purple-200">Decentralized Ethereum Lottery</p>
        </div>

        {/* Wallet Connection */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Wallet className="w-5 h-5" />
              Wallet Connection
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!account ? (
              <Button onClick={connectWallet} className="w-full">
                Connect MetaMask
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-white">
                  Connected: {account.slice(0, 6)}...{account.slice(-4)}
                </p>
                {isOwner && (
                  <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-300">
                    Contract Owner
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Messages */}
        {status && (
          <Alert className="bg-blue-500/20 border-blue-400/50">
            <AlertDescription className="text-blue-100">{status}</AlertDescription>
          </Alert>
        )}

        {/* Main Actions */}
        {account && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Buy Ticket */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Buy Lottery Ticket</CardTitle>
                <CardDescription className="text-purple-200">Purchase a ticket for {TICKET_PRICE} ETH</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={buyTicket} disabled={isLoading} className="w-full bg-green-600 hover:bg-green-700">
                  {isLoading ? "Processing..." : `Buy Ticket (${TICKET_PRICE} ETH)`}
                </Button>
              </CardContent>
            </Card>

            {/* Current Round Info */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Users className="w-5 h-5" />
                  Current Round
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{participantCount}</div>
                  <div className="text-purple-200">Participants</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Last Round Results */}
        {account && (lastWinner || lastDrawnNumbers.length > 0) && (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Trophy className="w-5 h-5" />
                Last Round Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lastWinner && lastWinner !== "0x0000000000000000000000000000000000000000" && (
                <div>
                  <p className="text-purple-200 mb-1">Winner:</p>
                  <p className="text-white font-mono">{lastWinner}</p>
                </div>
              )}
              {lastDrawnNumbers.length > 0 && (
                <div>
                  <p className="text-purple-200 mb-2">Drawn Numbers:</p>
                  <div className="flex gap-2 flex-wrap">
                    {lastDrawnNumbers.map((number, index) => (
                      <Badge key={index} variant="secondary" className="bg-purple-500/20 text-purple-200">
                        {number}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Owner Controls */}
        {account && isOwner && (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Dice6 className="w-5 h-5" />
                Owner Controls
              </CardTitle>
              <CardDescription className="text-purple-200">Contract owner functions</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={drawNumbers} disabled={isLoading} className="w-full bg-red-600 hover:bg-red-700">
                {isLoading ? "Processing..." : "Draw Numbers"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-purple-300 text-sm">
          <p>Contract Address: {CONTRACT_ADDRESS}</p>
          <p className="mt-2">⚠️ This is a demo. Please verify contract address and functions before use.</p>
        </div>
      </div>
    </div>
  )
}

"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import { BrowserProvider, Contract } from "ethers"
import { 
  PROTOCOL_ADDRESS, 
  PROTOCOL_ABI, 
  CHAIN_ID,
  getActiveContractAddress,
  getCoreContractABI
} from "@/lib/contracts/abi"

interface Web3ContextType {
  address: string | null
  isConnected: boolean
  isConnecting: boolean
  chainId: number | null
  isCorrectChain: boolean
  connect: () => Promise<void>
  disconnect: () => void
  switchChain: () => Promise<void>
  getContract: () => Contract | null
  getProvider: () => BrowserProvider | null
  getSigner: () => Promise<any>
  // Role checks
  isContractOwner: boolean
  checkIsContractOwner: () => Promise<boolean>
}

const Web3Context = createContext<Web3ContextType | null>(null)

export function Web3Provider({ children }: { children: ReactNode }) {
  // ✅ PERSISTENCE: Load wallet connection from localStorage on mount
  const [address, setAddress] = useState<string | null>(() => {
    if (typeof window === "undefined") return null
    try {
      const saved = localStorage.getItem("web3_wallet_address")
      return saved || null
    } catch {
      return null
    }
  })
  const [chainId, setChainId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null
    try {
      const saved = localStorage.getItem("web3_chain_id")
      return saved ? Number(saved) : null
    } catch {
      return null
    }
  })
  const [isConnecting, setIsConnecting] = useState(false)
  const [isContractOwner, setIsContractOwner] = useState(false)
  const [provider, setProvider] = useState<BrowserProvider | null>(null)

  const isConnected = !!address
  const isCorrectChain = chainId === CHAIN_ID

  // ✅ PERSISTENCE: Save wallet state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      if (address) {
        localStorage.setItem("web3_wallet_address", address)
      } else {
        localStorage.removeItem("web3_wallet_address")
      }
    } catch (e) {
      console.warn("[Web3Provider] Failed to save wallet address:", e)
    }
  }, [address])

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      if (chainId) {
        localStorage.setItem("web3_chain_id", chainId.toString())
      } else {
        localStorage.removeItem("web3_chain_id")
      }
    } catch (e) {
      console.warn("[Web3Provider] Failed to save chain ID:", e)
    }
  }, [chainId])

  const getProvider = useCallback(() => {
    if (typeof window === "undefined" || !window.ethereum) return null
    return new BrowserProvider(window.ethereum)
  }, [])

  const getContract = useCallback(() => {
    const prov = getProvider()
    if (!prov) return null
    // Use Core contract for write operations (tokenURI, owner, etc.)
    return new Contract(getActiveContractAddress(), getCoreContractABI(), prov)
  }, [getProvider])

  const getSigner = useCallback(async () => {
    const prov = getProvider()
    if (!prov) return null
    return prov.getSigner()
  }, [getProvider])

  const checkIsContractOwner = useCallback(async (): Promise<boolean> => {
    if (!address) {
      setIsContractOwner(false)
      return false
    }
    
    // ✅ NON-BLOCKING: Contract owner check is optional (for admin features)
    // Don't fail the app if this check fails - just set to false silently
    const tryCheck = async (usePublicRpc = false): Promise<string | null> => {
      try {
        let prov: BrowserProvider | any
        if (usePublicRpc) {
          // Fallback to public RPC
          const { JsonRpcProvider } = await import("ethers")
          prov = new JsonRpcProvider("https://mainnet.base.org")
        } else {
          prov = getProvider()
        }
        if (!prov) return null
        
        const contract = new Contract(PROTOCOL_ADDRESS, PROTOCOL_ABI, prov)
        const owner = await contract.owner()
        return owner
      } catch (error) {
        // Silently fail - don't log errors for optional checks
        return null
      }
    }

    try {
      // Try with MetaMask provider first
      let owner = await tryCheck(false)
      
      // If failed, try with public RPC
      if (!owner) {
        owner = await tryCheck(true)
      }
      
      if (owner) {
        const isOwner = owner.toLowerCase() === address.toLowerCase()
        setIsContractOwner(isOwner)
        return isOwner
      }
      
      // If check fails, just set to false (don't error)
      setIsContractOwner(false)
      return false
    } catch (error) {
      // Silently fail - don't break the app
      setIsContractOwner(false)
      return false
    }
  }, [address, getProvider])

  const connect = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("MetaMask is not installed")
    }

    setIsConnecting(true)
    try {
      const prov = new BrowserProvider(window.ethereum)
      setProvider(prov)

      const accounts = await prov.send("eth_requestAccounts", [])
      const network = await prov.getNetwork()

      setAddress(accounts[0])
      setChainId(Number(network.chainId))
    } catch (error: any) {
      // Error code 4001 = user rejected the request
      // ACTION_REJECTED is the ethers.js error code for user rejection
      if (error?.code === 4001 || error?.code === "ACTION_REJECTED" || error?.info?.error?.code === 4001) {
        // User rejected - this is expected behavior, just return silently
        setIsConnecting(false)
        return
      }
      // For other errors, log but don't throw to avoid crashing the UI
      console.error("Failed to connect wallet:", error?.message || error)
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    setAddress(null)
    setChainId(null)
    setIsContractOwner(false)
    setProvider(null)
    // Clear persisted state
    try {
      localStorage.removeItem("web3_wallet_address")
      localStorage.removeItem("web3_chain_id")
    } catch (e) {
      console.warn("[Web3Provider] Failed to clear persisted state:", e)
    }
  }, [])

  const switchChain = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) return

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
      })
    } catch (switchError: any) {
      // Chain not added, try to add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${CHAIN_ID.toString(16)}`,
                chainName: "Base",
                nativeCurrency: {
                  name: "ETH",
                  symbol: "ETH",
                  decimals: 18,
                },
                rpcUrls: ["https://mainnet.base.org", "https://base.publicnode.com"],
                blockExplorerUrls: ["https://basescan.org"],
              },
            ],
          })
        } catch (addError) {
          console.error("Failed to add chain:", addError)
        }
      }
    }
  }, [])

  // ✅ PERSISTENCE: Restore wallet connection on mount if previously connected
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return
    
    // If we have a saved address, try to restore connection
    if (address && !provider) {
      const restoreConnection = async () => {
        try {
          const prov = new BrowserProvider(window.ethereum)
          setProvider(prov)
          
          // Verify the saved address is still connected
          const accounts = await prov.send("eth_accounts", [])
          if (accounts.length > 0 && accounts[0].toLowerCase() === address.toLowerCase()) {
            const network = await prov.getNetwork()
            setChainId(Number(network.chainId))
            console.log("[Web3Provider] ✅ Restored wallet connection:", address)
          } else {
            // Address changed, clear saved state
            setAddress(null)
            setChainId(null)
            localStorage.removeItem("web3_wallet_address")
            localStorage.removeItem("web3_chain_id")
          }
        } catch (error) {
          console.warn("[Web3Provider] Failed to restore connection:", error)
          // Clear invalid state
          setAddress(null)
          setChainId(null)
          localStorage.removeItem("web3_wallet_address")
          localStorage.removeItem("web3_chain_id")
        }
      }
      restoreConnection()
    }
  }, [address, provider])

  // Listen for account and chain changes
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect()
      } else {
        const newAddress = accounts[0]
        setAddress(newAddress)
        // Update localStorage
        try {
          localStorage.setItem("web3_wallet_address", newAddress)
        } catch (e) {
          console.warn("[Web3Provider] Failed to save address:", e)
        }
      }
    }

    const handleChainChanged = (chainIdHex: string) => {
      const newChainId = Number.parseInt(chainIdHex, 16)
      setChainId(newChainId)
      // Update localStorage
      try {
        localStorage.setItem("web3_chain_id", newChainId.toString())
      } catch (e) {
        console.warn("[Web3Provider] Failed to save chain ID:", e)
      }
    }

    window.ethereum.on("accountsChanged", handleAccountsChanged)
    window.ethereum.on("chainChanged", handleChainChanged)

    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged)
      window.ethereum?.removeListener("chainChanged", handleChainChanged)
    }
  }, [disconnect])

  // Check owner status when address changes
  useEffect(() => {
    if (address && isCorrectChain) {
      checkIsContractOwner()
    }
  }, [address, isCorrectChain, checkIsContractOwner])

  return (
    <Web3Context.Provider
      value={{
        address,
        isConnected,
        isConnecting,
        chainId,
        isCorrectChain,
        connect,
        disconnect,
        switchChain,
        getContract,
        getProvider,
        getSigner,
        isContractOwner,
        checkIsContractOwner,
      }}
    >
      {children}
    </Web3Context.Provider>
  )
}

export function useWeb3() {
  const context = useContext(Web3Context)
  if (!context) {
    throw new Error("useWeb3 must be used within a Web3Provider")
  }
  return context
}

// Extend window type for ethereum
declare global {
  interface Window {
    ethereum?: any
  }
}

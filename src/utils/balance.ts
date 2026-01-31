/**
 * Balance utilities for L1 and L2 token balance queries
 */

import { formatUnits } from 'viem'

const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

/**
 * Fetch ERC20 token balance on L1
 */
export async function getL1TokenBalance(
  l1Client: any,
  tokenAddress: string,
  walletAddress: string,
): Promise<bigint> {
  return l1Client.readContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [walletAddress as `0x${string}`],
  })
}

/**
 * Fetch public and private token balances on L2 (Aztec)
 */
export async function getL2TokenBalances(
  tokenContract: any,
  ownerAddress: any,
): Promise<{ public: bigint; private: bigint }> {
  const [publicBalance, privateBalance] = await Promise.all([
    tokenContract.methods.balance_of_public(ownerAddress).simulate({from: ownerAddress}),
    tokenContract.methods.balance_of_private(ownerAddress).simulate({from: ownerAddress}),
  ])
  return {
    public: publicBalance,
    private: privateBalance,
  }
}

/**
 * Format a bigint balance to a human-readable string
 */
export function formatBalance(balance: bigint, decimals: number = 18): string {
  return formatUnits(balance, decimals)
}

/**
 * Log L1 and L2 balances with a label
 */
export async function logBalances(
  label: string,
  l1Client: any,
  l1TokenAddress: string,
  l1WalletAddress: string,
  tokenContract: any,
  l2OwnerAddress: any,
  symbol: string,
  logger: any,
): Promise<void> {
  logger.info('')
  logger.info(`=== ${label} ===`)

  const l1Balance = await getL1TokenBalance(l1Client, l1TokenAddress, l1WalletAddress)
  logger.info(`L1 ${symbol} Balance: ${formatBalance(l1Balance)} ${symbol}`)

  const l2Balances = await getL2TokenBalances(tokenContract, l2OwnerAddress)
  logger.info(`L2 ${symbol} Public Balance: ${formatBalance(l2Balances.public)} ${symbol}`)
  logger.info(`L2 ${symbol} Private Balance: ${formatBalance(l2Balances.private)} ${symbol}`)
  logger.info('')
}

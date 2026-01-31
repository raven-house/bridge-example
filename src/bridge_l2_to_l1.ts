/**
 * L2 to L1 Token Bridge Script using Raven Bridge SDK
 *
 * This script demonstrates bridging tokens from Aztec L2 (Devnet) to Ethereum L1 (Sepolia)
 * using the @ravenhouse/bridge-sdk package. Supports both public and private (from private balance) transfers.
 *
 * Environment Variables Required:
 * - AZTEC_ENV: Environment (devnet/sandbox/testnet)
 * - ETHEREUM_WALLET_PRIVATE_KEY: Private key for L1 wallet
 * - ADMIN_SECRET_KEY: Secret key for L2 account
 * - ADMIN_SIGNING_KEY: Signing key for L2 account
 * - ADMIN_SALT: Salt for L2 account
 * - BRIDGE_AMOUNT: Amount to bridge (optional, defaults to 1)
 * - BRIDGE_PRIVATE: Set to "true" to withdraw from private balance (optional, defaults to public)
 *
 * Usage:
 *   # Public transfer (from public balance)
 *   AZTEC_ENV=devnet bun run src/bridge_l2_to_l1.ts
 *
 *   # Private transfer (from private balance)
 *   AZTEC_ENV=devnet BRIDGE_PRIVATE=true bun run src/bridge_l2_to_l1.ts
 */

import { waitForNode } from '@aztec/aztec.js/node'
import { TestWallet } from '@aztec/test-wallet/server'
import { SponsoredFPCContract } from '@aztec/noir-contracts.js/SponsoredFPC'
import { AztecAddress } from '@aztec/aztec.js/addresses'
import { TokenBridgeContract } from '@aztec/noir-contracts.js/TokenBridge'
import { TokenContract } from '@aztec/noir-contracts.js/Token'
import { SponsoredFeePaymentMethod } from '@aztec/aztec.js/fee'
import { createExtendedL1Client } from '@aztec/ethereum/client'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia, foundry } from 'viem/chains'
import * as dotenv from 'dotenv'

// SDK imports from npm package
import {
  CompliantBridge,
  CachedAztecNode,
  TestWalletAdapter,
  networks,
  createLogger,
  type BridgeStep,
} from '@ravenhouse/bridge-sdk'

// Script utilities
import { getAccountFromEnv } from './utils/create_account_from_env.js'
import { getSponsoredFPCInstance } from './utils/sponsored_fpc.js'
import { logBalances } from './utils/balance.js'


// Load environment variables
dotenv.config()

// ============================================================================
// Configuration
// ============================================================================

const BRIDGE_AMOUNT = process.env.BRIDGE_AMOUNT || '1' // Amount to bridge (in token units)
const BRIDGE_PRIVATE = process.env.BRIDGE_PRIVATE === 'true' // Whether to withdraw from private balance

// Get network config based on AZTEC_ENV
const ENV = (process.env.AZTEC_ENV || 'devnet') as
  | 'devnet'
  | 'sandbox'
  | 'testnet'
const networkConfig = networks[ENV]

if (!networkConfig) {
  console.error(
    `Invalid AZTEC_ENV: ${ENV}. Must be one of: devnet, sandbox, testnet`,
  )
  process.exit(1)
}

const logger = createLogger('bridge-l2-to-l1')

// ============================================================================
// Main Script
// ============================================================================

async function main() {
  const transferMode = BRIDGE_PRIVATE ? 'PRIVATE' : 'PUBLIC'

  logger.info('='.repeat(60))
  logger.info('Raven Bridge SDK - L2 to L1 Token Bridge')
  logger.info('='.repeat(60))
  logger.info(`Environment: ${networkConfig.name}`)
  logger.info(`Transfer Mode: ${transferMode}`)
  logger.info(`L1 RPC: ${networkConfig.network.l1RpcUrl}`)
  logger.info(`L2 Node: ${networkConfig.network.nodeUrl}`)
  logger.info('')

  // -------------------------------------------------------------------------
  // Step 1: Setup L1 Wallet (Ethereum/Sepolia)
  // -------------------------------------------------------------------------
  logger.info('Step 1: Setting up L1 wallet...')

  const privateKey = process.env.ETHEREUM_WALLET_PRIVATE_KEY
  if (!privateKey) {
    throw new Error(
      'ETHEREUM_WALLET_PRIVATE_KEY environment variable is required',
    )
  }

  const privateKeyAccount = privateKeyToAccount(
    `0x${privateKey.replace('0x', '')}`,
  )
  const chain = ENV === 'sandbox' ? foundry : sepolia

  const l1Client = createExtendedL1Client(
    networkConfig.network.l1RpcUrl.split(','),
    privateKeyAccount as any,
    chain,
  )

  logger.info(`L1 Wallet Address: ${l1Client.account.address}`)

  // -------------------------------------------------------------------------
  // Step 2: Setup L2 Wallet (Aztec)
  // -------------------------------------------------------------------------
  logger.info('')
  logger.info('Step 2: Setting up L2 wallet...')

  // Initialize the CachedAztecNode with the network URL
  CachedAztecNode.initialize(networkConfig.network.nodeUrl)

  const node = CachedAztecNode.getInstance()
  await waitForNode(node)
  logger.info('Connected to Aztec node')

  // Create test wallet with prover enabled for devnet/testnet
  const testWallet = await TestWallet.create(node, {
    proverEnabled: networkConfig.settings.skipSandbox,
  })
  logger.info('Test wallet created')

  // Get account from environment
  const accountManager = await getAccountFromEnv(testWallet)
  const ownerAztecAddress = (await accountManager.getAccount()).getAddress()
  logger.info(`L2 Account Address: ${ownerAztecAddress}`)

  // Setup Sponsored FPC for gas payments
  const sponsoredFPC = await getSponsoredFPCInstance()
  await testWallet.registerContract(sponsoredFPC, SponsoredFPCContract.artifact)
  const sponsoredPaymentMethod = new SponsoredFeePaymentMethod(
    sponsoredFPC.address,
  )
  logger.info(`Sponsored FPC registered: ${sponsoredFPC.address}`)

    // Register the bridge contract (needed for claim step) // RHT token
    const bridgeAddress = networkConfig.tokens[0].l2.bridgeAddress;
    const bridgeInstance = await node.getContract(AztecAddress.fromString(bridgeAddress))
    if (!bridgeInstance) {
      throw new Error(`Bridge contract not found at ${bridgeAddress}`)
    }
    await testWallet.registerContract(bridgeInstance, TokenBridgeContract.artifact)
    logger.info(`Bridge contract registered: ${bridgeAddress}`)
  
    // Register the token contract (needed for claim step) // RHT token
    const tokenAddress = networkConfig.tokens[0].l2.tokenAddress;
    const tokenInstance = await node.getContract(AztecAddress.fromString(tokenAddress))
    if (!tokenInstance) {
      throw new Error(`Token contract not found at ${tokenAddress}`)
    }
    await testWallet.registerContract(tokenInstance, TokenContract.artifact)
    logger.info(`Token contract registered: ${tokenAddress}`)

    // Get token contract instance for balance queries
    const tokenContract = await TokenContract.at(AztecAddress.fromString(tokenAddress), testWallet)


  // Create TestWalletAdapter for SDK compatibility
  const l2WalletAdapter = new TestWalletAdapter(
    testWallet,
    ownerAztecAddress,
    sponsoredPaymentMethod,
  )

  // -------------------------------------------------------------------------
  // Step 3: Initialize CompliantBridge
  // -------------------------------------------------------------------------
  logger.info('')
  logger.info('Step 3: Initializing CompliantBridge...')

  const bridge = new CompliantBridge({
    network: networkConfig,
    l1Wallet: l1Client,
    l2Wallet: l2WalletAdapter,
    backendApiUrl: networkConfig.backend.zk_verify,
  })

  // Get the RHT token config
  const rhtToken = bridge.getToken('RHT')
  if (!rhtToken) {
    throw new Error('RHT token not found in network configuration')
  }

  logger.info(`Token: ${rhtToken.name} (${rhtToken.symbol})`)
  logger.info(`L2 Token: ${rhtToken.l2.tokenAddress}`)
  logger.info(`L2 Bridge: ${rhtToken.l2.bridgeAddress}`)
  logger.info(`L1 Token: ${rhtToken.l1.tokenAddress}`)
  logger.info(`L1 Portal: ${rhtToken.l1.portalAddress}`)

  // -------------------------------------------------------------------------
  // Step 4: Execute L2 to L1 Bridge
  // -------------------------------------------------------------------------
  logger.info('')
  logger.info('Step 4: Executing L2 to L1 bridge...')
  logger.info(`Amount: ${BRIDGE_AMOUNT} ${rhtToken.symbol}`)
  logger.info(`Mode: ${BRIDGE_PRIVATE ? 'Private (from private balance)' : 'Public (from public balance)'}`)
  logger.info('')

  if (BRIDGE_PRIVATE) {
    logger.info('NOTE: Private transfer will withdraw from your private (shielded) balance.')
    logger.info('      Tokens will be unshielded and sent to L1.')
    logger.info('')
  }

  logger.info('NOTE: This operation includes waiting for block proof generation,')
  logger.info('      which can take several minutes on devnet/testnet.')
  logger.info('')

  // Log balances before bridging
  await logBalances(
    'BEFORE BRIDGE',
    l1Client,
    rhtToken.l1.tokenAddress,
    l1Client.account.address,
    tokenContract,
    ownerAztecAddress,
    rhtToken.symbol,
    logger,
  )

  const onStep = (step: BridgeStep) => {
    const statusIcon = getStepStatusIcon(step.status)
    logger.info(
      `${statusIcon} [${step.id}] ${step.label}: ${step.description || step.status}`,
    )
  }

  try {
    const result = await bridge.bridgeL2ToL1({
      token: rhtToken,
      amount: BRIDGE_AMOUNT,
      isPrivate: BRIDGE_PRIVATE,
      onStep,
    })

    logger.info('')
    logger.info('='.repeat(60))
    logger.info('Bridge Result')
    logger.info('='.repeat(60))
    logger.info(`Success: ${result.success}`)
    logger.info(`Direction: ${result.direction}`)
    logger.info(`Amount: ${result.amount} ${result.symbol}`)
    logger.info(`Message: ${result.message}`)

    if (result.finalTxHash) {
      logger.info(`Transaction Hash: ${result.finalTxHash}`)
    }
    if (result.explorerUrl) {
      logger.info(`Explorer URL: ${result.explorerUrl}`)
    }

    logger.info('')
    logger.info('Steps Summary:')
    for (const step of result.steps) {
      const icon = getStepStatusIcon(step.status)
      logger.info(`  ${icon} ${step.label}: ${step.status}`)
    }

    // Log balances after bridging
    await logBalances(
      'AFTER BRIDGE',
      l1Client,
      rhtToken.l1.tokenAddress,
      l1Client.account.address,
      tokenContract,
      ownerAztecAddress,
      rhtToken.symbol,
      logger,
    )

    logger.info('')
    logger.info('Bridge completed successfully!')
    logger.info('Tokens have been withdrawn to your L1 wallet.')
  } catch (error) {
    logger.error('')
    logger.error('Bridge failed!')
    logger.error(
      `Error: ${error instanceof Error ? error.message : String(error)}`,
    )
    process.exit(1)
  }
}

// ============================================================================
// Utilities
// ============================================================================

function getStepStatusIcon(status: string): string {
  switch (status) {
    case 'pending':
      return '⏳'
    case 'loading':
      return '🔄'
    case 'completed':
      return '✅'
    case 'error':
      return '❌'
    default:
      return '•'
  }
}

// ============================================================================
// Run
// ============================================================================

main().catch((error) => {
  console.error('Unhandled error:', error)
  process.exit(1)
})

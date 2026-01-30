import { Fr, GrumpkinScalar } from '@aztec/aztec.js/fields'
import { createLogger } from '@aztec/aztec.js/log'
import { AccountManager } from '@aztec/aztec.js/wallet'
import { TestWallet } from '@aztec/test-wallet/server'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

export async function createAccountFromEnv(
  wallet: TestWallet,
): Promise<AccountManager> {
  const logger = createLogger('aztec:create-account')

  logger.info('Creating Schnorr account from environment variables...')

  // Read SECRET and SALT from environment variables
  const secretEnv = process.env.ADMIN_SECRET_KEY
  const signingKeyEnv = process.env.ADMIN_SIGNING_KEY
  const saltEnv = process.env.ADMIN_SALT

  if (!secretEnv) {
    throw new Error(
      'ADMIN_SECRET_KEY environment variable is required. Please set it in your .env file.',
    )
  }

  if (!signingKeyEnv) {
    throw new Error(
      'ADMIN_SIGNING_KEY environment variable is required. Please set it in your .env file.',
    )
  }

  if (!saltEnv) {
    throw new Error(
      'ADMIN_SALT environment variable is required. Please set it in your .env file.',
    )
  }

  // Convert hex strings to Fr values
  let secretKey: Fr
  let signingKey: GrumpkinScalar
  let salt: Fr

  try {
    secretKey = Fr.fromString(secretEnv)
    signingKey = GrumpkinScalar.fromString(signingKeyEnv)
    salt = Fr.fromString(saltEnv)
    logger.info('Successfully parsed SECRET and SALT values')
  } catch (error) {
    logger.error(`Failed to parse SECRET and SALT values: ${error}`)
    throw new Error(
      'Invalid SECRET or SALT format. Please ensure they are valid hex strings starting with "0x".',
    )
  }

  // Create Schnorr account with specified values
  logger.info('Creating Schnorr account instance with environment values...')
  const schnorrAccount = await wallet.createSchnorrAccount(
    secretKey,
    salt,
    signingKey,
  )
  const accountAddress = schnorrAccount.address
  logger.info(`Account address: ${accountAddress}`)

  // Check if account is already deployed
  logger.info('Checking if account is already deployed...')
  try {
    const registeredAccounts = await wallet.getAccounts()
    const isRegistered = registeredAccounts.some((acc) =>
      acc.item.equals(accountAddress),
    )

    if (isRegistered) {
      logger.info('Account is already registered with PXE')
    } else {
      logger.info(
        'Account is not yet registered. You may need to deploy it first.',
      )
    }
  } catch (error) {
    logger.warn(`Could not check account registration: ${error}`)
  }

  logger.info('Schnorr account instance created successfully!')
  logger.info(`Account Summary:`)
  logger.info(`   - Address: ${accountAddress}`)
  logger.info(`   - SECRET (truncated): ${secretEnv.substring(0, 10)}...`)
  logger.info(`   - SALT (truncated): ${saltEnv.substring(0, 10)}...`)

  return schnorrAccount
}

export async function getAccountFromEnv(
  wallet: TestWallet,
): Promise<AccountManager> {
  return await createAccountFromEnv(wallet)
}

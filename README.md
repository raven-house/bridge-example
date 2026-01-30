# Raven Bridge SDK Examples

Example scripts demonstrating how to use the `@ravenhouse/bridge-sdk` package for bridging tokens between Ethereum L1 and Aztec L2. Supports both public and private (shielded) transfers.

## Prerequisites

- [Bun](https://bun.sh/) runtime installed
- Aztec sandbox or access to devnet/testnet
- Ethereum wallet with funds (Sepolia ETH for devnet/testnet)
- Aztec account credentials

## Installation

```bash
bun install
```

## Configuration

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Fill in your credentials in `.env`:

```env
# Aztec Environment (devnet/sandbox/testnet)
AZTEC_ENV=devnet

# L1 Wallet (Ethereum/Sepolia)
ETHEREUM_WALLET_PRIVATE_KEY=your_ethereum_private_key_here

# L2 Account (Aztec)
ADMIN_SECRET_KEY=0x...
ADMIN_SIGNING_KEY=0x...
ADMIN_SALT=0x...

# Bridge Configuration (optional)
BRIDGE_AMOUNT=2
BRIDGE_PRIVATE=false
```

## Usage

### Bridge L1 to L2 (Ethereum → Aztec)

#### Public Transfer (to public balance)

```bash
# Devnet
bun run bridge:l1-to-l2:devnet

# Sandbox (local)
bun run bridge:l1-to-l2:sandbox

# Testnet
bun run bridge:l1-to-l2:testnet
```

#### Private Transfer (to private/shielded balance)

```bash
# Devnet
bun run bridge:l1-to-l2:devnet:private

# Sandbox (local)
bun run bridge:l1-to-l2:sandbox:private

# Testnet
bun run bridge:l1-to-l2:testnet:private
```

### Bridge L2 to L1 (Aztec → Ethereum)

#### Public Transfer (from public balance)

```bash
# Devnet
bun run bridge:l2-to-l1:devnet

# Sandbox (local)
bun run bridge:l2-to-l1:sandbox

# Testnet
bun run bridge:l2-to-l1:testnet
```

#### Private Transfer (from private/shielded balance)

```bash
# Devnet
bun run bridge:l2-to-l1:devnet:private

# Sandbox (local)
bun run bridge:l2-to-l1:sandbox:private

# Testnet
bun run bridge:l2-to-l1:testnet:private
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `AZTEC_ENV` | Network environment (`devnet`, `sandbox`, `testnet`) | Yes |
| `ETHEREUM_WALLET_PRIVATE_KEY` | Private key for L1 wallet | Yes |
| `ADMIN_SECRET_KEY` | Secret key for L2 Schnorr account | Yes |
| `ADMIN_SIGNING_KEY` | Signing key for L2 Schnorr account | Yes |
| `ADMIN_SALT` | Salt for L2 account derivation | Yes |
| `BRIDGE_AMOUNT` | Amount to bridge (defaults to 2 for L1→L2, 1 for L2→L1) | No |
| `BRIDGE_PRIVATE` | Set to `true` for private transfers | No |

## Public vs Private Transfers

### L1 → L2 Transfers

- **Public**: Tokens are deposited to your public balance on Aztec L2. Visible on-chain.
- **Private**: Tokens are shielded and deposited to your private balance on Aztec L2. Not visible to observers.

### L2 → L1 Transfers

- **Public**: Withdraws from your public balance on L2, sends to L1.
- **Private**: Unshields tokens from your private balance, then withdraws to L1.

## Scripts Overview

### `src/bridge_l1_to_l2.ts`

Bridges tokens from Ethereum L1 to Aztec L2:
1. Sets up L1 wallet using the provided private key
2. Connects to Aztec node and sets up L2 wallet
3. Initializes the CompliantBridge with network configuration
4. Executes the bridge operation with step-by-step progress tracking
5. Supports both public and private (shielded) deposits on L2

### `src/bridge_l2_to_l1.ts`

Bridges tokens from Aztec L2 to Ethereum L1:
1. Sets up L1 wallet for receiving tokens
2. Connects to Aztec node and sets up L2 wallet
3. Burns tokens on L2 (from public or private balance) and waits for proof generation
4. Withdraws tokens on L1

## SDK Package

This project uses the `@ravenhouse/bridge-sdk` npm package which provides:

- `CompliantBridge` - Main bridge orchestrator class
- `CachedAztecNode` - Cached Aztec node connection
- `TestWalletAdapter` - Adapter for test wallet compatibility
- `networks` - Pre-configured network settings (devnet, sandbox, testnet)
- `createLogger` - Logging utility
- `BridgeStep` - Type for tracking bridge progress

## License

MIT

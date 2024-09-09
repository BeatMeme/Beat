# Beat Experimental Meme Token Contracts

$BEAT is an experimental ERC20 meme token on Arthera that explores automagic distribution to subscription holders.

## Disclaimer

$BEAT is an experimental community token with no intrinsic value or expectation of financial return.

There is no formal team or roadmap.

## Getting Started

### Prerequisites

- Node.js (v14 or later recommended)
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/beat-arthera/beat-token.git
   cd beat-token
   ```

2. Install dependencies:
   ```
   npm install
   ```
   or if you're using yarn:
   ```
   yarn install
   ```

### Compiling Contracts

Compile the smart contracts using Hardhat:
   ```
   npx hardhat compile
   ```

### Running Tests

Run the test suite:
   ```
   npx hardhat test
   ```

### Deployment

To deploy the contract to a network, update the `hardhat.config.ts` file with your network configuration and run:

   ```
   npx hardhat run scripts/deploy.ts --network <network-name>
   ```

Replace `<network-name>` with the name of the network you want to deploy to (e.g., `mainnet`, `rinkeby`, etc.).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
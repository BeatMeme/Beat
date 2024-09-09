import { ethers, network } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  let subscriptionsNFTAddress: string;
  let initialMintRecipient: string;

  // Get the initial mint recipient address from environment variable
  initialMintRecipient = process.env.INITIAL_MINT_RECIPIENT;
  if (!initialMintRecipient || !ethers.utils.isAddress(initialMintRecipient)) {
    console.error("Please provide a valid INITIAL_MINT_RECIPIENT environment variable.");
    process.exit(1);
  }

  if (network.name === "hardhat" || network.name === "localhost") {
    // Debug deployment on Hardhat network
    console.log("Debug deployment on Hardhat network");

    // Deploy a new SubscriptionsNFT for testing
    const SubscriptionsNFT = await ethers.getContractFactory("SubscriptionsNFT");
    const subscriptionsNFT = await SubscriptionsNFT.deploy();
    await subscriptionsNFT.deployed();
    subscriptionsNFTAddress = subscriptionsNFT.address;

  } else {
    // Production deployment
    console.log("Production deployment on", network.name);

    // Use the SubscriptionsNFT address from environment variable
    subscriptionsNFTAddress = process.env.SUBSCRIPTIONS_NFT_ADDRESS;
    if (!subscriptionsNFTAddress || !ethers.utils.isAddress(subscriptionsNFTAddress)) {
      console.error("Please provide a valid SUBSCRIPTIONS_NFT_ADDRESS environment variable.");
      process.exit(1);
    }
  }

  // Deploy Beat contract
  const Beat = await ethers.getContractFactory("Beat");
  const beat = await Beat.deploy(subscriptionsNFTAddress, initialMintRecipient);
  await beat.deployed();

  console.log("Beat token deployed to:", beat.address);
  console.log("Using SubscriptionsNFT at:", subscriptionsNFTAddress);
  console.log("Initial mint sent to:", initialMintRecipient);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
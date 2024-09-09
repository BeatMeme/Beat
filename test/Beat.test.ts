import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";

describe("Beat", function () {
  let beat: Contract;
  let subscriptionsNFT: Contract;
  let owner: Signer;
  let addr1: Signer;
  let addr2: Signer;
  let addr3: Signer;
  let initialMintRecipient: Signer;

  const MAX_CLAIMABLE_ID = 1_000_000;
  const INITIAL_MINT = ethers.utils.parseEther("500000000000");
  const MAX_PROCESSABLE_BALANCE = 10;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3, initialMintRecipient] = await ethers.getSigners();

    const SubscriptionsNFT = await ethers.getContractFactory("SubscriptionsNFT");
    subscriptionsNFT = await SubscriptionsNFT.deploy();
    await subscriptionsNFT.deployed();

    const Beat = await ethers.getContractFactory("Beat");
    beat = await Beat.deploy(subscriptionsNFT.address, await initialMintRecipient.getAddress());
    await beat.deployed();
  });

  it("Should have the correct name and symbol", async function () {
    expect(await beat.name()).to.equal("Beat Experimental Meme Token");
    expect(await beat.symbol()).to.equal("BEAT");
  });

  it("Should have the correct max supply", async function () {
    const expectedMaxSupply = INITIAL_MINT.add(
      ethers.utils.parseEther(((MAX_CLAIMABLE_ID * (MAX_CLAIMABLE_ID + 1)) / 2).toString())
    );
    expect(await beat.maxSupply()).to.equal(expectedMaxSupply);
  });

  it("Should return correct claimable subscription status", async function () {
    expect(await beat.claimableSubscription(0)).to.be.true;
    expect(await beat.claimableSubscription(999999)).to.be.true;
    expect(await beat.claimableSubscription(1000000)).to.be.false;
  });

  it("Should return correct claim amount", async function () {
    const testCases = [
      { id: 0, expected: ethers.utils.parseEther("1000000") },
      { id: 1, expected: ethers.utils.parseEther("999999") },
      { id: 500000, expected: ethers.utils.parseEther("500000") },
      { id: 999998, expected: ethers.utils.parseEther("2") },
      { id: 999999, expected: ethers.utils.parseEther("1") },
      { id: 1000000, expected: ethers.utils.parseEther("0") },
      { id: 1000001, expected: ethers.utils.parseEther("0") },
      { id: 2000000, expected: ethers.utils.parseEther("0") }
    ];
  
    for (const testCase of testCases) {
      expect(await beat.subscriptionAmount(testCase.id)).to.equal(testCase.expected);
    }
  });

  it("Should return correct claimable amount for various NFT quantities", async function () {
    const testCases = [
      { nfts: [], expected: "0" },
      { nfts: [0], expected: "1000000" },
      { nfts: [1, 2], expected: "1999997" },
      { nfts: [3, 4, 5], expected: "2999988" },
      { nfts: [6, 7, 8, 9, 10], expected: "4999960" },
      { nfts: [11, 12, 13, 14, 15, 16, 17, 18, 19], expected: "8999865" },
      { nfts: [20, 21, 22, 23, 24, 25, 26, 27, 28, 29], expected: "9999755" },
      { nfts: [30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40], expected: "9999655" }, // Should cap at 10 NFTs
      { nfts: [999998, 999999], expected: "3" },
      { nfts: [41, 1000000], expected: "999959" }, // NFT ID 1000000 should not be claimable
    ];
  
    const signers = await ethers.getSigners();
  
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const testAddress = signers[i + 1];
  
      for (const nftId of testCase.nfts) {
        await subscriptionsNFT.connect(owner).mint(await testAddress.getAddress(), nftId);
      }
  
      const expectedAmount = ethers.utils.parseEther(testCase.expected);
      expect(await beat.claimableAmount(await testAddress.getAddress())).to.equal(expectedAmount);
    }
  });

  it("Should claim tokens when transferring", async function () {
    await subscriptionsNFT.connect(owner).mint(await addr1.getAddress(), 0);
    await subscriptionsNFT.connect(owner).mint(await addr1.getAddress(), 1);

    await beat.connect(addr1).transfer(await addr2.getAddress(), 1);

    const expectedBalance = ethers.utils.parseEther("1999999").sub(1);
    expect(await beat.balanceOf(await addr1.getAddress())).to.equal(expectedBalance);
  });

  it("Should not allow claiming twice for the same NFT", async function () {
    await subscriptionsNFT.connect(owner).mint(await addr1.getAddress(), 0);
  
    await beat.connect(addr1).transfer(await addr2.getAddress(), 1);
  
    const expectedBalance = ethers.utils.parseEther("1000000").sub(1);
    expect(await beat.balanceOf(await addr1.getAddress())).to.equal(expectedBalance);
  
    await subscriptionsNFT.connect(addr1).transferFrom(await addr1.getAddress(), await addr2.getAddress(), 0);
  
    await beat.connect(addr2).transfer(await addr3.getAddress(), 1);
  
    expect(await beat.balanceOf(await addr1.getAddress())).to.equal(expectedBalance);
    expect(await beat.balanceOf(await addr2.getAddress())).to.equal(0);
  
    expect(await beat.claimableAmount(await addr1.getAddress())).to.equal(0);
    expect(await beat.claimableAmount(await addr2.getAddress())).to.equal(0);
  });

  it("Should handle transfers correctly", async function () {
    await subscriptionsNFT.connect(owner).mint(await addr1.getAddress(), 0);

    const transferAmount = ethers.utils.parseEther("500000");
    await beat.connect(addr1).transfer(await addr2.getAddress(), transferAmount);

    const addr1Balance = ethers.utils.parseEther("1000000").sub(transferAmount);
    const addr2Balance = transferAmount;

    expect(await beat.balanceOf(await addr1.getAddress())).to.equal(addr1Balance);
    expect(await beat.balanceOf(await addr2.getAddress())).to.equal(addr2Balance);
  });

  it("Should handle transfers with insufficient balance", async function () {
    await subscriptionsNFT.connect(owner).mint(await addr1.getAddress(), 0);

    const transferAmount = ethers.utils.parseEther("1000001");
    await expect(beat.connect(addr1).transfer(await addr2.getAddress(), transferAmount))
      .to.be.revertedWith("ERC20: transfer amount exceeds balance");
  });

  it("Should handle multiple NFTs and claims correctly", async function () {
    await subscriptionsNFT.connect(owner).mint(await addr1.getAddress(), 0);
    await subscriptionsNFT.connect(owner).mint(await addr1.getAddress(), 1);
    await subscriptionsNFT.connect(owner).mint(await addr2.getAddress(), 2);
    await subscriptionsNFT.connect(owner).mint(await addr2.getAddress(), 3);
    await subscriptionsNFT.connect(owner).mint(await addr3.getAddress(), 4);

    await beat.connect(addr1).transfer(await addr2.getAddress(), 1);
    await beat.connect(addr2).transfer(await addr3.getAddress(), 1);
    await beat.connect(addr3).transfer(await addr1.getAddress(), 1);

    const expectedAddr1Balance = ethers.utils.parseEther("1999999");
    const expectedAddr2Balance = ethers.utils.parseEther("1999995");
    const expectedAddr3Balance = ethers.utils.parseEther("999996");

    expect(await beat.balanceOf(await addr1.getAddress())).to.equal(expectedAddr1Balance);
    expect(await beat.balanceOf(await addr2.getAddress())).to.equal(expectedAddr2Balance);
    expect(await beat.balanceOf(await addr3.getAddress())).to.equal(expectedAddr3Balance);
  });

  it("Should handle NFTs with IDs above MAX_CLAIMABLE_ID", async function () {
    await subscriptionsNFT.connect(owner).mint(await addr1.getAddress(), 1000000);

    expect(await beat.claimableAmount(await addr1.getAddress())).to.equal(0);

    await beat.connect(addr1).transfer(await addr2.getAddress(), 0);

    expect(await beat.balanceOf(await addr1.getAddress())).to.equal(0);
  });

  it("Should return correct balance including claimable amount", async function () {
    await subscriptionsNFT.connect(owner).mint(await addr1.getAddress(), 0);

    const expectedBalance = ethers.utils.parseEther("1000000");
    expect(await beat.balanceOf(await addr1.getAddress())).to.equal(expectedBalance);

    await beat.connect(addr1).transfer(await addr2.getAddress(), 100);

    expect(await beat.balanceOf(await addr1.getAddress())).to.equal(expectedBalance.sub(100));
  });

  it("Should handle claiming for multiple valid NFTs", async function () {
    for (let i = 0; i < 10; i++) {
        await subscriptionsNFT.connect(owner).mint(await addr1.getAddress(), i);
    }

    let expectedBalance = ethers.BigNumber.from(0);
    for (let i = 0; i < 10; i++) {
        expectedBalance = expectedBalance.add(ethers.utils.parseEther(String(1000000 - i)));
    }
    
    expect(await beat.claimableAmount(await addr1.getAddress())).to.equal(expectedBalance);

    await beat.connect(addr1).transfer(await addr2.getAddress(), 1);

    expect(await beat.balanceOf(await addr1.getAddress())).to.equal(expectedBalance.sub(1));
  });

  it("Should allow claiming for transferred NFTs before initial claim", async function () {
    await subscriptionsNFT.connect(owner).mint(await addr1.getAddress(), 0);
    
    await subscriptionsNFT.connect(addr1).transferFrom(await addr1.getAddress(), await addr2.getAddress(), 0);

    expect(await beat.claimableAmount(await addr2.getAddress())).to.equal(ethers.utils.parseEther("1000000"));

    await beat.connect(addr2).transfer(await addr2.getAddress(), 0);

    expect(await beat.balanceOf(await addr2.getAddress())).to.equal(ethers.utils.parseEther("1000000"));
  });

  it("Should not allow claiming for transferred NFTs after initial claim", async function () {
    await subscriptionsNFT.connect(owner).mint(await addr1.getAddress(), 1);
    
    await beat.connect(addr1).transfer(await addr1.getAddress(), 0);

    expect(await beat.balanceOf(await addr1.getAddress())).to.equal(ethers.utils.parseEther("999999"));

    await subscriptionsNFT.connect(addr1).transferFrom(await addr1.getAddress(), await addr2.getAddress(), 1);

    expect(await beat.claimableAmount(await addr2.getAddress())).to.equal(0);

    expect(await beat.balanceOf(await addr1.getAddress())).to.equal(ethers.utils.parseEther("999999"));
  });

  it("Should handle large number of transfers correctly", async function () {
    await subscriptionsNFT.connect(owner).mint(await addr1.getAddress(), 0);
    
    const initialBalance = await beat.balanceOf(await addr1.getAddress());
    const transferAmount = 1;
    const transferCount = 1000;

    for (let i = 0; i < transferCount; i++) {
      await beat.connect(addr1).transfer(await addr2.getAddress(), transferAmount);
      await beat.connect(addr2).transfer(await addr1.getAddress(), transferAmount);
    }

    expect(await beat.balanceOf(await addr1.getAddress())).to.equal(initialBalance);
    expect(await beat.balanceOf(await addr2.getAddress())).to.equal(0);
  });

  it("Should mint initial tokens to the specified address", async function () {
    expect(await beat.balanceOf(await initialMintRecipient.getAddress())).to.equal(INITIAL_MINT);
  });

  it("Should return the correct SUBSCRIPTIONS_NFT address", async function () {
    expect(await beat.SUBSCRIPTIONS_NFT()).to.equal(subscriptionsNFT.address);
  });

  it("Should handle minting and claiming for the max valid subscription ID", async function () {
    await subscriptionsNFT.connect(owner).mint(await addr1.getAddress(), MAX_CLAIMABLE_ID - 1);
    
    const expectedClaimAmount = ethers.utils.parseEther("1");
    expect(await beat.claimableAmount(await addr1.getAddress())).to.equal(expectedClaimAmount);

    await beat.connect(addr1).transfer(await addr2.getAddress(), 1);

    expect(await beat.balanceOf(await addr1.getAddress())).to.equal(expectedClaimAmount.sub(1));
  });

  it("Should handle the maximum processable balance", async function () {
    // Mint MAX_PROCESSABLE_BALANCE + 5 NFTs to addr1
    for (let i = 0; i < MAX_PROCESSABLE_BALANCE + 5; i++) {
      await subscriptionsNFT.connect(owner).mint(await addr1.getAddress(), i);
    }
  
    // Calculate claimable amount for first 10 NFTs (MAX_PROCESSABLE_BALANCE)
    let firstClaimable = ethers.BigNumber.from(0);
    for (let i = 0; i < MAX_PROCESSABLE_BALANCE; i++) {
      firstClaimable = firstClaimable.add(ethers.utils.parseEther((MAX_CLAIMABLE_ID - i).toString()));
    }
  
    expect(await beat.claimableAmount(await addr1.getAddress())).to.equal(firstClaimable);
  
    await beat.connect(addr1).transfer(await addr2.getAddress(), 1);
  
    expect(await beat.balanceOf(await addr1.getAddress())).to.equal(firstClaimable.sub(1));
  
    // Transfer 6 NFTs to addr2 to make room for claiming the remaining NFTs
    for (let i = 0; i < 6; i++) {
      await subscriptionsNFT.connect(addr1).transferFrom(await addr1.getAddress(), await addr2.getAddress(), i);
    }
  
    // Calculate remaining claimable amount for the last 5 NFTs
    let remainingClaimable = ethers.BigNumber.from(0);
    for (let i = MAX_PROCESSABLE_BALANCE; i < MAX_PROCESSABLE_BALANCE + 5; i++) {
      remainingClaimable = remainingClaimable.add(ethers.utils.parseEther((MAX_CLAIMABLE_ID - i).toString()));
    }
  
    expect(await beat.claimableAmount(await addr1.getAddress())).to.equal(remainingClaimable);
  
    await beat.connect(addr1).transfer(await addr2.getAddress(), 1);
  
    expect(await beat.balanceOf(await addr1.getAddress())).to.equal(firstClaimable.add(remainingClaimable).sub(2));
  
    expect(await beat.claimableAmount(await addr1.getAddress())).to.equal(0);
  
    expect(await beat.balanceOf(await addr1.getAddress())).to.equal(firstClaimable.add(remainingClaimable).sub(2));
  });
});
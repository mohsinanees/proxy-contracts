let fs = require("fs");
const Web3 = require("web3");
const { mnemonic } = require("../secret.json");
const HDWalletProvider = require("truffle-hdwallet-provider"); //HD Wallet provider

let provider = new HDWalletProvider(mnemonic, `https://speedy-nodes-nyc.moralis.io/e3771a4194ca1a8d20c96277/polygon/mumbai`);
const web3 = new Web3(provider);

const AWSTERC1155 = require(`../build/contracts/AWSTERC1155.json`);
const proxy = require(`../build/contracts/TransparentUpgradeableProxy.json`);
const proxyAmdin = require(`../build/contracts/ProxyAdmin.json`);

// Smart contract EVM bytecode as hex
let AWSTERC1155Bytecode = AWSTERC1155.bytecode;
let proxyBytecode = proxy.bytecode;
let proxyAdminBytecode = proxyAmdin.bytecode;

// ABI
let AWSTERC1155ABI = AWSTERC1155.abi;
let proxyABI = proxy.abi;
let proxyAdminABI = proxyAmdin.abi;

// Create Contract proxy class
let AWSTERC1155Contract = new web3.eth.Contract(AWSTERC1155ABI);
let proxyContract = new web3.eth.Contract(proxyABI);
let proxyAdminContract = new web3.eth.Contract(proxyAdminABI);

async function deploy() {
  const accounts = await web3.eth.getAccounts();
  const deploymentAccount = accounts[0];
  const privateKey = provider.wallets[
    deploymentAccount.toLowerCase()
  ]._privKey.toString("hex");

  let signedTransactionObject;
  let result;

  // Deploying the implementation contract
  console.log("Deploying ERC1155 contract");
  let ERC1155 = await AWSTERC1155Contract.deploy({ data: AWSTERC1155Bytecode }).encodeABI();
  let ERC1155TransactionObject = {
    gas: 10000000,
    data: ERC1155,
    from: deploymentAccount,
    chainId: 80001,
  };

  signedTransactionObject = await web3.eth.accounts.signTransaction(
    ERC1155TransactionObject, privateKey
  );

  result = await web3.eth.sendSignedTransaction(
    signedTransactionObject.rawTransaction
  );
  let ERC1155Address = result.contractAddress;
  console.log("ERC1155 Contract deployed to", ERC1155Address + " in transaction at https://mumbai.polygonscan.com/tx/" + result.transactionHash);

  // Deploying the Proxy Admin contract
  console.log("Deploying Proxy Admin contract");
  let proxyAdmin = await proxyAdminContract.deploy({ data: proxyAdminBytecode }).encodeABI();
  let proxyAdminTransactionObject = {
    gas: 10000000,
    data: proxyAdmin,
    from: deploymentAccount,
    chainId: 80001,
  };

  signedTransactionObject = await web3.eth.accounts.signTransaction(
    proxyAdminTransactionObject, privateKey
  );

  result = await web3.eth.sendSignedTransaction(
    signedTransactionObject.rawTransaction
  );
  let proxyAdminAddress = result.contractAddress;
  console.log("Proxy Admin Contract deployed to", proxyAdminAddress + " in transaction at https://mumbai.polygonscan.com/tx/" + result.transactionHash);

  // Deploying the Transparent Upgradeable Proxy contract
  console.log("Deploying Transparent Upgradeable Proxy contract");
  let initializer = await AWSTERC1155Contract.methods.initialize().encodeABI();
  let proxy = await proxyContract.deploy({ data: proxyBytecode, arguments: [ERC1155Address, proxyAdminAddress, initializer] }).encodeABI();
  let proxyTransactionObject = {
    gas: 10000000,
    data: proxy,
    from: deploymentAccount,
    chainId: 80001,
  };

  signedTransactionObject = await web3.eth.accounts.signTransaction(
    proxyTransactionObject, privateKey
  );

  result = await web3.eth.sendSignedTransaction(
    signedTransactionObject.rawTransaction
  );
  let proxyAddress = result.contractAddress;
  console.log("Tranparent upgradeable Contract deployed to", proxyAddress + " in transaction at https://mumbai.polygonscan.com/tx/" + result.transactionHash);
}

deploy();
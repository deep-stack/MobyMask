const fs = require("fs");
const { ethers, utils, ContractFactory } = require("ethers");
const secp256k1 = require("secp256k1");
const chalk  = require("chalk");
const assert  = require("assert");

const main = async () => {
  // normalize args as an array
  var args = process.argv.slice(2);
  var privKey = args[0];

  await deploy("PhisherRegistry", {
    privKey: privKey,
    args: [ "MobyMask" ],
    log: true,
  });
};

const deploy = async (
  contractName,
  args = [],
 ) => {
    const privateKey = args.privKey;
    assert(privateKey, "Private key cannot be empty.");
    
    const phisherRegistryArtifacts = require('../artifacts/contracts/PhisherRegistry.sol/PhisherRegistry.json');
        
    const contractAbi = phisherRegistryArtifacts.abi;
    const contractBytecode = phisherRegistryArtifacts.bytecode;
    const factory = new ContractFactory(contractAbi, contractBytecode);

    const privateKeyHex = parsePrivateKey(privateKey);
    const ethAddress = ethAddressFromPrivateKey(privateKeyHex);

    const jsonRpcProvider = new ethers.providers.JsonRpcProvider(); 
    const deployer = await jsonRpcProvider.getSigner(ethAddress);
    const contract = await factory.connect(deployer).deploy(args);        

    console.log(
        chalk.cyan(contractName),
        "deployed to:",
        chalk.magenta(contract.address)
    );

    return contract;
};

// ------ utils -------
// parses recieved private key from string to uint8Array
const parsePrivateKey = (privateKey) => {
    var result = [];
    for(var i = 0; i < privateKey.length; i+=2)
    {
        result.push(parseInt(privateKey.substring(i, i + 2), 16));
    }
    
    return Uint8Array.from(result);
};

// generates ethereum address from account's private key
const ethAddressFromPrivateKey = (privateKey) => {
    const publicKey = secp256k1.publicKeyCreate(privateKey);
    const ethAddress = utils.computeAddress(publicKey);

    return ethAddress;
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

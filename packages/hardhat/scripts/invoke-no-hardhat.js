const {ContractFactory, ethers} = require("ethers")
const { generateUtil } = require('eth-delegatable-utils');
const fs = require("fs");
  

const main = async () => {
    
    const ok = require('../test.json');
    console.log(ok, '\n\n\n');
    const res = await invoker(ok.contractAddress, ok.delegateKey, ok.delegateAddr, ok.delegatorKey, ok.delegatorAddr);
    console.log(res);
  };
  

const invoker = async ( 
    contractAddress,            // 1. contract address
    delegateKey,                // 2. delegate key
    delegateAddr,               // 3. delegate address
    delegatorKey,               // 4. delegator key
    delegatorAddr,              // 5. delegator address
) => {
    
    // var _ = {contractAddress, delegateKey, delegateAddr, delegatorKey, delegatorAddr};

    const phisherRegistryArtifacts = require('../artifacts/contracts/PhisherRegistry.sol/PhisherRegistry.json');
        
    const contractAbi = phisherRegistryArtifacts.abi;
    const contractBytecode = phisherRegistryArtifacts.bytecode;
    const contractFactory = new ContractFactory(contractAbi, contractBytecode);
    const contract = await contractFactory.attach(contractAddress);

    const jsonRpcProvider = new ethers.providers.JsonRpcProvider(); 
    const signerDelegate = await jsonRpcProvider.getSigner(delegateAddr);    
    const signerDelegator = await jsonRpcProvider.getSigner(delegatorAddr);    

    console.log("signerDelegate : \n", signerDelegate._address);

    const utilOpts = {
      chainId: await signerDelegator.getChainId(), 
      verifyingContract: contract.address,
      name: "PhisherRegistry",      
    }
    console.log(utilOpts);
    const util = generateUtil(utilOpts);
    
    const delegation = {
      delegate: signerDelegate._address,
      authority: '0x0000000000000000000000000000000000000000000000000000000000000000',
      caveats: [],
    };
    console.log("delegation : \n", delegation, "\n\n");

    const signedDelegation = util.signDelegation(delegation, delegatorKey);
    console.log("Signed Delegation :\n",signedDelegation, '\n\n');

    const targetString = 'isPhisher';
    const desiredTx = await contract.populateTransaction.claimIfMember(targetString, true);
    const invocationMessage = {
      replayProtection: {
        nonce: '0x01',
        queue: '0x00',
      },
      batch: [{
        authority: [signedDelegation],
        transaction: {
          to: contract.address,
          gasLimit: '10000000000000000',
          data: desiredTx.data,
        },
      }],
    };

    console.log("Invocation : ",invocationMessage, "\n\n");
    const signedInvocation= await util.signInvocation(invocationMessage, delegateKey);
    console.log("Signed Invocation : \n\n");
    console.log(JSON.stringify(signedInvocation, undefined,2), '\n\n\n\n');

    const res = await contract.connect(signerDelegate).invoke([signedInvocation]);
    return res;
};


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


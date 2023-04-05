import { ethers } from "ethers";
import fs from 'fs';
import path from 'path';

// Workaround for missing types
const { generateUtil } = require('eth-delegatable-utils');

const DEFAULT_BASE_URI = 'https://mobymask.com/#';

// Workaround for importing JSON files
const phisherRegistryArtifacts = require('../../hardhat/artifacts/contracts/PhisherRegistry.sol/PhisherRegistry.json');
const { privateKey, mnemonic, baseURI = DEFAULT_BASE_URI } = require('../secrets.json');

const configPath = path.join(__dirname, '../config.json');
const { abi } = phisherRegistryArtifacts;

export async function setupSigner (provider: ethers.providers.Provider) {
  if (mnemonic) {
    return ethers.Wallet.fromMnemonic(mnemonic).connect(provider);
  }

  return new ethers.Wallet(privateKey, provider)
}

type SetupContract = {
  name?: string;
  chainId?: string;
  registry: ethers.Contract;
}

export async function setupContract (signer: ethers.Wallet): Promise<SetupContract> {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const { address, chainId, name } = config;
    const registry = await attachToContract(address, signer)

    return { name, chainId, registry }
  } catch (err) {
    console.log('No config detected, deploying contract and creating one.');
    const registry = await deployContract(signer);

    return { registry }
  }
}

async function deployContract (signer: ethers.Wallet) {
  const Registry = new ethers.ContractFactory(abi, phisherRegistryArtifacts.bytecode, signer);
  const _name = 'MobyMask';
  const registry = await Registry.deploy(_name);

  const address = registry.address;
  fs.writeFileSync(configPath, JSON.stringify({ address, name: _name, chainId: registry.deployTransaction.chainId }, null, 2));
  try {
    return await registry.deployed();
  } catch (err) {
    console.log('Deployment failed, trying to attach to existing contract.', err);
    throw err;
  }
}

async function attachToContract(address: string, signer: ethers.Wallet) {
  const Registry = new ethers.Contract(address, abi, signer);
  const registry = await Registry.attach(address);
  console.log('Attaching to existing contract');
  const deployed = await registry.deployed();
  return deployed;
}

export type Invocation = {
  transaction: Transaction,
  authority: SignedDelegation[],
};

type Transaction = {
  to: string,
  gasLimit: string,
  data: string,
};

type SignedDelegation = {
  delegation: Delegation,
  signature: string,
}

type Delegation = {
  delegate: string,
  authority: string,
  caveats: Caveat[],
};

type Caveat = {
  enforcer: string,
  terms: string,
}

export async function signDelegation (provider: ethers.providers.Provider, signer: ethers.Wallet, registry: ethers.Contract, name: string) {
  const { chainId } = await provider.getNetwork();
  const utilOpts = {
    chainId,
    verifyingContract: registry.address,
    name,
  };
  console.log('util opts', utilOpts);
  const util = generateUtil(utilOpts)
  const delegate = ethers.Wallet.createRandom();

  // Prepare the delegation message.
  // This contract is also a revocation enforcer, so it can be used for caveats:
  const delegation = {
    delegate: delegate.address,
    authority: '0x0000000000000000000000000000000000000000000000000000000000000000',
    caveats: [{
      enforcer: registry.address,
      terms: '0x0000000000000000000000000000000000000000000000000000000000000000',
    }],
  };

  // Owner signs the delegation:
  const signedDelegation = util.signDelegation(delegation, signer.privateKey);
  const invitation = {
    v:1,
    signedDelegations: [signedDelegation],
    key: delegate.privateKey,
  }
  console.log('A SIGNED DELEGATION/INVITE LINK:');
  console.log(JSON.stringify(invitation, null, 2));
  console.log(baseURI + '/members?invitation=' + encodeURIComponent(JSON.stringify(invitation)));
}

import { ethers } from "ethers";

import { setupContract, setupSigner, signDelegation } from './utils';

// Workaround for importing JSON files
const { rpcUrl } = require('./secrets.json');

const DEFAULT_CONTRACT_NAME = 'MobyMask'

let provider = new ethers.providers.JsonRpcProvider(rpcUrl);
let signer: ethers.Wallet;

setupSigner(provider)
  .then(_signer => signer = _signer)
  .then(() => setupContract(signer))
  .then(({ name = DEFAULT_CONTRACT_NAME, registry }) => signDelegation(provider, signer, registry, name))
  .catch(console.error);

import { ethers } from "ethers";
import { Router } from "@open-rpc/server-js";

import { setupSigner, setupContract, signDelegation, Invocation } from './utils'

const cors = require('cors');
const createGanacheProvider = require('./providers/ganacheProvder');

// For reads, clients can hit the node directly.
/* so for now, we just care about this server being able to relay transactions.
  * We can add more features later, like pre-simulating txs so only process good ones.
  */

const { mnemonic, rpcUrl } = require('./secrets.json');

const openrpcDocument = require('./openrpc.json');
const { parseOpenRPCDocument } = require("@open-rpc/schema-utils-js");
const { Server } = require("@open-rpc/server-js");
const openrpcServer = require("@open-rpc/server-js");
const { HTTPTransport } = openrpcServer.transports;

let provider: ethers.providers.Provider;
if (process.env.ENV === 'PROD') {
  console.log('Deploying to PROD');
  provider = new ethers.providers.JsonRpcProvider(rpcUrl);
} else {
  console.log('TEST SERVER MODE');
  const ganacheProvder = createGanacheProvider(mnemonic);
  provider = new ethers.providers.Web3Provider(ganacheProvder);
}

let registry: ethers.Contract;
let signer: ethers.Wallet;
let _name: string = 'MobyMask';

const methodMapping = {
  submitInvocations: async (signedInvocations: SignedInvocation[]): Promise<boolean> => {
    try {
      const tx = await registry.invoke(signedInvocations);
      const block = tx.block;
    } catch (err) {
      return false;
    }
    return true;
  },
};

setupSigner(provider)
  .then(_signer => signer = _signer)
  .then(() => setupContract(signer))
  .then(params => {
    _name = params.name ?? _name;
    registry = params.registry;
  })
  .then(activateServer)
  .then(() => signDelegation(provider, signer, registry, _name))
  .catch(console.error);

async function activateServer () {
  const router = new Router(openrpcDocument, methodMapping);
  const serverOptions = {
    openrpcDocument: await parseOpenRPCDocument(openrpcDocument),
    transportConfigs: [
      {
        type: "HTTPTransport",
        options: {
          port: 3330,
          middleware: [],
        },
      },
      {
        type: "HTTPSTransport",
        options: {
          port: 3331,
          middleware: [],
        },
      },
    ],
    methodMapping,
  };
  const server = new Server(serverOptions);

  const httpOptions = {
    middleware: [ cors({ origin: "*" }) ],
    port: 4345
  };
  const httpTransport = new HTTPTransport(httpOptions);

  /*
  const httpsOptions = { // extends https://nodejs.org/api/https.html#https_https_createserver_options_requestlistener
    middleware: [ cors({ origin: "*" }) ],
    port: 4346,
    key: await fs.readFile("test/fixtures/keys/agent2-key.pem"),
    cert: await fs.readFile("test/fixtures/keys/agent2-cert.pem"),
    ca: fs.readFileSync("ssl/ca.crt")
  };
  const httpsTransport = new HTTPSServerTransport(httpsOptions);
  */

  server.start();
  // server.addTransports([ httpTransport /*, httpsTransport */] ); // will be started immediately.
}

type SignedInvocation = {
  invocation: Invocation,
  signature: string,
}

function fromHexString (hexString: string) {
  console.dir(hexString);
  if (!hexString || typeof hexString !== 'string') {
    throw new Error('Expected a hex string.');
  }
  const matched = hexString.match(/.{1,2}/g)
  if (!matched) {
    throw new Error('Expected a hex string.');
  }
  const mapped = matched.map(byte => parseInt(byte, 16));
  if (!mapped || mapped.length !== 32) {
    throw new Error('Expected a hex string.');
  }
  return new Uint8Array(mapped);
}

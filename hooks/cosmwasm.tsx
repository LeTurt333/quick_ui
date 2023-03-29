import { useState } from "react";
import { getKeplr, suggestChain } from "../util/keplr";
import {
  SigningCosmWasmClient,
  CosmWasmClient,
  setupWasmExtension,
} from "@cosmjs/cosmwasm-stargate";
import { config } from "../util/config";
import { GasPrice } from "@cosmjs/stargate/build/fee";
import { toBase64, fromBase64, toUtf8, fromUtf8 } from "@cosmjs/encoding";
import { HttpBatchClient, Tendermint34Client } from "@cosmjs/tendermint-rpc";
import { QueryClient } from "@cosmjs/stargate";

export interface ISigningCosmWasmClientContext {
  walletAddress: string;
  signingClient: SigningCosmWasmClient | null;
  loading: boolean;
  error: any;
  nickname: string;
  connectWallet: any;
  disconnect: Function;
}

export const useSigningCosmWasmClient = (): ISigningCosmWasmClientContext => {
  const [walletAddress, setWalletAddress] = useState("");
  const [signingClient, setSigningClient] =
    useState<SigningCosmWasmClient | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any | null>(null);
  const [nickname, setNickname] = useState("");

  const connectWallet = async () => {
    setLoading(true);

    try {
      const chainId = config("chainId");
      const keplr = await getKeplr();
      suggestChain();

      // enable website to access kepler
      await keplr.enable(config("chainId"));

      // get offline signer for signing txs
      const offlineSigner = await keplr.getOfflineSigner(chainId);

      const endpoint = config("rpcEndpoint");
      const client = await SigningCosmWasmClient.connectWithSigner(
        endpoint,
        offlineSigner,
        {
          gasPrice: GasPrice.fromString(
            `${config("gasPrice")}${config("coinDenom")}`
          ),
        }
      );

      //console.log(endpoint);

      setSigningClient(client);

      // get user address
      const [{ address }] = await offlineSigner.getAccounts();
      setWalletAddress(address);

      //get user wallet nickname
      const nicky = await keplr.getKey(chainId);
      setNickname(nicky.name);

      setLoading(false);
    } catch (error) {
      setError(error);
    }
  };

  const disconnect = () => {
    if (signingClient) {
      signingClient.disconnect();
    }
    setWalletAddress("");
    setNickname("");
    setSigningClient(null);
    setLoading(false);
  };

  return {
    walletAddress,
    signingClient,
    loading,
    error,
    nickname,
    connectWallet,
    disconnect,
  };
};

// export const getNonSigningClient = async () => {
//   //console.log(Math.round((Date.now() / 1000)));
//   //current seconds

//   // ~~~~~~ Random between 3 ~~~~~~~~
//   const z = Math.round(Date.now() / 1000)
//     .toString()
//     .split("")
//     .map(Number)
//     .pop();
//   if (z === 0 || z === 3 || z === 6) {
//     const client = await CosmWasmClient.connect(config("rpcEndpoint"));
//     return client;
//   } else if (z === 1 || z === 4 || z === 7) {
//     const client = await CosmWasmClient.connect(config("rpcEndpointTwo"));
//     return client;
//   } else {
//     const client = await CosmWasmClient.connect(config("rpcEndpointThree"));
//     return client;
//   }

//   // ~~~~~ Random between 2 ~~~~~~
//   //const client = switcher
//   //  ? await CosmWasmClient.connect(config("rpcEndpoint"))
//   //  : await CosmWasmClient.connect(config("rpcEndpointTwo"));
//   //return client;
// };

export const getBatchClient = async () => {
  const endpoints = [config("rpcEndpoint")];
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const httpBatch = new HttpBatchClient(endpoint);
  const tmint = await Tendermint34Client.create(httpBatch);
  const queryClient = QueryClient.withExtensions(tmint, setupWasmExtension);
  return queryClient;
}

export function toBinary(obj: any): string {
  return toBase64(toUtf8(JSON.stringify(obj)));
}

export function fromBinary(base64: string): any {
  return JSON.parse(fromUtf8(fromBase64(base64)));
}
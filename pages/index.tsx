import type { NextPage } from 'next'
import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import { useSigningClient } from '../contexts/cosmwasm'
import { Coin } from "@cosmjs/amino";
import { MsgExecuteContractEncodeObject } from "@cosmjs/cosmwasm-stargate";
import { MsgExecuteContract } from "cosmjs-types/cosmwasm/wasm/v1/tx";
import { toUtf8 } from "@cosmjs/encoding";
import { EncodeObject } from '@cosmjs/proto-signing'
import Link from 'next/link';
import { toast } from 'react-hot-toast';

const CzarDaoContractAddress = "juno1mljx5dcl07ut8mdzv86daswyy298xyn3ng0nkxtmksmwplg8secs5aw6h8";

const PredMarketAddress = "juno1uugwj8uneuvllu2e2znn2nfha0sq6n45stv6g3vg4w3v07uy2quqzxueun";

// junod query wasm contract-state smart juno1uugwj8uneuvllu2e2znn2nfha0sq6n45stv6g3vg4w3v07uy2quqzxueun '{"hi": {}}'
// Error: rpc error: code = InvalidArgument desc = Error parsing into type forecast_deliverdao::price_prediction::msg::QueryMsg: unknown variant `hi`, 
// expected one of `config`, `status`, `my_current_position`, `finished_round`: query wasm contract failed: invalid request

// junod query wasm contract-state smart juno1uugwj8uneuvllu2e2znn2nfha0sq6n45stv6g3vg4w3v07uy2quqzxueun '{"finished_round":{"round_id":"10765"}}'
// data:
//   bear_amount: "0"
//   bid_time: "1678721231828524211"
//   bull_amount: "0"
//   close_price: "1019673"
//   close_time: "1678723036313574626"
//   id: "10765"
//   open_price: "1020528"
//   open_time: "1678722136313574626"
//   winner: bear

// junod query wasm contract-state smart juno1uugwj8uneuvllu2e2znn2nfha0sq6n45stv6g3vg4w3v07uy2quqzxueun '{"config":{}}'
// data:
//   burn_addr: juno100000000000000000000000000000000000000
//   burn_fee: "0"
//   cw20_stake_external_rewards_addr: juno1pu49cmt633nkxh6x2yxnymcwrjdfhfkjm4vapuyhd0f5crc5pccqt4dulk
//   fast_oracle_addr: juno142cxh760yza25nq2hkrlhaju8za24c407sj4lxtgmqfznzqqsvpqg6kxae
//   minimum_bet: "1"
//   next_round_seconds: "900"
//   staker_fee: "300"

// junod query wasm contract-state smart juno1uugwj8uneuvllu2e2znn2nfha0sq6n45stv6g3vg4w3v07uy2quqzxueun '{"my_current_position": {"address":"juno1l2d805nq2vzfvhha8rh6xldzukvl9rte4dtuqe"}}'
// data:
//   live_bear_amount: "0"
//   live_bull_amount: "0"
//   next_bear_amount: "0"
//   next_bull_amount: "0"

// Latest round from querying contract manually (don't have access to schema)
//junod query wasm contract-state smart juno1uugwj8uneuvllu2e2znn2nfha0sq6n45stv6g3vg4w3v07uy2quqzxueun 
// '{"finished_round":{"round_id":"10765"}}'


// collect winnings format: https://www.mintscan.io/juno/txs/90F1F66C37B0AE2DE003445AA85B4D841B645C94232C104A4898FC89C85980E6

const claimRewardsMsg = ({
  sender,
  round_id
}:{
  sender: string;
  round_id: string[];
}, funds?: Coin[]): MsgExecuteContractEncodeObject => {
  return {
    typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
    value: MsgExecuteContract.fromPartial({
      sender: sender,
      contract: PredMarketAddress,
      msg: toUtf8(JSON.stringify({
        collect_winnings: {
          rounds: round_id
        }
      })),
      funds
    })
  };
}

const Home: NextPage = () => {

  // const [wasmFile, setWasmFile] = useState<File | null>(null);
  // const [bytes, setBytes] = useState<Uint8Array | null>(null);
  // const [id, setId] = useState<Number>(0);
  //const [contractAddress, setContractAddress] = useState<string>("N/A");
  //const [amount, setAmount] = useState<Number>();

  const [roundID, setRoundID] = useState<string>('');

  const [error, setError] = useState<string>('');

  const [txHash, setTxHash] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);


  
  const { walletAddress, signingClient, nickname, connectWallet, disconnect } =
    useSigningClient();

  const handleConnect = () => {
    if (walletAddress.length === 0) {
      connectWallet();
    } else {
      disconnect();
    }
  };

  const reconnect = useCallback(() => {
    disconnect();
    connectWallet();
  }, [disconnect, connectWallet]);

  useEffect(() => {
    window.addEventListener("keplr_keystorechange", reconnect);

    return () => {
      window.removeEventListener("keplr_keystorechange", reconnect);
    };
  }, [reconnect]);


  const handleClaimRewards = () => {
    if (walletAddress.length < 3 || !signingClient) {
      console.log("No wallet connected");
      setError("Wallet not connected")
      toast.error("Wallet not connected");
      return;
    }

    if (!roundID || roundID.length <= 0 || parseInt(roundID) > 10765 || parseInt(roundID) < 1) {
      console.log("Need valid round");
      setError("Need to input a valid round, last valid round was 10765");
      toast.error("Need to input a valid round, last valid round was 10765");
      return;
    }
    toast.loading("Processing your request...");
    setLoading(true);

    const msg: EncodeObject[] = [claimRewardsMsg({
      sender: walletAddress,
      round_id: [roundID]
    })];

    signingClient
      .signAndBroadcast(walletAddress, msg, 'auto')
      .then((res) => {
        console.log("TX hash: " + res.transactionHash);
        setTxHash(res.transactionHash);
        setError('');
        toast.dismiss();
        toast.success("Rewards claimed")
        setLoading(false);
      })
      .catch((e) => {
        console.log(e);
        setError(JSON.stringify(e.message));
        setLoading(false);
        toast.dismiss();
        toast.error("Error claiming rewards");
        toast.error(JSON.stringify(e.message));
      })
  }



  return (
    <div className="flex min-h-screen h-screen flex-col py-2 bg-zinc-300">
      <Head>
        <title>Create Next App</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="grid grid-rows-6 w-full h-full">
        <div className="row-span-2 flex px-10 justify-end">
          <button 
            className="border-2 border-purple-600 hover:bg-purple-200 rounded-xl h-1/4 px-2 py-1"
            onClick={handleConnect}
          >
            {walletAddress.length < 3 ? "Connect" : nickname}
          </button>
        </div>
        <div className="row-span-2 flex flex-col gap-y-4 justify-center items-center border">
          <div className="">
            Last round found on chain: 10765
          </div>
          <div className="flex gap-x-4 justify-center items-center">
          <span className="font-bold">
            Round ID:
          </span>
          <input 
              className="border border-purple-500" placeholder='round ID' onChange={e => setRoundID(e.target.value)}>
              {/* className="border border-purple-500" type="number" onChange={e => setRoundID(e.target.value)}> */}
          </input>

          <button 
            className="border-2 border-purple-600 hover:bg-purple-200 rounded-xl px-2 py-1"
            onClick={() => loading === true ? toast.error("in process") : handleClaimRewards()}
          >
            {loading === true ? "Loading..." : "Claim"}
          </button>
          </div>
        </div>
        <div className="row-span-2 flex flex-col w-full gap-y-4 justify-center items-center ">
        <div className="flex gap-x-2">
            <span>
              Tx Hash:
            </span>
              <Link
                legacyBehavior
                href={`https://www.mintscan.io/juno/txs/${txHash}`}
                passHref
              >
              <a
                className="link link-hover"
                target="_blank"
                rel="noopener noreferrer"
              >
                {txHash}
              </a>
            </Link>
          </div>
          <div className="flex gap-x-2">
            <span>
            Error Message:
            </span>
            <span className="text-red-500">
              {error}
            </span>
          </div>
        </div>
      </main>

      <footer className="flex h-24 w-full items-center justify-center border-t">
        <a
          className="flex items-center justify-center gap-2 link link-hover"
          href="https://github.com/LeTurt333/quick_ui"
          target="_blank"
          rel="noopener noreferrer"
        >
          Github for this UI
        </a>
      </footer>
    </div>
  )
}

export default Home

import { Keplr } from "@keplr-wallet/types";
import { config } from "../util/config";

export function convertMicroDenomToDenom(amount: number | string) {
  if (typeof amount === "string") {
    amount = Number(amount);
  }
  amount = amount / 1000000;
  return isNaN(amount) ? 0 : amount;
}

export function convertDenomToMicroDenom(amount: number | string): string {
  if (typeof amount === "string") {
    amount = Number(amount);
  }
  amount = amount * 1000000;
  return isNaN(amount) ? "0" : String(amount);
}

export function convertFromMicroDenom(denom: string) {
  return denom?.substring(1).toUpperCase();
}

export function convertToFixedDecimals(amount: number | string): string {
  if (typeof amount === "string") {
    amount = Number(amount);
  }
  if (amount > 0.01) {
    return amount.toFixed(2);
  } else return String(amount);
}

export const zeroVotingCoin = {
  amount: "0",
  denom: "ucredits",
};

export const zeroStakingCoin = {
  amount: "0",
  denom: process.env.NEXT_PUBLIC_STAKING_DENOM || "ujuno",
};

const CosmosCoinType = 118;
const GasPrices = {
  low: 0.01,
  average: 0.025,
  high: 0.03,
};

declare global {
  interface Window {
    keplr: Keplr | undefined;
  }
}

let keplr: Keplr | undefined;

export async function getKeplr(): Promise<Keplr> {
  let gotKeplr: Keplr | undefined;

  if (keplr) {
    gotKeplr = keplr;
  } else if (window.keplr) {
    gotKeplr = window.keplr;
  } else if (document.readyState === "complete") {
    gotKeplr = window.keplr;
  } else {
    gotKeplr = await new Promise((resolve) => {
      const documentStateChange = (event: Event) => {
        if (
          event.target &&
          (event.target as Document).readyState === "complete"
        ) {
          resolve(window.keplr);
          document.removeEventListener("readystatechange", documentStateChange);
        }
      };

      document.addEventListener("readystatechange", documentStateChange);
    });
  }

  if (!gotKeplr) throw new Error("Keplr not found");
  if (!gotKeplr) keplr = gotKeplr;

  return gotKeplr;
}

export async function suggestChain(): Promise<void> {
  const keplr = await getKeplr();
  const prefix = config("bech32Prefix");
  const coinDecimals = Number.parseInt(config("coinDecimals"));
  const coinMinimalDenom = config("coinDenom");
  const coinDenom = convertFromMicroDenom(coinMinimalDenom).toUpperCase();

  await keplr.experimentalSuggestChain({
    chainId: config("chainId"),
    chainName: config("chainName"),
    rpc: config("rpcEndpoint"),
    rest: config("restEndpoint"),
    bip44: {
      coinType: 118,
    },
    bech32Config: {
      bech32PrefixAccAddr: prefix,
      bech32PrefixAccPub: `${prefix}pub`,
      bech32PrefixValAddr: `${prefix}valoper`,
      bech32PrefixValPub: `${prefix}valoperpub`,
      bech32PrefixConsAddr: `${prefix}valcons`,
      bech32PrefixConsPub: `${prefix}valconspub`,
    },
    currencies: [
      {
        coinDenom,
        coinMinimalDenom,
        coinDecimals,
      },
    ],
    feeCurrencies: [
      {
        coinDenom,
        coinMinimalDenom,
        coinDecimals,
      },
    ],
    stakeCurrency: {
      coinDenom,
      coinMinimalDenom,
      coinDecimals,
    },
    coinType: CosmosCoinType,
    //gasPriceStep: GasPrices,
  });
}
import { BN } from "@coral-xyz/anchor";
import { TransactionInstruction } from "@solana/web3.js";
import { FunctionRunner } from "@switchboard-xyz/solana.js/functions";

interface Ticker {
  symbol: string; // BTCUSDT
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  lastPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number; // ms
  closeTime: number; // ms
}

interface OracleDataBorsh {
  oracleTimestamp: BN;
  price: BN;
  volume1hr: BN;
  volume24hr: BN;
  twap1hr: BN;
  twap24hr: BN;
}

type TradingSymbol =
  | { unknown: {} }
  | { btc: {} }
  | { usdc: {} }
  | { eth: {} }
  | { sol: {} }
  | { doge: {} };

export function convertSymbol(symbol: string): TradingSymbol {
  switch (symbol) {
    case "BTCUSDT":
      return { btc: {} };
    case "USDCUSDT":
      return { usdc: {} };
    case "ETHUSDT":
      return { eth: {} };
    case "SOLUSDT":
      return { sol: {} };
    case "DOGEUSDT":
      return { doge: {} };
    default:
      return { unknown: {} };
  }
}
export interface OracleDataWithTradingSymbol {
  symbol: TradingSymbol;
  data: OracleDataBorsh;
}

class IndexData {
  constructor(
    readonly symbol: string,
    readonly hr: Ticker,
    readonly d: Ticker
  ) {}

  toOracleDataBorsh(): OracleDataBorsh {
    // const oracleTimestamp = Date.now();
    // const price = parseFloat(this.hr.lastPrice);
    // const volume1hr = parseFloat(this.hr.volume);
    // const volume24hr = parseFloat(this.d.volume);
    // const twap1hr = parseFloat(this.hr.weightedAvgPrice);
    // const twap24hr = parseFloat(this.d.weightedAvgPrice);

    return {
      oracleTimestamp: new BN(Math.floor(Date.now() / 1000)),
      price: new BN(0),
      volume1hr: new BN(0),
      volume24hr: new BN(0),
      twap1hr: new BN(0),
      twap24hr: new BN(0),
    };
  }
}

export class Binance {
  constructor(
    public readonly btcUsdt: IndexData,
    public readonly usdcUsdt: IndexData,
    public readonly ethUsdt: IndexData,
    public readonly solUsdt: IndexData,
    public readonly dogeUsdt: IndexData
  ) {}

  public static async fetch(): Promise<Binance> {
    const symbols = ["BTCUSDT", "USDCUSDT", "ETHUSDT", "SOLUSDT", "DOGEUSDT"];

    const tickers1HrResponse = await fetch(
      `https://api.binance.com/api/v3/ticker?symbols=[${symbols
        .map((s) => `\"${s}\"`)
        .join(",")}]&windowSize=1h`
    );
    if (!tickers1HrResponse.ok) {
      throw new Error(`Failed to fetch tickers for the 1hr interval`);
    }
    const tickers1Hr: Ticker[] = await tickers1HrResponse.json();

    if (tickers1Hr.length !== symbols.length) {
      throw new Error(`Mismatch in number of tickers`);
    }

    const tickers24HrResponse = await fetch(
      `https://api.binance.com/api/v3/ticker?symbols=[${symbols
        .map((s) => `\"${s}\"`)
        .join(",")}]&windowSize=1h`
    );
    if (!tickers24HrResponse.ok) {
      throw new Error(`Failed to fetch tickers for the 1d interval`);
    }
    const tickers1d: Ticker[] = await tickers24HrResponse.json();
    if (tickers1d.length !== symbols.length) {
      throw new Error(`Mismatch in number of tickers`);
    }

    const data: IndexData[] = symbols.map(
      (s) =>
        new IndexData(
          s,
          tickers1Hr.find((t) => t.symbol === s)!,
          tickers1d.find((t) => t.symbol === s)!
        )
    );

    return new Binance(data[0], data[1], data[2], data[3], data[4]);
  }
}

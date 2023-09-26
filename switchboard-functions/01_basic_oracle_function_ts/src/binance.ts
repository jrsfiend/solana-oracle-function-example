import { BN, Program } from "@coral-xyz/anchor";
import {
  OracleDataBorsh,
  OracleDataWithTradingSymbol,
  TradingSymbol,
  TradingSymbolJSON,
} from "./sdk/types";
import { BasicOracle } from "./types";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { fromJSON } from "./sdk/types/TradingSymbol";
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

// interface OracleDataBorsh {
//   oracleTimestamp: BN;
//   price: BN;
//   volume1hr: BN;
//   volume24hr: BN;
//   twap1hr: BN;
//   twap24hr: BN;
// }

// type TradingSymbol =
//   | { unknown: {} }
//   | { btc: {} }
//   | { usdc: {} }
//   | { eth: {} }
//   | { sol: {} }
//   | { doge: {} };

export function convertSymbol(symbol: string): TradingSymbolJSON {
  switch (symbol) {
    case "BTCUSDT":
      return TradingSymbol.Btc;
    case "USDCUSDT":
      return TradingSymbol.Usdc;
    case "ETHUSDT":
      return TradingSymbol.Eth;
    case "SOLUSDT":
      return TradingSymbol.Sol;
    case "DOGEUSDT":
      return TradingSymbol.Doge;
    default:
      return TradingSymbol.Unknown;
  }
}

export function convertSymbolEnum(symbol: string) {
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

class IndexData {
  constructor(
    readonly symbol: string,
    readonly hr: Ticker,
    readonly d: Ticker
  ) {}

  toOracleDataBorsh(timestamp: number): OracleDataBorsh {
    return new OracleDataBorsh({
      oracleTimestamp: new BN(timestamp),
      price: formatToNineDecimalPrecision(this.hr.lastPrice),
      volume1hr: formatToNineDecimalPrecision(this.hr.volume),
      volume24hr: formatToNineDecimalPrecision(this.d.volume),
      twap1hr: formatToNineDecimalPrecision(this.hr.weightedAvgPrice),
      twap24hr: formatToNineDecimalPrecision(this.d.weightedAvgPrice),
    });
  }
}

export class Binance {
  private fetchTimestamp = Math.floor(Date.now() / 1000);
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

  async toInstruction(
    runner: FunctionRunner,
    program: Program<BasicOracle>
  ): Promise<TransactionInstruction> {
    return await program.methods
      .refreshOracles({
        rows: [
          {
            symbol: {
              btc: {},
            },
            data: this.btcUsdt.toOracleDataBorsh(this.fetchTimestamp),
          },
          {
            symbol: {
              usdc: {},
            },
            data: this.usdcUsdt.toOracleDataBorsh(this.fetchTimestamp),
          },
          {
            symbol: {
              eth: {},
            },
            data: this.ethUsdt.toOracleDataBorsh(this.fetchTimestamp),
          },
        ],
      })
      .accounts({
        program: PublicKey.findProgramAddressSync(
          [Buffer.from("BASICORACLE")],
          program.programId
        )[0],
        oracle: PublicKey.findProgramAddressSync(
          [Buffer.from("ORACLE_V1_SEED")],
          program.programId
        )[0],
        switchboardFunction: runner.functionKey,
        enclaveSigner: runner.signer,
      })
      .instruction();
  }
}
function formatToNineDecimalPrecision(input: string): BN {
  // Parse the input string as a float
  let num = parseFloat(input);

  // Multiply by 1e9 (10^9) to shift the decimal 9 places to the right
  num *= 1e9;

  // Round to ensure no fractional part remains
  const roundedNum = Math.round(num);

  return new BN(roundedNum);
}

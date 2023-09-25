import { Program } from "@coral-xyz/anchor";
import idl from "./idl.json";
import { FunctionRunner } from "@switchboard-xyz/solana.js/functions";
import { Binance, OracleDataWithTradingSymbol, convertSymbol } from "./binance";
import { BasicOracle } from "./types";
import { PublicKey } from "@solana/web3.js";

async function main() {
  const runner = new FunctionRunner();

  const program: Program<BasicOracle> = new Program(
    JSON.parse(JSON.stringify(idl)),
    "3NKUtPKboaQN4MwY3nyULBesFaW7hHsXFrBTVjbn2nBr",
    runner.provider
  );

  const binance = await Binance.fetch();
  const rows: OracleDataWithTradingSymbol[] = [
    {
      symbol: convertSymbol("BTCUSDT"),
      data: binance.btcUsdt.toOracleDataBorsh(),
    },
    {
      symbol: convertSymbol("USDCUSDT"),
      data: binance.usdcUsdt.toOracleDataBorsh(),
    },
    {
      symbol: convertSymbol("ETHUSDT"),
      data: binance.ethUsdt.toOracleDataBorsh(),
    },
  ];

  const programStatePubkey = PublicKey.findProgramAddressSync(
    [Buffer.from("BASICORACLE")],
    program.programId
  )[0];

  const oraclePubkey = PublicKey.findProgramAddressSync(
    [Buffer.from("ORACLE_V1_SEED")],
    program.programId
  )[0];

  const ixn = await program.methods
    .refreshOracles({ rows })
    .accounts({
      program: programStatePubkey,
      oracle: oraclePubkey,
      switchboardFunction: runner.functionKey,
      enclaveSigner: runner.signer,
    })
    .instruction();

  await runner.emit([ixn]);
}

// run switchboard function
main();

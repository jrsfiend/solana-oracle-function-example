import { Program } from "@coral-xyz/anchor";
import idl from "./idl.json";
import { FunctionRunner } from "@switchboard-xyz/solana.js/runner";
import { Binance } from "./binance";
import { BasicOracle } from "./types";
import { TransactionInstruction } from "@solana/web3.js";

async function main() {
  const runner = await FunctionRunner.create();

  const program: Program<BasicOracle> = new Program(
    JSON.parse(JSON.stringify(idl)),
    "3NKUtPKboaQN4MwY3nyULBesFaW7hHsXFrBTVjbn2nBr",
    runner.program.provider
  );

  const binance = await Binance.fetch();
  const refreshOraclesIxn: TransactionInstruction = await binance.toInstruction(
    runner,
    program
  );

  await runner.emit([refreshOraclesIxn]);
}

// run switchboard function
main().catch((err) => {
  console.error(err);
  process.exit(-1);
});

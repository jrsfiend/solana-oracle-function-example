import { Program } from "@coral-xyz/anchor";
import idl from "./idl.json";
import { FunctionRunner } from "@switchboard-xyz/solana.js/functions";
import { BasicOracle } from "./types";
import { TransactionInstruction } from "@solana/web3.js";
import { TaskRunner } from "@switchboard-xyz/task-runner";

async function main() {
  const runner = new FunctionRunner();

  const program: Program<BasicOracle> = new Program(
    JSON.parse(JSON.stringify(idl)),
    "3NKUtPKboaQN4MwY3nyULBesFaW7hHsXFrBTVjbn2nBr",
    runner.provider
  );

  const taskRunner = await TaskRunner.load();

  await runner.emit([]);
}

// run switchboard function
main();

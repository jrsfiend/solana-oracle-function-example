import { Connection, clusterApiUrl } from "@solana/web3.js";
import { SwitchboardProgram } from "@switchboard-xyz/solana.js";
import { FunctionRunner } from "@switchboard-xyz/solana.js/runner";
import {
  OracleJob,
  TaskRunner,
  serializeOracleJob,
  receiptSuccess,
  TaskRunnerClients,
} from "@switchboard-xyz/task-runner";

const myOracleJob: OracleJob = serializeOracleJob({
  tasks: [{ valueTask: { value: 5 } }],
});

async function main() {
  const runner = await FunctionRunner.create();

  // const program: Program<BasicOracle> = new Program(
  //   JSON.parse(JSON.stringify(idl)),
  //   "3NKUtPKboaQN4MwY3nyULBesFaW7hHsXFrBTVjbn2nBr",
  //   runner.provider
  // );

  const switchboardProgram = await SwitchboardProgram.fromConnection(
    runner.connection
  );
  const mainnetConnection =
    runner.cluster === "mainnet-beta"
      ? runner.connection
      : new Connection(clusterApiUrl("mainnet-beta"));

  const taskRunnerClients = new TaskRunnerClients(
    runner.program,
    mainnetConnection,
    undefined
  );

  const taskRunner = new TaskRunner(
    switchboardProgram,
    clusterApiUrl("mainnet-beta"),
    taskRunnerClients
  );

  const receipt = await taskRunner.perform("myOracleJob", myOracleJob);
  if (!receiptSuccess(receipt)) {
    throw receipt.error; // TODO: handle this better and report an error
  }

  console.log(`Result: ${receipt.result}`);

  await runner.emit([]);
}

// run switchboard function
main();

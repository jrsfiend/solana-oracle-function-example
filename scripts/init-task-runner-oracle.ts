import { SwitchboardProgram, loadKeypair } from "@switchboard-xyz/solana.js";
import * as anchor from "@coral-xyz/anchor";
import { TaskRunnerOracle } from "../target/types/task_runner_oracle";
import dotenv from "dotenv";
import { loadDefaultQueue } from "./utils";
import { sleep } from "@switchboard-xyz/common";
dotenv.config();

(async () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(
    process.argv.length > 2
      ? new anchor.AnchorProvider(
          provider.connection,
          new anchor.Wallet(loadKeypair(process.argv[2])),
          {}
        )
      : provider
  );

  const payer = (provider.wallet as anchor.Wallet).payer;
  console.log(`PAYER: ${payer.publicKey}`);

  const program: anchor.Program<TaskRunnerOracle> =
    anchor.workspace.TaskRunnerOracle;
  console.log(`TaskRunnerOracle Program ID: ${program.programId}`);

  const switchboardProgram = await SwitchboardProgram.fromProvider(provider);

  const programStatePubkey = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("TASKRUNNERORACLE")],
    program.programId
  )[0];
  console.log(`PROGRAM_STATE: ${programStatePubkey}`);

  try {
    const programState = await program.account.myProgramState.fetch(
      programStatePubkey
    );
    console.log(`Program state already initialized`);
    console.log(`ORACLE: ${programState.oracle}`);
    console.log(
      `PROGRAM_STATE: \n${JSON.stringify(programState, undefined, 2)}`
    );

    // Account already initialized
  } catch (error) {
    if (!`${error}`.includes("Account does not exist or has no data")) {
      throw error;
    }
  }

  const attestationQueueAccount = await loadDefaultQueue(switchboardProgram);
  console.log(`ATTESTATION_QUEUE: ${attestationQueueAccount.publicKey}`);

  // Create the instructions to initialize our Switchboard Function
  const [functionAccount, functionInit] =
    await attestationQueueAccount.createFunction({
      container: `${process.env.DOCKERHUB_ORGANIZATION ?? "switchboardlabs"}/${
        process.env.DOCKERHUB_CONTAINER_NAME ?? "solana-task-runner-function"
      }`,
      version: `${process.env.DOCKERHUB_CONTAINER_VERSION ?? "typescript"}`, // TODO: set to 'latest' after testing
    });
  console.log(`SWITCHBOARD_FUNCTION: ${functionAccount.publicKey}`);
    
  await functionAccount.setConfig({
    schedule: "15 * * * * *",
  })
  await sleep(60000)
  await functionAccount.trigger()
  console.log(`TRIGGERED FUNCTION: ${functionAccount.publicKey}`);
})();

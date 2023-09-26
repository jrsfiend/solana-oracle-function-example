// eslint-disable-next-line node/no-unpublished-import
import type { TaskRunnerOracle } from "../target/types/task_runner_oracle";

import type { Program } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";
import { Keypair, SystemProgram } from "@solana/web3.js";
import { parseRawMrEnclave } from "@switchboard-xyz/common";
import type { FunctionAccount } from "@switchboard-xyz/solana.js";
import { SwitchboardWallet } from "@switchboard-xyz/solana.js";
import {
  AttestationProgramStateAccount,
  AttestationQueueAccount,
  type BootstrappedAttestationQueue,
  SwitchboardProgram,
  types,
} from "@switchboard-xyz/solana.js";

const unixTimestamp = () => Math.floor(Date.now() / 1000);

const MRENCLAVE = parseRawMrEnclave(
  "0x44e8f2f806229322780fbddff3e46dd23896e3f00d630fbf026ce36314c0fee1",
  true
);

describe("task_runner_oracle", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace
    .TaskRunnerOracle as Program<TaskRunnerOracle>;

  console.log(`ProgramID: ${program.programId}`);

  const payer = (program.provider as anchor.AnchorProvider).publicKey;

  const programStatePubkey = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("TASKRUNNERORACLE")],
    program.programId
  )[0];

  const oracleKeypair = Keypair.generate();

  let switchboard: BootstrappedAttestationQueue;
  let wallet: SwitchboardWallet;
  let functionAccount: FunctionAccount;

  before(async () => {
    const switchboardProgram = await SwitchboardProgram.fromProvider(
      program.provider as anchor.AnchorProvider
    );

    await AttestationProgramStateAccount.getOrCreate(switchboardProgram);

    switchboard = await AttestationQueueAccount.bootstrapNewQueue(
      switchboardProgram
    );

    console.log(`programStatePubkey: ${programStatePubkey}`);

    [wallet] = await SwitchboardWallet.create(
      switchboard.program,
      switchboard.attestationQueue.publicKey,
      payer,
      "MySharedWallet",
      16
    );

    console.log(`wallet: ${wallet.publicKey}`);

    [functionAccount] =
      await switchboard.attestationQueue.account.createFunction(
        {
          name: "test function",
          metadata: "this function handles XYZ for my protocol",
          schedule: "15 * * * * *",
          container: "switchboardlabs/basic-oracle-function",
          version: "latest",
          mrEnclave: MRENCLAVE,
          authority: programStatePubkey,
        },
        wallet
      );

    console.log(`functionAccount: ${functionAccount.publicKey}`);
  });

  it("Is initialized!", async () => {
    const space = program.account.myOracleState.size;
    console.log(`Oracle Account Size: ${space}`);

    // Add your test here.
    const tx = await program.methods
      .initialize()
      .accounts({
        program: programStatePubkey,
        oracle: oracleKeypair.publicKey,
        authority: payer,
        payer: payer,
        switchboardFunction: functionAccount.publicKey,
      })
      .signers([oracleKeypair])
      .preInstructions([
        SystemProgram.createAccount({
          fromPubkey: payer,
          newAccountPubkey: oracleKeypair.publicKey,
          lamports:
            await program.provider.connection.getMinimumBalanceForRentExemption(
              space
            ),
          space,
          programId: program.programId,
        }),
      ])
      .rpc()
      .catch((err) => {
        console.error(err);
        throw err;
      });
    console.log("Your transaction signature", tx);
  });

  // TODO: add data feed
  // TODO: remove data feed
  // TODO: save a data feed result and check the idxs updated
});

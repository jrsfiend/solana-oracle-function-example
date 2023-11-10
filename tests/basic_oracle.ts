// eslint-disable-next-line node/no-unpublished-import
import type { TaskRunnerOracle } from "../target/types/task_runner_oracle";
import fs from 'fs'
import type { Program } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { sleep } from "@switchboard-xyz/common";
import { FunctionAccount } from "@switchboard-xyz/solana.js";
import {
  SwitchboardWallet,
  attestationTypes,
} from "@switchboard-xyz/solana.js";
import { type BootstrappedAttestationQueue } from "@switchboard-xyz/solana.js";
import { assert } from "chai";
import { MRENCLAVE, setupTest } from "./utils";

const unixTimestamp = () => Math.floor(Date.now() / 1000);
setTimeout(async function(){
  let switchboard: BootstrappedAttestationQueue;
  let wallet: SwitchboardWallet
  let functionPubkey: PublicKey = new PublicKey("2Z5Tk1F4kS9uBQd8LsUX3q6b46hGLvfZUR16tRZz7hXH")
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
 let functionAccount: FunctionAccount
 const program: anchor.Program<TaskRunnerOracle> =
    anchor.workspace.TaskRunnerOracle;
  console.log(`ProgramID: ${program.programId}`);

  const payer = (program.provider as anchor.AnchorProvider).publicKey;

  const programStatePubkey = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("TASKRUNNERORACLE")],
    program.programId
  )[0];
  console.log(`programStatePubkey: ${programStatePubkey}`);
    let programState = await program.account.myProgramState.fetch(
      programStatePubkey
    );
    console.log(programState);
  const oracleKeypair = new PublicKey("DwCnhejxV4LHKRaVhMxvCKtpq6NeMiRTnvWKCHUwLPF7")
  console.log(`oraclePubkey: ${oracleKeypair}`);
    
  var firstFeedIpfsHash = Buffer.from(
    "MyFirstDataFeed-IpfsHash".padEnd(32, " ")
  ).slice(0, 32);

    console.log(1)
    switchboard = await setupTest(program.provider as anchor.AnchorProvider);
    console.log(`Attestation Queue: ${switchboard.attestationQueue.publicKey}`);

    [wallet] = await SwitchboardWallet.create(
      switchboard.program,
      switchboard.attestationQueue.publicKey,
      payer,
      "TaskRunnerOracleWallet",
      16
    );
    [functionAccount] =
      await switchboard.attestationQueue.account.createFunction(
        {
          name: "test function",
          metadata: "this function handles XYZ for my protocol",
          container: "jrsdunn/solana-task-runner-function",
          version: "latest",
          mrEnclave: MRENCLAVE,
          authority: payer,
        },
        wallet,
        { skipPreflight: true }
      );
    console.log(`functionAccount: ${functionAccount.publicKey}`);
    // transfer 0.1 sol to functionAccount.publicKey
   
    await functionAccount.setConfig({
      schedule:"1 * * * * *"
    });

  await sleep(70000)
  await functionAccount.trigger()
    await functionAccount.setAuthority({
      authority: Keypair.fromSecretKey(
        new Uint8Array(
          JSON.parse(
            fs.readFileSync(
              "/home/codespace/.config/solana/id.json"
            ).toString()
          )
        )
      ),
      newAuthority: programStatePubkey
    })
    await program.methods
    .updateProgram()
    .accounts({
      program: programStatePubkey,
      authority: payer,
      switchboardFunction: functionAccount.publicKey,
    })
    .rpc()
    .catch((err) => {
      console.error(err);
      throw err;
    });
/*
    [wallet] = await SwitchboardWallet.create(
      switchboard.program,
      switchboard.attestationQueue.publicKey,
      payer,
      "TaskRunnerOracleWallet",
      16
    );
    */

    console.log(`wallet: ${wallet}`);

    // Kind of annoying, the function is a PDA derived from the payer and recentSlot
    // So we need to wait for the recentSlot to tick over before we can create the function.
    // We could manually provide the incremented recent slot, but this is easier.
/*
    [functionAccount] =
      await switchboard.attestationQueue.account.createFunction(
        {
          name: "test function",
          metadata: "this function handles XYZ for my protocol",
          container: "jrsdunn/solana-task-runner-function",
          version: "latest",
          mrEnclave: MRENCLAVE,
          authority: programStatePubkey,
        },
        wallet,
        { skipPreflight: true }
      );
    console.log(`functionAccount: ${functionAccount}`);
*/

    const space = program.account.myOracleState.size;
    console.log(`Oracle Account Size: ${space}`);
/*
    // Add your test here.
    var tx= await program.methods
      .initialize()
      .accounts({
        program: programStatePubkey,
        oracle: oracleKeypair,
        authority: payer,
        payer: payer,
        switchboardFunction: functionAccount,
      })
      .signers([oracleKeypair])
      .preInstructions([
        // oracle account is a keypair account so theres no PDA size restrictions
        SystemProgram.createAccount({
          fromPubkey: payer,
          newAccountPubkey: oracleKeypair,
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
    console.log(`[TX] initialize: ${tx}`);
    */
console.log(1)
    var ix= await program.methods
      .addFeed({
        idx: 5,
        name: Buffer.from(new Date().getTime().toString()).slice(0, 32),
        ipfsHash: firstFeedIpfsHash,
        updateInterval: 10,
      })
      .accounts({
        program: programStatePubkey,
        oracle: oracleKeypair,
        authority: payer,
      })
      .instruction();
      var addTx = new Transaction().add(ix);
      addTx.feePayer = payer;
      addTx.recentBlockhash = (await program.provider.connection.getRecentBlockhash()).blockhash;
      var tx= await program.provider.sendAndConfirm(addTx);

    console.log(`[TX] add_feed: ${tx}`);

    var oracleState = await program.account.myOracleState.fetch(
      oracleKeypair
    );
    assert(
      Buffer.compare(
        Buffer.from(oracleState.feeds[0].ipfsHash),
        firstFeedIpfsHash
      ) === 0
    );

    console.log(2)
    var preOracleState = await program.account.myOracleState.fetch(
      oracleKeypair
    );

    const securedSigner = anchor.web3.Keypair.generate();

    const rewardAddress =
      await switchboard.program.mint.getOrCreateAssociatedUser(payer);

    const functionState = await functionAccount.loadData();
    // TODO: generate function verify ixn
    const functionVerifyIxn = attestationTypes.functionVerify(
      switchboard.program,
      {
        params: {
          observedTime: new anchor.BN(unixTimestamp()),
          nextAllowedTimestamp: new anchor.BN(unixTimestamp() + 100),
          errorCode: 0,
          mrEnclave: Array.from(MRENCLAVE),
        },
      },
      {
        function: functionAccount.publicKey,
        functionEnclaveSigner: securedSigner.publicKey,
        verifier: switchboard.verifier.publicKey,
        verifierSigner: switchboard.verifier.signer.publicKey,
        attestationQueue: switchboard.attestationQueue.publicKey,
        escrowWallet: functionState.escrowWallet,
        escrowTokenWallet: functionState.escrowTokenWallet,
        receiver: rewardAddress,
        verifierPermission: switchboard.verifier.permissionAccount.publicKey,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      }
    );

    var tx= await program.methods
      .saveFeedResult({
        idx: 5,
        ipfsHash: firstFeedIpfsHash,
        result: new anchor.BN(10),
      })
      .accounts({
        program: programStatePubkey,
        oracle: oracleKeypair,
        switchboardFunction: functionAccount.publicKey,
        enclaveSigner: securedSigner.publicKey,
      })
      .preInstructions([functionVerifyIxn])
      .signers([switchboard.verifier.signer, securedSigner])
      .rpc()

    console.log(`[TX] save_result: ${tx}`);

    await sleep(1000);
    var oracleState = await program.account.myOracleState.fetch(
      oracleKeypair
    );
    var firstFeed = oracleState.feeds[0];
    console.log(firstFeed)
    const firstValue: { value: anchor.BN; timestamp: anchor.BN } =
      firstFeed.history[firstFeed.historyIdx - 1];
console.log(firstValue)
    assert(firstValue.value.eq(new anchor.BN(10)), "Data Feed result mismatch");

  // // TODO: remove data feed
    var preOracleState = await program.account.myOracleState.fetch(
      oracleKeypair
    );
});
import { SwitchboardProgram, loadKeypair } from "@switchboard-xyz/solana.js";
import * as anchor from "@coral-xyz/anchor";
import { SrfxUsdcOracle } from "../target/types/srfx_usdc_oracle";
import dotenv from "dotenv";
import { loadDefaultQueue } from "./utils";
import fs from 'fs'
import { PublicKey } from "@solana/web3.js";
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

  let program = new anchor.Program(
    JSON.parse(
      fs.readFileSync(
        "./target/idl/srfx_usdc_oracle.json",
        "utf8"
      ).toString()
    ),
    new PublicKey("4sfoyawsXeao4WoeDtafuc1sbVmEcr72XEhGiNFYDpUv"),
    provider
  );
  console.log(`PROGRAM: ${program.programId}`);

  const switchboardProgram = await SwitchboardProgram.fromProvider(provider);

  const [programStatePubkey, b1] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("SRFX_USDC_ORACLE")],
    program.programId
  );
  console.log(`PROGRAM_STATE: ${programStatePubkey}`);

  const [oraclePubkey, b2] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("ORACLE_SRFX_SEED")],
    program.programId
  );
  console.log(`ORACLE_PUBKEY: ${oraclePubkey}`);

  try {
    const programState = await program.account.myProgramState.fetch(
      programStatePubkey
    );
    console.log(`Program state already initialized`);
    console.log(
      `PROGRAM_STATE: \n${JSON.stringify(programState, undefined, 2)}`
    );
    
    const oracleState = await program.account.myOracleState.fetch(
      oraclePubkey
    );
    console.log(
      `ORACLE_STATE: \n${JSON.stringify(oracleState, undefined, 2)}`
    );
    
  const signature = await program.methods
  .updatePrice(1)
  .accounts({
    program: programStatePubkey,
    authority: payer.publicKey,
    switchboardFunction: new PublicKey("8y2PQz9PMG8fQmZj5geoFhK9DawzVdgSsVZb1o26sigx"),
    attestationQueue: new PublicKey("CkvizjVnm2zA5Wuwan34NhVT3zFc7vqUyGnA6tuEF5aE"),
    attestationProgram: new PublicKey("sbattyXrzedoNATfc4L31wC9Mhxsi1BmFhTiN8gDshx")
  })
  .rpc();

console.log(`[TX] initialize: ${signature}`);
    return;

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
    await attestationQueueAccount.createFunctionInstruction(payer.publicKey, {
      container: `${process.env.DOCKERHUB_ORGANIZATION ?? "switchboardlabs"}/${
        process.env.DOCKERHUB_CONTAINER_NAME ?? "solana-balancer-oracle-function"
      }`,
      version: `${process.env.DOCKERHUB_CONTAINER_VERSION ?? "latest"}`, // TODO: set to 'latest' after testing
    });
  console.log(`SWITCHBOARD_FUNCTION: ${functionAccount.publicKey}`);

  const signature = await program.methods
    .initialize()
    .accounts({
      program: programStatePubkey,
      authority: payer.publicKey,
      switchboardFunction: functionAccount.publicKey,
    })
    .signers([...functionInit.signers])
    .preInstructions([...functionInit.ixns])
    .rpc();

  console.log(`[TX] initialize: ${signature}`);
})();
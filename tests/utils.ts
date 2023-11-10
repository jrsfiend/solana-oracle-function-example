import { AnchorProvider } from "@coral-xyz/anchor";
import type { Connection } from "@solana/web3.js";
import { parseRawMrEnclave, sleep } from "@switchboard-xyz/common";
import {
  BootstrappedAttestationQueue,
  SwitchboardProgram,
  AttestationProgramStateAccount,
  AttestationQueueAccount,
} from "@switchboard-xyz/solana.js";

export async function printLogs(
  connection: Connection,
  tx: string,
  v0Txn?: boolean,
  delay = 3000
) {
  await sleep(delay);
  const parsed = await connection.getParsedTransaction(tx, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: v0Txn ? 0 : undefined,
  });
  console.log(parsed?.meta?.logMessages?.join("\n"));
}

export const unixTimestamp = () => Math.floor(Date.now() / 1000);

// Made up MrEnclave to use for our tests
export const MRENCLAVE = parseRawMrEnclave(
  "0xa038e3b41265889aaae32cbec4d678de13857a6d11bb7305cedff854f08c3cc8",
  true
);

export async function setupTest(
  provider: AnchorProvider
): Promise<BootstrappedAttestationQueue> {
  const switchboardProgram = await SwitchboardProgram.fromProvider(provider);

  await AttestationProgramStateAccount.getOrCreate(switchboardProgram);

  const switchboard = await AttestationQueueAccount.bootstrapNewQueue(
    switchboardProgram
  );

  return switchboard;
}

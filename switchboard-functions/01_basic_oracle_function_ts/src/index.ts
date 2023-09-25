import { Program, Idl } from "@coral-xyz/anchor";
import idl from "./idl.json";
import { SwitchboardProgram } from "@switchboard-xyz/solana.js";

// Generate a random number and call into "callback"
async function main() {
  const program = new Program(
    JSON.parse(JSON.stringify(idl)),
    "3NKUtPKboaQN4MwY3nyULBesFaW7hHsXFrBTVjbn2nBr"
  );
}

// run switchboard function
main();

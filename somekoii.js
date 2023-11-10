const koiiWeb3 = require('@_koi/web3.js');

const keypair = koiiWeb3.Keypair.fromSecretKey(
    new Uint8Array([165,166,139,96,25,177,218,185,101,149,189,181,164,139,65,82,161,65,172,44,155,67,190,151,110,7,239,188,207,120,128,202,149,52,184,107,96,96,208,208,185,46,18,206,170,237,10,26,223,26,119,62,31,154,196,168,98,223,71,72,62,141,225,78])
)

const connection = new koiiWeb3.Connection(
    'https://k2-testnet.koii.live',
    'confirmed',
);

async function main(){
    let tx = new koiiWeb3.Transaction();
    for (var i = 0; i < 100; i++) {
    tx.add(
        koiiWeb3.SystemProgram.transfer({
            fromPubkey: keypair.publicKey,
            toPubkey: keypair.publicKey,
            lamports: 10000,
        })
    )
    }
    tx.feePayer = keypair.publicKey;
    tx.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
    
    await koiiWeb3.sendAndConfirmTransaction(
        connection,
        tx,
        [keypair],
        {
            skipPreflight: false,
            commitment: 'confirmed',
        }
    )
    
}
main()
balancer.rs

it's not aptly named, as we're pulling data from onchain balancer pools. Renamne it to balancer.rs.

**Technical Documentation:**

**Objective**: Update the `balancer.rs` file in a Rust project to modify the data structures and fetching logic for a cryptocurrency oracle.

**Before You Start:**

- Ensure you have a text editor installed (e.g., Visual Studio Code).
- Ensure you have access to the project containing the `balancer.rs` file.
- Understand that we are modifying how data is fetched and structured in a Rust program.

**Step-by-Step Instructions:**

1. Open the project in your text editor.
2. Navigate to `src/balancer.rs` within the `02_srfx_usdc_oracle_function_rust` directory of the project.
3. Find the section that imports modules at the top of the file.
4. Change `use basic_oracle::{OracleDataBorsh, TradingSymbol};` to `use srfx_usdc_oracle::{OracleDataBorsh, TradingSymbol};`.
5. Scroll to the `Ticker` struct definition section.
6. Remove the unused fields such as `priceChange`, `priceChangePercent`, `weightedAvgPrice`, `openPrice`, `highPrice`, `lowPrice`, `lastPrice`, `volume`, `quoteVolume`, `openTime`, and `closeTime`.
7. Change `pub lastPrice: String,` to `pub price: I256,`.
8. Locate the `IndexData` struct and modify the fields to only include `pub symbol: String` and `pub quote: Ticker`.
9. Adjust the `Into<OracleDataBorsh>` implementation for `IndexData` to only convert the new `price` field from the `Ticker` struct.
10. Update the `Binance` struct to contain only one `IndexData` field named `pub srfx_usdc`.
11. Adjust the `Binance` implementation\'s `fetch` method to set up the new field based on the symbol `"SRFXUSD"` and the provided `price`.

**ELI5:**

Hey there! We\'re going to make some changes to a code file for a Rust project, so it better fits the data we want to get from a cryptocurrency\'s pricing info. Don\'t worry; I\'ll guide you through it.

1. First, find and open the project folder with your text editor.
2. Look for a file named `balancer.rs` inside the `src` folder.
3. At the start of the file, we\'ve got some lines that add tools we\'ll need. We\'re going to swap `basic_oracle` with `srfx_usdc_oracle` so we can use the latest tools.
4. Next, there\'s a part where we describe the kind of data we want. We now only need the symbol (like "SRFXUSD") and the price. So we\'re going to remove all the extra details we don\'t need anymore.
5. Then, we\'ll make sure when we use this data later on, we only focus on the price.
6. After that, for our `Binance` data collector, we only need to track the "SRFXUSD" pricing data. We\'ll set that up using a new field.
7. In the `fetch` method, we need to make sure it knows about our new "SRFXUSD" data and what price we\'re looking at.
8. Lastly, there\'s a bunch of other technical stuff to send our data out correctly, but most importantly, we\'re making sure all the places that used to look for lots of coins are now only focusing on our "SRFXUSD" price.

By following these steps, you\'ll have everything set up for the "SRFXUSD" price, and you\'ll remove all the extra fluff we don\'t need. It\'s like cleaning out a closet and leaving only what you wear daily!

Remember, when working with code, saving changes and testing often can help you catch any little mistakes. Now, go have fun coding!

lib.rs

Let's break down this programming difference (also known as a diff or patch) and explain how to apply the changes to the file `lib.rs`. These changes involve identifiers and program seeds in a Rust programming project.

**Step-by-Step Instructions for Beginners:**

1. **Find Identifiers:**
   - Original Identifier: `3NKUtPKboaQN4MwY3nyULBesFaW7hHsXFrBTVjbn2nBr`
   - New Identifier: `5Xf8maajW5MCaeUPn1RLSJY2CczZiWN31eGuDWePgvSV`

2. **Update Program Seed:**
   - Original Seed: `BASICORACLE`
   - New Seed: `SRFXUSDCORACLE`


**Step-by-Step Instructions in ELI5:**

1. **Find the Name Tags:**
   - Old Name Tag: It's a long combo of letters and numbers that starts with `3NKU...`
   - New Name Tag: This one's different but also long, and it begins with `5Xf8...`

2. **Change the Secret Code (Program Seed):**
   - Old Secret Code: It looks like this: `BASICORACLE`
   - New Secret Code: Now, it's different and says `SRFXUSDCORACLE`


And that's it!

Remember, these instructions are more like a guide—for someone just starting out, it might be helpful to have a buddy who knows coding to help out. It's like having a friend guide you through a complicated recipe.

Now let's talk about changes to `models.rs`.

**Step-by-Step Instructions for Beginners:**

1. **Simplify `OracleData` Structures:**
   - Remove unnecessary data: `volume_1hr, volume_24hr, twap_1hr, twap_24hr` from both `OracleData` and `OracleDataBorsh`

2. **Update `MyOracleState` To Reflect New Data:**
   - Change multiple oracle data tracking like `btc, usdc, eth, sol, doge` to just `srfx_usdc`.

**Step-by-Step Instructions ELI5:**

1. **Streamline `OracleData`:**
   - You'll remove extra details from both the `OracleData` and its buddy `OracleDataBorsh`. No more one-hour and 24-hour stats; just focus on the main price.

2. **Refocus `MyOracleState`:**
   - Instead of keeping track of a bunch of different scores (like in a multi-sport event), you're only checking one now: `srfx_usdc`.

Carrying out these changes essentially streamlines the information your program will handle and focuses on a specific oracle data set, `srfx_usdc`, which tracks specific currency exchange data.

Suppose this was a bit too technical; feel free to ask for more details or clarification. And if you're diving into this kind of programming project for the first time, it's super exciting, so don't hesitate to experiment with these changes—but maybe not directly in the main project until you feel more confident. Happy coding!

main.rs

Just think of `main.rs` as a recipe that we’re going to tweak with new ingredients. The "ingredients," in this case, are bits of code that tell the computer what to do. We\'re going to add new instructions to our recipe to make it better.

Here is how we will do it, step by step:

1. First, open the `main.rs` file in a text editor that lets you edit code, like Visual Studio Code or Sublime Text.
2. Start with the existing ingredients (lines of code) and prepare to add new ones.
3. We\'re adding new tools for our recipe to work with. Copy and paste the following ingredients into your `main.rs` file at the very top:
   ```rust
   use std::future::Future;
   use std::pin::Pin;
   use std::boxed::Box;
   ```

   This is like getting new types of flour and sugar ready for our baking!

4. Next, paste these ingredients right after the ones you just added:
   ```rust
   use rust_decimal::Decimal;
   use ethers::{
      providers::{Http, Provider},
   };
   ```

   Think of this as adding special spices to our dough.

5. Paste these new lines as well:
   ```rust
   pub const PROGRAM_SEED: &[u8] = b"SRFXUSDCORACLE";
   ```

   That’s like setting the right oven temperature.

6. Finally, save your `main.rs` file. It’s as if you’ve put the cake in the oven and now you’re waiting for it to bake.

Great job! You’ve just updated a computer program.

**ELI5 Version: How to Make Your Code Cool and Get It Working**

Hey friends! Today in our cool computer club, we\'re going to jazz up a computer recipe called `main.rs`. Imagine it’s like a TikTok dance routine that we’re adding new moves to.

Follow these chill steps to do it:

1. Fire up a neat app where you can fiddle with code - something like the "Notes" for nerds.
2. Our current dance routine (code) is cool, but we need hotter moves. We’ll add trendy steps at the start of our routine:
   ```rust
   use std::future::Future;
   use std::pin::Pin;
   use std::boxed::Box;
   ```

   That’s like learning new moves from the latest viral vid!

3. Bring in the funky beats. Add this fresh music (code) right below our new dance moves:
   ```rust
   use rust_decimal::Decimal;
   use ethers::{
      providers::{Http, Provider},
   };
   ```

   That’s the sound of your dance going viral!

4. Keep throwing in the crazy handstands and twirls until it feels like we’ve got the freshest routine in town.
5. Hit the "Save" button as if you’re hitting “Post” on the coolest TikTok ever.

Well done! You’ve just taken your code (aka the dance of the computers) from the \'meh\' pile to the \'wow\' pile. Rock on!

We've got some more changes to make in our project, and I'm here to walk you through them, step by step. Cool? Cool.

**Part 1: Update `.env` File**

1. Open the file named `.env`.
2. You'll see something like `DOCKERHUB_ORGANIZATION=switchboardlabs`.
3. Change `switchboardlabs` to `your own docker username`.
4. That's it for this file.

**Part 2: Update `Anchor.toml` File**

1. Locate the file `Anchor.toml`.
2. It's like a list of settings. Find the section `[programs.localnet]` and `[programs.devnet]`.
3. Change the `srfxusdc_oracle` line to a new address, `5Xf8maajW5MCaeUPn1RLSJY2CczZiWN31eGuDWePgvSV`.
4. Save your changes.

**Part 3: Makefile Adjustments**

This one's a bit trickier, so follow closely!

1. Find the `Makefile`.
2. Look for lines with `-f ./switchboard-functions/01_basic_oracle_function/Dockerfile`.
3. Change them to `-f ./switchboard-functions/02_srfxusdc_oracle_function_rust/Dockerfile`.
4. Also, update `DOCKERHUB_ORGANIZATION` to `your own docker username`.

**Part 4: `pnpm-lock.yaml` Update**

1. Look for `pnpm-lock.yaml`.
2. In the dependencies section, find `@switchboard-xyz/solana.js`.
3. Change the version from `2.8.0-beta.4` to `2.8.0-beta.5`.
4. You're doing great!

**Part 5: `Cargo.toml` Changes**

1. Find `Cargo.toml` inside `switchboard-functions/02_srfxusdc_oracle_function_rust`.
2. We have a list here; update versions for some items, like `switchboard-utils` to `0.9.0`.

**Part 6: Updates for Rust Files**

For `.rs` files in `switchboard-functions/02_srfxusdc_oracle_function_rust/src`, follow similar steps in updating versions and dependencies.

**Part 7: Dockerfile Update**

1. Within `switchboard-functions/02_srfxusdc_oracle_function_rust`, find `Dockerfile`.
2. Change references from `01_basic_oracle_function` to `02_srfxusdc_oracle_function_rust`.

**Part 8: Scripts and Tests**

1. Update script and test files like `init-basic-oracle.ts` and `basic_oracle.ts` in a similar manner, focusing on replacing `basic_oracle` with `srfxusdc_oracle` where applicable.

**ELI5 Version:**

Want to make some cool changes to our code? Sweet! Grab your keyboard and join me as we update some of our project files together.

Grab that `.env` file and swap out the old 'trusted organization name with the new one that looks a lot like your own. Next up, flip open that `Anchor.toml` and scribble a new note for `srfxusdc_oracle`.

Ready for a little challenge? Fetch your `Makefile` and switch out old file paths for new ones in a snap! Also, sign your name where you see `DOCKERHUB_ORGANIZATION`.

Now, dive into the `pnpm-lock.yaml` and give our friend `@switchboard-xyz/solana.js` a shiny new version sticker.

Got a hankering for some `Cargo.toml` action? Bust it open and give some versions a nudge upward, like pushing `switchboard-utils` to stand tall at `0.9.0`.

How about we tinker with some `.rs` files now? Just follow the breadcrumb trail of version updates and dependency tweaks.

Don't forget about that `Dockerfile`! X marks the spot: change out an old path for a brand spankin' new one.

Almost there! Open up those scripts and tests. It's like we're doing a word search, finding `basic_oracle` and swapping it with `srfxusdc_oracle`.

And there you have it! Give yourself a high-five for powering through those technical changes! 🙌

--todo: build, deploy anchor program && build, push docker image for function && create function && trigger function--

anchor build && anchor deploy --provider.cluster devnet

check the programId! replace all instances of the srfx_usdc_oracle programId mentioned in root Anchor.toml with the new one.

anchor build && anchor deploy --provider.cluster devnet

build and publish function: make build-basic-function && make publish-basic-function

find out your enclave hash: make measurement && cat measurement.txt

create the function on Switchboard, your friendly local neighbourhood superpower factory on many chains: sb solana function create ALZNPjwkbhrH87cV7Mv8qFjdZzpfep58X3iAhoYzeksC --name assessment-magick --fundAmount 0.1 --container your own docker username/solana-basic-oracle-function --version latest -k ~/.config/solana/id.json --mrEnclave {response from above cat command} --cluster devnet

trigger one-time: sb solana function send-request 2RYL1QuVyBLgwJQm5ARfAeZjic7TnFszrMc8ESWfrnn4 -k ~/.config/solana/id.json

trigger as a scheduled routine: sb solana routine create 2RYL1QuVyBLgwJQm5ARfAeZjic7TnFszrMc8ESWfrnn4 --name magick-minutely --schedule "*/1 * * * *" -k ~/.config/solana/id.json --cluster devnet



import {
    ActionPostResponse,
    ACTIONS_CORS_HEADERS,
    createPostResponse,
    ActionGetResponse,
    ActionPostRequest,
  } from "@solana/actions";
  import {
    clusterApiUrl,
    Connection,
    LAMPORTS_PER_SOL,
    PublicKey,
    SystemProgram,
    Transaction,
  } from "@solana/web3.js";
  
  const DEFAULT_SOL_ADDRESS = new PublicKey("5ckKLcEPRi2F5UZRPGuVAUj6mrDKpJ63QVmnpHoaBfFJ");
  
  const DEFAULT_SOL_AMOUNT = 1;
  
  export async function GET(req: Request) {
    try {
      const requestUrl = new URL(req.url);
      const { toPubkey } = validatedQueryParams(requestUrl);
  
      const baseHref = new URL(
        `/api/actions/transfer-sol?to=${toPubkey.toBase58()}`,
        requestUrl.origin
      ).toString();
  
      const payload: ActionGetResponse = {
        title: "Actions Example - Transfer Native SOL",
        icon: new URL("/solana_devs.jpg", requestUrl.origin).toString(),
        description: "Transfer SOL to another Solana wallet",
        label: "Transfer",
        links: {
          actions: [
            {
              label: "Send 1 SOL",
              href: `${baseHref}&amount=1`,
            },
            {
              label: "Send 5 SOL",
              href: `${baseHref}&amount=5`,
            },
            {
              label: "Send 10 SOL",
              href: `${baseHref}&amount=10`,
            },
            {
              label: "Send SOL",
              href: `${baseHref}&amount={amount}`,
              parameters: [
                {
                  name: "amount",
                  label: "Enter the amount of SOL to send",
                  required: true,
                },
              ],
            },
          ],
        },
      };
  
      return new Response(JSON.stringify(payload), {
        headers: ACTIONS_CORS_HEADERS,
      });
    } catch (err) {
      console.error(err);
      let message = "An unknown error occurred";
      if (typeof err === "string") message = err;
      return new Response(message, {
        status: 400,
        headers: ACTIONS_CORS_HEADERS,
      });
    }
  }
  
  export async function POST(req: Request) {
    try {
      const requestUrl = new URL(req.url);
      const { amount, toPubkey } = validatedQueryParams(requestUrl);
  
      const body: ActionPostRequest = await req.json();
  
      let account: PublicKey;
      try {
        account = new PublicKey(body.account);
      } catch (err) {
        return new Response('Invalid "account" provided', {
          status: 400,
          headers: ACTIONS_CORS_HEADERS,
        });
      }
  
      const connection = new Connection(
        process.env.SOLANA_RPC || clusterApiUrl("devnet")
      );
  
      const minimumBalance = await connection.getMinimumBalanceForRentExemption(
        0
      );
      if (amount * LAMPORTS_PER_SOL < minimumBalance) {
        throw `account may not be rent exempt: ${toPubkey.toBase58()}`;
      }
  
      const transferSolInstruction = SystemProgram.transfer({
        fromPubkey: account,
        toPubkey: toPubkey,
        lamports: amount * LAMPORTS_PER_SOL,
      });
  
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
  
      const transaction = new Transaction({
        feePayer: account,
        blockhash,
        lastValidBlockHeight,
      }).add(transferSolInstruction);
  
      const payload: ActionPostResponse = await createPostResponse({
        fields: {
          transaction,
          message: `Send ${amount} SOL to ${toPubkey.toBase58()}`,
        },
      });
  
      return new Response(JSON.stringify(payload), {
        headers: ACTIONS_CORS_HEADERS,
      });
    } catch (err) {
      console.error(err);
      let message = "An unknown error occurred";
      if (typeof err === "string") message = err;
      return new Response(message, {
        status: 400,
        headers: ACTIONS_CORS_HEADERS,
      });
    }
  }
  
  function validatedQueryParams(requestUrl: URL) {
    let toPubkey: PublicKey = DEFAULT_SOL_ADDRESS;
    let amount: number = DEFAULT_SOL_AMOUNT;
  
    try {
      if (requestUrl.searchParams.get("to")) {
        toPubkey = new PublicKey(requestUrl.searchParams.get("to")!);
      }
    } catch (err) {
      throw "Invalid input query parameter: to";
    }
  
    try {
      if (requestUrl.searchParams.get("amount")) {
        amount = parseFloat(requestUrl.searchParams.get("amount")!);
      }
  
      if (amount <= 0) throw "amount is too small";
    } catch (err) {
      throw "Invalid input query parameter: amount";
    }
  
    return {
      amount,
      toPubkey,
    };
  }
  
  export const OPTIONS = GET;
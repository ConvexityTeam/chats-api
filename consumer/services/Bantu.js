const StellarSdk = require("stellar-sdk");
const fetch = require("node-fetch");
require("dotenv").config();

const config = {
  BASE_URL: process.env.BANTU_BASE_URL,
  ADMIN_ADDRESS: process.env.BANTU_ADMIN_ADDRESS,
  ADMIN_SECRET: process.env.BANTU_ADMIN_ADDRESS_KEY,
  NETWORK_PASSPHRASE: process.env.BANTU_NETWORK_PASSPHRASE,
};
const server = new StellarSdk.Server(config.BASE_URL);

function createPair() {
  const pair = StellarSdk.Keypair.random();

  const privateKey = pair.secret();
  const publicKey = pair.publicKey();

  return {
    secret: privateKey,
    publicKey,
  };
}

async function creditWallet(publicKey) {
  try {
    const response = await fetch(
      `https://friendbot.dev.bantu.network?addr=${encodeURIComponent(
        publicKey
      )}`
    );
    const responseJSON = await response.json();
    console.log("SUCCESS! You have a new account :)\n", responseJSON);
  } catch (e) {
    console.error("ERROR!", e);
  }
}

async function getXbnBalance(publicKey) {
  return new Promise(async (resolve, reject) => {
    let xbnBalance = 0;
    return await server
      .loadAccount(publicKey)
      .then((account) => {
        account.balances.forEach(function (balance) {
          if (balance.asset_type == "native") {
            xbnBalance = balance.balance;
            return;
          }
        });
        resolve(xbnBalance);
      })
      .catch((error) => {
        reject(error.message);
      });
  });
}

async function transferToken(senderSecret, amount) {
  return new Promise((resolve, reject) => {
    var sourceKeys = StellarSdk.Keypair.fromSecret(senderSecret);
    var destinationId = config.ADMIN_ADDRESS;
    var transaction;
    server
      .loadAccount(destinationId)
      .then(async function () {
        return server.loadAccount(sourceKeys.publicKey());
      })
      .then(function (sourceAccount) {
        transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
          fee: StellarSdk.BASE_FEE,
          networkPassphrase: config.NETWORK_PASSPHRASE,
        })
          .addOperation(
            StellarSdk.Operation.payment({
              destination: destinationId,
              asset: StellarSdk.Asset.native(),
              amount: String(amount),
            })
          )
          .addMemo(StellarSdk.Memo.text("Test Transaction"))
          .setTimeout(180)
          .build();
        transaction.sign(sourceKeys);
        return server.submitTransaction(transaction);
      })
      .then(function (result) {
        resolve(result);
      })
      .catch(function (error) {
        if (error instanceof StellarSdk.NotFoundError) {
          return reject("The destination account does not exist!");
        } else {
          return reject(error);
        }
      });
  });
}

module.exports = {
  createPair,
  getXbnBalance,
  creditWallet,
  transferToken,
};

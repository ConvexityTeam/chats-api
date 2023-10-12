/* eslint-disable new-cap */
const axios = require('axios');
const ethers = require('ethers');
const moment = require('moment');
const crypto = require('crypto');
const sha256 = require('simple-sha256');
const { Message } = require('@droidsolutions-oss/amqp-ts');
const { tokenConfig, switchWallet } = require('../config');
const { SwitchToken } = require('../models');
const { Encryption, Logger, RabbitMq } = require('../libs');
const AwsUploadService = require('./AwsUploadService');
const { RERUN_QUEUE_AFTER } = require('../constants/rerun.queue');
const QueueService = require('./QueueService');

const provider = new ethers.providers.getDefaultProvider(
  process.env.BLOCKCHAINSERV,
);
const Interface = new ethers.utils.Interface([
  'event initializeContract(uint256 indexed contractIndex,address indexed contractAddress, string indexed _name)',
]);

const Axios = axios.create();

class BlockchainService {
  static async requeueMessage(bind, args) {
    const confirmTransaction = RabbitMq.default.declareQueue(bind, {
      durable: true,
    });
    const payload = { ...args };
    confirmTransaction.send(
      new Message(payload, {
        contentType: 'application/json',
      }),
    );
  }

  static async reRunContract(method, args, contract = 'nft') {
    return new Promise((resolve, reject) => {
      Logger.info('Increasing gas price');
      Axios.post(
        `${tokenConfig.baseURL}/txn/increase-gas-price`,
        {
          contract,
          method,
          ...args,
        },
      ).then((response) => {
        Logger.info('Increased Gas Price');
        resolve(response.data);
      }).catch((error) => {
        Logger.error(
          `Error increasing gas price: ${JSON.stringify(error?.response?.data)}`,
        );
        reject(error);
      });
    });
  }

  static async nftTransfer(
    senderPrivateKey,
    sender,
    receiver,
    tokenId,
    collectionAddress,
  ) {
    try {
      Logger.info('TRANSFERRING NFT');
      const { data } = await Axios.post(
        `${tokenConfig.baseURL}/txn/transfer-nft/${senderPrivateKey}/${sender}/${receiver}/${tokenId}/${collectionAddress}`,
      );
      Logger.info('TRANSFERRED NFT');
      return data;
    } catch (error) {
      Logger.error(`ERROR TRANSFERRING NFT: ${JSON.stringify(error?.response?.data)}`);
      if (
        error.response.data.message.code === 'REPLACEMENT_UNDERPRICED'
        || error.response.data.message.code === 'UNPREDICTABLE_GAS_LIMIT'
        || error.response.data.message.code === 'INSUFFICIENT_FUNDS'
      ) {
        await QueueService.increaseGasApproveSpending(
          senderPrivateKey,
          sender,
          receiver,
          tokenId,
          collectionAddress,
        );
      }
      throw error;
    }
  }

  static async nftBurn(burnerPrivateKey, collectionAddress, tokenID) {
    try {
      Logger.info('BURNING NFT');
      const { data } = await Axios.post(
        `${tokenConfig.baseURL}/txn/burn-nft/${burnerPrivateKey}/${collectionAddress}/${tokenID}`,
      );
      Logger.info('NFT BURNED');
      return data;
    } catch (error) {
      Logger.error(
        `ERROR BURNING NFT: ${JSON.stringify(error?.response?.data)}`,
      );
      throw error;
    }
  }

  static async createNFTCollection(collection) {
    try {
      Logger.info('CREATING NFT COLLECTION');
      const { data } = await Axios.post(
        `${tokenConfig.baseURL}/txn/deploy-collection/${collection.title}/${collection.title}/${collection.title}`,
      );
      Logger.info('CREATED NFT COLLECTION');
      return data;
    } catch (error) {
      Logger.error(
        `ERROR CREATING NFT COLLECTION: ${JSON.stringify(
          error?.response?.data,
        )}`,
      );
      if (
        error.response.data.message.code === 'REPLACEMENT_UNDERPRICED'
        || error.response.data.message.code === 'UNPREDICTABLE_GAS_LIMIT'
        || error.response.data.message.code === 'INSUFFICIENT_FUNDS'
      ) {
        const keys = {
          password: '',
          contractName: collection.title,
          collectionName: collection.title,
          collectionSymbol: collection.title,
        };
        await QueueService.increaseGasNewCollection(collection, keys);
      }
      throw error;
    }
  }

  static async createEscrowCollection(collection) {
    try {
      Logger.info('CREATING ESCROW');
      const { data } = await Axios.post(
        `${tokenConfig.baseURL}/txn/create-escrow/${collection.title}`,
      );
      Logger.info('CREATED ESCROW');
      return data;
    } catch (error) {
      Logger.error(
        `ERROR CREATING ESCROW: ${JSON.stringify(error?.response?.data)}`,
      );
      // if (
      //   error.response.data.message.code === 'REPLACEMENT_UNDERPRICED' ||
      //   error.response.data.message.code === 'UNPREDICTABLE_GAS_LIMIT' ||
      //   error.response.data.message.code === 'INSUFFICIENT_FUNDS'
      // ) {
      //   const keys = {
      //     password: '',
      //     contractName: collection.title,
      //     collectionName: collection.title,
      //     collectionSymbol: collection.title
      //   };
      //   await QueueService.increaseGasNewCollection(collection, keys);
      // }
      throw error;
    }
  }

  static async createMintingLimit(limit, index, collection) {
    try {
      Logger.info('CREATING NFT MINTING LIMIT');
      const { data } = await Axios.post(
        `${tokenConfig.baseURL}/txn/set-nft-limit/${limit}/${index}`,
      );
      Logger.info('CREATED NFT MINTING LIMIT');
      return data;
    } catch (error) {
      Logger.error(`ERROR CREATING NFT MINTING LIMIT: ${JSON.stringify(error?.response?.data)}`);
      const keys = {
        password: '',
        limit,
      };
      if (
        error.response.data.message.code === 'REPLACEMENT_UNDERPRICED'
        || error.response.data.message.code === 'UNPREDICTABLE_GAS_LIMIT'
        || error.response.data.message.code === 'INSUFFICIENT_FUNDS'
      ) {
        await QueueService.increaseGasMintingLimit(collection, keys, index);
      }
      throw error;
    }
  }

  static async createNFTApproveToSpend(tokenOwnerPass, operator, tokenId, index) {
    try {
      Logger.info('CREATING NFT APPROVE TO SPEND');
      const { data } = await Axios.post(
        `${tokenConfig.baseURL}/txn/approve-nft/${tokenOwnerPass}/${operator}/${tokenId}/${index}`,
      );
      Logger.info('CREATED NFT APPROVE TO SPEND');
      return data;
    } catch (error) {
      Logger.error(
        `ERROR CREATING NFT APPROVE TO SPEND: ${JSON.stringify(
          error.response.data,
        )}`,
      );
      throw error;
    }
  }

  static async signInSwitchWallet() {
    try {
      Logger.info('Signing in to switch wallet');
      const { data } = await Axios.post(
        `${switchWallet.baseURL}/v1/authlock/login`,
        {
          emailAddress: switchWallet.email,
          password: switchWallet.password,
        },
      );
      const token = data.data;
      const exist = await SwitchToken.findByPk(1);

      if (!exist) await SwitchToken.create({ ...token });
      else await exist.update({ ...token });
      Logger.info('Signed in to switch wallet');
      return data;
    } catch (error) {
      Logger.error(`Create Account Wallet Error: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  static async switchGenerateAddress(body) {
    try {
      const token = await SwitchToken.findByPk(1);
      if (!token || moment().isAfter(token.expires)) {
        await this.signInSwitchWallet();
      }
      Logger.info('Generating wallet address');
      const { data } = await Axios.post(
        `${switchWallet.baseURL}/v1/walletaddress/generate`,
        body,
        {
          headers: {
            Authorization: `Bearer ${token.accessToken}`,
          },
        },
      );
      Logger.info('Generated wallet address');
      return data;
    } catch (error) {
      Logger.error(
        `Error while Generating wallet address: ${JSON.stringify(error)}`,
      );
      throw error;
    }
  }

  static async switchWebhook() {
    return Promise(async (resolve, reject) => {
      try {
        const token = await SwitchToken.findByPk(1);
        if (!token || moment().isAfter(token.expires)) {
          await this.signInSwitchWallet();
        }
        const { data } = await Axios.put(
          `${switchWallet.baseURL}/v1/merchant/webhook`,
          { webhookUrl: '', publicKey: switchWallet.publicKey },
          {
            headers: {
              Authorization: `Bearer ${token.accessToken}`,
            },
          },
        );
        resolve(data);
      } catch (error) {
        Logger.error(`Error Verifying webhook: ${JSON.stringify(error)}`);
        reject(error);
      }
    });
  }

  // static async switchWithdrawal(body) {
  //   try {
  //     const switchToken = await client.get('switch_token');

  //     if (switchToken !== null && switchToken < new Date()) {
  //       const token = await this.signInSwitchWallet();
  //       await client.set('switch_token', token.data.accessToken);
  //     }
  //     Logger.info('Withdrawing from my account');
  //     const { data } = await Axios.post(
  //       `${switchWallet.baseURL}/merchantClientWithdrawal`,
  //       body,
  //       {
  //         headers: {
  //           Authorization: `Bearer ${switchToken}`,
  //         },
  //       },
  //     );
  //     Logger.info('Withdrawal success');
  //     return data;
  //   } catch (error) {
  //     Logger.error(`Error Withdrawing from my account: ${error.response}`);
  //     throw error;
  //   }
  // }

  static async confirmTransaction(hash, bind, message) {
    try {
      Logger.info(`Confirming transaction ${hash}`);
      const data = await provider.getTransactionReceipt(hash);
      if (!data) {
        Logger.info('Transaction yet to be mined');
      } else {
        Logger.info(`Transaction confirmed and mined ${data}`);
      }
      return data;
    } catch (error) {
      Logger.error(`Error confirming transaction: ${error}`);
      const id = setTimeout(async () => {
        await this.requeueMessage(bind, message);
      }, RERUN_QUEUE_AFTER);
      clearTimeout(id);
      throw error;
    }
  }

  static async getNativeBalance(address) {
    try {
      const balance = await provider.getBalance(address);
      const maticBalance = ethers.utils.formatEther(balance);
      return maticBalance;
    } catch (error) {
      Logger.error('Get Native Balance Error', error.response.data);
      return false;
    }
  }

  static async getCollectionAddress(txReceipt) {
    try {
      Logger.info(`Fetching Collection Address: ${txReceipt}`);
      const { topics } = txReceipt.logs[1];
      const { data } = txReceipt.logs[1];
      const log = Interface.parseLog({ data, topics });
      const address = log.args[1];
      Logger.info('Collection Address Found');
      return address;
    } catch (error) {
      Logger.error(`Error Collection Address: ${error}`);
      throw error;
    }
  }

  static async getContractIndex(txReceipt) {
    try {
      Logger.info('Fetching Contract Index');
      const { topics } = txReceipt.logs[1];
      const { data } = txReceipt.logs[1];
      const log = Interface.parseLog({ data, topics });
      const contractIndex = Math.round(
        ethers.utils.formatUnits(log.args[0]) * 10 ** 18,
      );
      Logger.info(`Contract Index Found: ${contractIndex}`);
      return contractIndex;
    } catch (error) {
      Logger.error(`Error Contract Index: ${error}`);
      throw error;
    }
  }

  static async createAccountWallet() {
    try {
      Logger.info('Create Account Wallet Request');
      const { data } = await Axios.post(`${tokenConfig.baseURL}/user/register`);
      Logger.info('Create Account Wallet Response', data);
      return true;
    } catch (error) {
      Logger.error('Create Account Wallet Error', error.response.data);
      return false;
    }
  }

  static async addUser(arg) {
    try {
      const keyPair = await this.setUserKeypair(arg);
      // const {data} = await Axios.post(
      //   `${tokenConfig.baseURL}/user/adduser/${keyPair.address}`
      // );
      Logger.info('User Added');
      return keyPair;
    } catch (error) {
      Logger.error(
        `Adding User Error: ${JSON.stringify(error?.response?.data)}`,
      );

      throw error;
    }
  }

  static async mintNFT(receiver, contractIndex, tokenURI, args) {
    let keys;
    try {
      Logger.info('Minting NFT');
      const { data } = await Axios.post(
        `${tokenConfig.baseURL}/txn/mint-nft/${receiver}/${contractIndex}/${tokenURI}`,
      );
      Logger.info('NFT minted');
      return data;
    } catch (error) {
      Logger.error(
        `Error minting NFT: ${JSON.stringify(error.response.data)}`,
      );
      if (
        error.response.data.message.code === 'REPLACEMENT_UNDERPRICED'
          || error.response.data.message.code === 'UNPREDICTABLE_GAS_LIMIT'
          || error.response.data.message.code === 'INSUFFICIENT_FUNDS'
      ) {
        keys = {
          password: '',
          receiver,
          contractIndex,
          tokenURI,
        };
      }
      await QueueService.increaseGasMintNFT(
        args.collection,
        args.transaction,
        keys,
      );
      throw error;
    }
  }

  static async mintToken(mintTo, amount, message, type) {
    try {
      Logger.info('Minting token');
      const payload = { mintTo, amount };
      const checksum = Encryption.encryptTokenPayload(payload);
      const { data } = await Axios.post(
        `${tokenConfig.baseURL}/txn/mint/${amount}/${mintTo}`,
        null,
        {
          headers: {
            'X-CHECKSUM': checksum,
          },
        },
      );
      Logger.info('Token minted', data);
      return data;
    } catch (error) {
      Logger.error(
        `Error minting token: ${JSON.stringify(error.response.data)}`,
      );
      Logger.info(`Error code: ${error.response.data.message.code}`);

      if (
        error.response.data.message.code === 'REPLACEMENT_UNDERPRICED'
        || error.response.data.message.code === 'UNPREDICTABLE_GAS_LIMIT'
        || error.response.data.message.code === 'INSUFFICIENT_FUNDS'
      ) {
        const keys = {
          password: '',
          address: mintTo,
          amount,
        };
        if (type === 'ngo') {
          await QueueService.increaseGasForMinting(keys, message);
        } else {
          await QueueService.gasFundCampaignWithCrypto(keys, message);
        }
      }
      throw error;
    }
  }

  static async redeem(senderpswd, amount, message, type) {
    const mintTo = senderpswd;
    const payload = { mintTo, amount };
    const checksum = Encryption.encryptTokenPayload(payload);
    try {
      Logger.info('Redeeming token');
      const { data } = await Axios.post(
        `${tokenConfig.baseURL}/txn/redeem/${senderpswd}/${amount}`,
        null,
        {
          headers: {
            'X-CHECKSUM': checksum,
          },
        },
      );
      Logger.info('Success redeeming token');
      return data;
    } catch (error) {
      Logger.error(
        `Error redeeming token: ${JSON.stringify(error.response.data)}`,
      );
      if (
        error.response.data.message.code === 'REPLACEMENT_UNDERPRICED'
        || error.response.data.message.code === 'UNPREDICTABLE_GAS_LIMIT'
        || error.response.data.message.code === 'INSUFFICIENT_FUNDS'
      ) {
        const keys = {
          password: senderpswd,
          amount,
        };
        if (type === 'vendorRedeem') {
          await QueueService.increaseGasFoVWithdrawal(keys, message);
        }
        if (type === 'beneficiaryRedeem') {
          await QueueService.increaseGasFoBRWithdrawal(keys, message);
        }
      }
      throw error;
    }
  }

  static async approveToSpend(
    ownerPassword,
    spenderAdd,
    amount,
    message,
    type,
  ) {
    Logger.info(`Approving to spend: ${ownerPassword} ${spenderAdd} ${amount}`);
    try {
      Logger.info('approving to spend');
      const { data } = await Axios.post(
        `${tokenConfig.baseURL}/txn/approve/${ownerPassword}/${spenderAdd}/${amount}`,
      );
      Logger.info('Approved to spend');
      return data;
    } catch (error) {
      Logger.error(
        `Error approving to spend: ${JSON.stringify(error.response.data)}`,
      );

      if (
        error.response.data.message.code === 'REPLACEMENT_UNDERPRICED'
        || error.response.data.message.code === 'UNPREDICTABLE_GAS_LIMIT'
        || error.response.data.message.code === 'INSUFFICIENT_FUNDS'
      ) {
        const keys = {
          ownerPassword,
          spenderAdd,
          amount,
        };
        if (type === 'single') {
          await QueueService.increaseGasFeeForSB(keys, message);
        }
        if (type === 'multiple') {
          await QueueService.increaseAllowance(keys, message);
        }
        if (type === 'refundbeneficiary') {
          await QueueService.increaseGasForRefund(keys, message);
        }
      }
      throw error;
    }
  }

  static async disApproveToSpend(ownerPassword, spenderAdd, amount) {
    try {
      Logger.info('disapproving to spend');
      const res = await Axios.post(
        `${tokenConfig.baseURL}/txn/disapprove/${ownerPassword}/${spenderAdd}/${amount}`,
      );
      Logger.info('Disapproved to spend');
      return res;
    } catch (error) {
      Logger.error(
        `Error disapproving to spend: ${JSON.stringify(error.response.data)}`,
      );
      throw error;
    }
  }

  static async transferTo(senderPass, receiverAdd, amount, message, type) {
    try {
      const { data } = await Axios.post(
        `${tokenConfig.baseURL}/txn/transfer/${senderPass}/${receiverAdd}/${amount}`,
      );
      Logger.info('Transferred to campaign wallet');
      return data;
    } catch (error) {
      Logger.error(
        `Error transferring to campaign wallet: ${JSON.stringify(
          error.response.data,
        )}`,
      );
      if (
        error.response.data.message.code === 'REPLACEMENT_UNDERPRICED'
        || error.response.data.message.code === 'UNPREDICTABLE_GAS_LIMIT'
        || error.response.data.message.code === 'INSUFFICIENT_FUNDS'
      ) {
        const keys = {
          password: senderPass,
          receiverAdd,
          amount: amount.toString(),
        };
        if (type === 'fundCampaign') {
          await QueueService.increaseTransferCampaignGas(keys, message);
        }
        if (type === 'PBFundB') {
          await QueueService.increaseTransferPersonalBeneficiaryGas(
            keys,
            message,
          );
        }
        if (type === 'withHoldFunds') {
          await QueueService.increaseGasWithHoldFunds(keys, message);
        }
      }
      throw error;
    }
  }

  static async transferFrom(
    tokenownerAdd,
    receiver,
    spenderPass,
    amount,
    message,
    type,
  ) {
    try {
      Logger.info('Transferring funds from..');
      const { data } = await Axios.post(
        `${tokenConfig.baseURL}/txn/transferfrom/${tokenownerAdd}/${receiver}/${spenderPass}/${amount}`,
      );
      Logger.info('Success transferring funds from');
      return data;
    } catch (error) {
      Logger.info(
        `Error transferring funds from:  ${JSON.stringify(
          error.response.data,
        )}`,
      );

      if (
        error.response.data.message.code === 'REPLACEMENT_UNDERPRICED'
        || error.response.data.message.code === 'UNPREDICTABLE_GAS_LIMIT'
        || error.response.data.message.code === 'INSUFFICIENT_FUNDS'
      ) {
        const keys = {
          password: spenderPass,
          tokenownerAdd,
          receiverAdd: receiver,
          amount: amount.toString(),
        };
        if (type === 'BFundB') {
          await QueueService.increaseTransferBeneficiaryGas(keys, message);
        }
        if (type === 'BWithdrawal') {
          await QueueService.increaseGasForBWithdrawal(keys, message);
        }
        if (type === 'vendorOrder') {
          await QueueService.increaseGasFeeVTransferFrom(keys, message);
        }
      }
      throw error;
    }
  }

  static async allowance(tokenOwner, spenderAddr) {
    try {
      const { data } = await Axios.get(
        `${tokenConfig.baseURL}/account/allowance/${tokenOwner}/${spenderAddr}`,
      );
      return data;
    } catch (error) {
      if (
        error.response.data.message.code === 'REPLACEMENT_UNDERPRICED'
        || error.response.data.message.code === 'UNPREDICTABLE_GAS_LIMIT'
        || error.response.data.message.code === 'INSUFFICIENT_FUNDS'
      ) {
        await this.reRunContract('token', 'allowance', {
          tokenOwner,
          spenderAddr,
        });
      }
      throw error;
    }
  }

  static async nftBalance() {
    const { data } = await Axios.get(
      `${tokenConfig.baseURL}/account/nft-balance/16/0x6E8EeAe86934Ed319a666B65eB338319a2F67893`,
    );
    return data;
  }

  static async balance(address) {
    try {
      const { data } = await Axios.get(
        `${tokenConfig.baseURL}/account/balance/${address}`,
      );
      return data;
    } catch (error) {
      if (
        error.response.data.message.code === 'REPLACEMENT_UNDERPRICED'
        || error.response.data.message.code === 'UNPREDICTABLE_GAS_LIMIT'
        || error.response.data.message.code === 'INSUFFICIENT_FUNDS'
      ) {
        await this.reRunContract('token', 'balance', { address });
      }
      throw error;
    }
  }

  static async createNewBSCAccount({ mnemonicString, userSalt }) {
    const { Wallet } = ethers;
    const hash = sha256.sync(mnemonicString);
    const salt = userSalt;
    const buffer = crypto.scryptSync(hash, salt, 32, {
      N: 2 ** 14,
      r: 8,
      p: 1,
    });

    const generatedKeyPair = new Wallet(buffer);
    // const generatedKeyPair = await createPassenger(buffer)
    return generatedKeyPair;
  }

  static async setUserKeypair(id) {
    let pair = {};
    // TODO: Rebuild user public and private key after
    // retrieving mnemonic key and return account keypair
    try {
      let mnemonic = await AwsUploadService.getMnemonic();
      mnemonic = JSON.parse(mnemonic);

      pair = await this.createNewBSCAccount({
        mnemonicString: mnemonic.toString(),
        userSalt: id,
      });
      return pair;
    } catch (error) {
      Logger.error(`Error Creating Wallet Address: ${error} `);
    }
    return null;
  }

  static async getTransactionDetails(hash, bind, message) {
    try {
      Logger.info(`Confirming transaction ${hash}`);
      const data = await provider.getTransactionReceipt(hash);
      if (!data) {
        Logger.info('Transaction yet to be mined');
      } else {
        Logger.info(`Transaction confirmed and mined ${data}`);
      }
      return data;
    } catch (error) {
      Logger.error(`Error confirming transaction: ${error}`);
      const id = setTimeout(async () => {
        await this.requeueMessage(bind, message);
      }, RERUN_QUEUE_AFTER);
      clearTimeout(id);
      throw error;
    }
  }
}

// async function fuc() {
//   return await BlockchainService.reRunContract('token', 'increaseAllowance', {
//     password:
//       '0x0652bc7b3bc3d9dddba36b2ff0173a6dbcfd5b2cba15e14efa96c2b24700df83',
//     spenderPswd: '0x4F76b88a2A1579976FCb7636544e290A2CFec956',
//     amount: '20'
//   });
// }
// fuc().then(r => {
//   console.log(r);
// });
module.exports = BlockchainService;

require('dotenv').config({ path: '../.env' });

const fs = require('fs');
const HDWalletProvider = require('truffle-hdwallet-provider');
const Web3 = require('web3');
const compiledFactory = require('./build/CampaignFactory.json');


const provider = new HDWalletProvider(
  process.env.ACCT_MN,
  process.env.RINKEBY_URL
);

const web3 = new Web3(provider);
const logFile = '../deploy-log.txt';


const deploy = async (accountNumber = 0) => {
  const accounts = await web3.eth.getAccounts();
  const deployAccount = accounts[accountNumber];
  const data = '0x' + compiledFactory.bytecode;
  const gas = 3000000;
  const gasPrice = web3.utils.toWei('2', 'gwei');

  console.log('attempting to deploy from account', deployAccount);

  const result = await new web3.eth.Contract(JSON.parse(compiledFactory.interface))
    .deploy({ data })
    .send({ gas, gasPrice , from: deployAccount });

  fs.appendFile(
    logFile,
    `Contract address: ${result.options.address}${'\n'}`,
    (err) => {
      if (err) throw err;
      console.log('Write to log success.', result.options.address);
    }
  );
};
deploy();

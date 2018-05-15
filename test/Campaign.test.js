const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const compiledFactory = require('../ethereum/build/CampaignFactory.json');
const compiledCampaign = require('../ethereum/build/Campaign.json');


const provider = ganache.provider();
const web3 = new Web3(provider);


let accounts = [];
let factory = {};
let campaignAddress = '';
let campaign = {};
let manager = '';

const gas = '3000000';
const minimumContribution = '1000'; 


beforeEach(async () => {
  accounts = await web3.eth.getAccounts();
  manager = accounts[0];
  factory = await new web3.eth.Contract(JSON.parse(compiledFactory.interface))
    .deploy({ data: '0x' + compiledFactory.bytecode })
    .send({ gas, from: manager });
  
  await factory.methods.createCampaign(minimumContribution)
    .send({ gas, from: manager });

  [campaignAddress] = await factory.methods.getDeployedCampaigns().call();
  campaign = await new web3.eth.Contract(
    JSON.parse(compiledCampaign.interface),
    campaignAddress
  );
});


describe('Campaigns', () => {
  it('deploys a factory and a campaign', () => {
    assert.ok(factory.options.address);
    assert.ok(campaign.options.address);
  });


  it('stores caller as campaign manager', async () => {
    const campaignManager = await campaign.methods.manager().call();
    assert.equal(manager, campaignManager);
  });


  it('allows people to contribute money and stores them as approvers', async () => {
    const approver = accounts[1];
    
    await campaign.methods.contribute().send({
      from: approver,
      value: minimumContribution
    });

    const isApprover = await campaign.methods.approvers(approver).call();

    assert.ok(isApprover);
  });


  it('requires a minimum contribution', async () => {
    const contributor = accounts[1];
    const value = (+minimumContribution - 1).toString();
    
    try {
      await campaign.methods.contribute().send({ value, from: contributor });
      assert(false, 'allowed less than minimumContribution');
    } catch(err) {
      assert.ok(err);
    }
  });


  it('allows manager to createRequest', async () => {
    const description = 'Buy something';
    const value = '100';
    const recipient = accounts[1];

    await campaign.methods
      .createRequest(description, value, recipient)
      .send({ gas, from: manager });

    const request = await campaign.methods.requests(0).call();

    assert.equal(description, request.description);
  });


  it('processes request', async () => {
    const contractTotal = web3.utils.toWei('10', 'ether');
    const contribution = web3.utils.toWei('5', 'ether');
    const testMargin = web3.utils.toWei('1', 'ether');
    const description = 'Test request';
    const recipient = accounts[1];
    const recipientBalance = await web3.eth.getBalance(recipient);

    await campaign.methods.contribute().send({
      from: manager,
      value: contractTotal
    });

    await campaign.methods
      .createRequest(description, contribution, recipient)
      .send({ gas, from: manager });

    await campaign.methods.approveRequest(0).send({ gas, from: manager });
    await campaign.methods.finalizeRequest(0).send({ gas, from: manager });

    let newBalance = await web3.eth.getBalance(recipient);
    newBalance = parseFloat(newBalance);
    
    assert.ok(newBalance > (+recipientBalance + +contribution - testMargin));
  });
});

// Load dependencies
const { expect } = require('chai');
// Import utilities from Test Helpers
const { BN, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
// Load compiled artifacts
const MultiSigWallet = artifacts.require('MultiSigWallet'); //artifacts.require is provided by truffle!
contract("MultiSigWallet", (accounts) =>{
	const owners= [accounts[0],accounts[1],accounts[2]];
	const Num_Confirmations_Required=2;

	let wallet;
	beforeEach(async () =>{
		// Deploy a new MultiSigWallet contract instance before each test case.
		wallet= await MultiSigWallet.new(owners,Num_Confirmations_Required);
	});
	describe("fallback", async () => {
	    it("should receive ether", async () => {
	      const receipt= await wallet.sendTransaction({from: accounts[0],value:1});
	      expectEvent(receipt, 'Deposit',{ to: accounts[0],amount:"1"});

	    });
	});

	describe("submitTransaction", () => {
	    const to = accounts[9];
	    const value = new BN('1');	
	    const data = "0x00";

	    it("should submit tx", async () => {
		  const receipt= await wallet.submitTx(to, value, data, {from: owners[0]});
		  //checking the event submitted or not with respective logs
	      expectEvent(receipt, 'Submit',{owner:owners[0],value:value,data:data,txIndex:"0"});
	      // assert.equal(logs[0].event, "Submit");
	      // assert.equal(logs[0].args.owner, owners[0]);
	      // assert.equal(logs[0].args.txIndex, 0);
	      // assert.equal(logs[0].args.to, to);
	      // assert.equal(logs[0].args.value, value);
	      // assert.equal(logs[0].args.data, data);

	      assert.equal(await wallet.getTransactionCount(),1);
		  const tx = await wallet.getTransaction(0);
	      assert.equal(tx.to, to);
	      expect(await tx.value).to.be.bignumber.equal(value);
	      assert.equal(tx.data, data);
	      assert.equal(tx.numConfirmations,0);
	      assert.equal(tx.executed, false);
	    });

	    it("should reject if not owner", async () => {
      		await expectRevert(wallet.submitTx(to, value, data, {from: accounts[3]}),"not owner");
    	});
    });

	describe("confirmTransaction", () => {
	    beforeEach(async () => {
	      const to = accounts[3];
	      const value = 0;
	      const data = "0x00";

	      await wallet.submitTx(to, value, data);
	    });

	    it("should confirm tx", async () => {
	      const receipt = await wallet.confirmTx(0, {from: owners[0]});
	      expectEvent(receipt, 'Confirm',{owner:owners[0],txIndex:"0"});

	      // assert.equal(logs[0].event, "Confirm")
	      // assert.equal(logs[0].args.owner, owners[0])
	      // assert.equal(logs[0].args.txIndex, 0)

	      const tx = await wallet.getTransaction(0);
	      assert.equal(tx.numConfirmations, 1);
	    });

	    it("should reject if not owner", async () => {
	      await expectRevert(wallet.confirmTx(0, {from: accounts[3]}),"not owner");
	    });

	    it("should reject if tx does not exist", async () => {
	      await expectRevert(wallet.confirmTx(1, { from: owners[0]}),"tx doesn't exist");
	    });

	    it("should reject if already confirmed", async () => {
		  await wallet.confirmTx(0, {from: owners[0]});

	      await expectRevert(wallet.confirmTx(0, { from: owners[0]}),"tx already confirmed");

	    });
  	});

	describe("executeTransaction", () => {
	    beforeEach(async () => {
	      	const to = owners[0];
	      	const value = 0;
	      	const data = "0x00";

	      	await wallet.submitTx(to, value, data);
	      	await wallet.confirmTx(0, { from: owners[0] });
	      	await wallet.confirmTx(0, { from: owners[1] });
    	});

    	//execute tx should succeed
		it("should execute", async () =>{
			const receipt = await wallet.executeTx(0, {from: owners[0]});
			//checking the event executed or not with respective logs
			expectEvent(receipt, 'Execute', {owner:owners[0],txIndex:"0"});
			 
			// assert.equal(logs[0].event, "Execute");
			// assert.equal(logs[0].args.owner, owners[0]);
			// assert.equal(logs[0].args.txIndex, 0);

			const tx= await wallet.getTransaction(0);
			assert.equal(tx.executed, true);

		});
		//execute tx should fail if already executed 
		it("should reject if already executed", async () => {
	      	await wallet.executeTx(0, { from: owners[0] });
	      	// try {
	        // 	//again calling executeTx 
	        // 	await wallet.executeTx(0, { from: owners[0] });
	        // 	throw new Error("tx did not fail");
	        // }	catch (error) {
	        //   	assert.equal(error.reason, "tx already executed"); // "error.reason" came here from MultisigWallet.sol
	        // }

	        //alternate way without try & catch
	        await expectRevert(wallet.executeTx(0, { from: owners[0]}),"tx already executed");
	    });
	    it("should reject if not owner", async () => {
      		await expectRevert(wallet.executeTx(0, { from: accounts[3]}),"not owner");
    	}); 
		it("should reject if tx does not exist", async () => {
      		await expectRevert(wallet.executeTx(1, { from: owners[0]}),"tx doesn't exist");
    	});
	});
});

// SPDX-License-Identifier: MIT
pragma solidity ^0.5.16;

contract MultiSigWallet {
    
    //Events
    event Submit(address indexed owner, uint indexed txIndex, address indexed to, uint value, bytes data);
    event Confirm(address indexed owner, uint indexed txIndex);
    event Execute(address indexed owner, uint indexed txIndex);
    event Revoke(address indexed owner, uint indexed txIndex);
    event Deposit(address indexed to, uint amount, uint balance);
    
    //Storage
    
    address[] public owners;
    mapping(address=>bool) public isOwner;
    uint public numConfirmationsRequired;
    
    
    struct Transaction{
        address to;
        uint value;
        bytes data;
        bool executed;
        mapping(address=>bool) isConfirmed;
        uint numConfirmations;
    }
    Transaction[] public transactions;
    
    //Modifiers
    
    modifier onlyowner(){
        require(isOwner[msg.sender],"not owner");
        _;

    } 
    modifier txExists(uint _txIndex){
        require(_txIndex < transactions.length,"tx doesn't exist");
        _;
    }
    modifier notExecuted(uint _txIndex){
        require(!transactions[_txIndex].executed,"tx already executed");
        _;
    }
    modifier notConfirmed(uint _txIndex){
        require(!transactions[_txIndex].isConfirmed[msg.sender],"tx already confirmed");
        _;
    }
    
    
    //Public functions
    constructor(address[] memory _owners, uint _numConfirmationsRequired) public{
        require(_owners.length > 0,"owners required");
        require(_numConfirmationsRequired > 0 && _numConfirmationsRequired <= _owners.length,"invalid required confirmations");
        
        for(uint i=0; i<_owners.length; i++){
            address owner=_owners[i];
            require(owner!=address(0),"invalid owner");
            require(!isOwner[owner],"owner not unique");
            isOwner[owner]=true;
            owners.push(owner);
        }
        numConfirmationsRequired=_numConfirmationsRequired;
    }
    function() payable external{
        emit Deposit(msg.sender,msg.value,address(this).balance);
    }
    function submitTx(address _to, uint _value, bytes memory _data) public onlyowner {
        uint txIndex= transactions.length;
        transactions.push(Transaction({
            to: _to,
            value:_value,
            data:_data,
            executed:false,
            numConfirmations:0
            
        }));
        emit Submit(msg.sender,txIndex,_to,_value,_data);
        
    }
    function confirmTx(uint _txIndex)
        public 
        onlyowner 
        txExists(_txIndex) 
        notExecuted(_txIndex)
        notConfirmed(_txIndex)
        {   
            Transaction storage transaction=transactions[_txIndex];
            transaction.isConfirmed[msg.sender]=true;
            transaction.numConfirmations+=1;
            
            emit Confirm(msg.sender,_txIndex);
    }
    function executeTx(uint _txIndex)
        public
        onlyowner
        txExists(_txIndex)  
        notExecuted(_txIndex)
        {
            Transaction storage transaction=transactions[_txIndex];
            require(transaction.numConfirmations>=numConfirmationsRequired,"can't execute tx");
            transaction.executed=true;
            (bool success,)=transaction.to.call.value(transaction.value)(transaction.data);
            require(success,"tx failed");
            
            emit Execute(msg.sender,_txIndex);
    }
    function revokeConfirmation(uint _txIndex)
        public
        onlyowner 
        txExists(_txIndex) 
        notExecuted(_txIndex)
        {
            Transaction storage transaction=transactions[_txIndex];
            require(transaction.isConfirmed[msg.sender], "tx not confirmed");
            transaction.isConfirmed[msg.sender] = false;
            transaction.numConfirmations -= 1;
        
            emit Revoke(msg.sender, _txIndex);
    }

    function getTransaction(uint _txIndex)
        public
        view
        returns (address to, uint value, bytes memory data, bool executed, uint numConfirmations)
        {
        Transaction storage transaction = transactions[_txIndex];

        return (
            transaction.to,
            transaction.value,
            transaction.data,
            transaction.executed,
            transaction.numConfirmations
        );
    }
    function getTransactionCount() public view returns (uint) {
        return transactions.length;
    }

}
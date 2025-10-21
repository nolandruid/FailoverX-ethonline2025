// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SimpleHello {
    string public message;
    
    constructor() {
        message = "Hello, Hedera!";
    }
    
    function getMessage() public view returns (string memory) {
        return message;
    }
    
    function setMessage(string memory _newMessage) public {
        message = _newMessage;
    }
}

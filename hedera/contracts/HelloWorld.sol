// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract HelloWorld {
    string private message;
    address public owner;
    uint256 public messageCount;
    
    event MessageUpdated(string newMessage, address updatedBy, uint256 timestamp);
    
    constructor() {
        owner = msg.sender;
        message = "Hello, Hedera World!";
        messageCount = 0;
    }
    
    function getMessage() public view returns (string memory) {
        return message;
    }
    
    function setMessage(string memory _newMessage) public {
        require(bytes(_newMessage).length > 0, "Message cannot be empty");
        message = _newMessage;
        messageCount++;
        emit MessageUpdated(_newMessage, msg.sender, block.timestamp);
    }
    
    function getMessageInfo() public view returns (string memory, address, uint256) {
        return (message, owner, messageCount);
    }
    
    function greet(string memory _name) public pure returns (string memory) {
        return string(abi.encodePacked("Hello, ", _name, "! Welcome to Hedera!"));
    }
}

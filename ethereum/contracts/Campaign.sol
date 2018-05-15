pragma solidity ^0.4.23;


contract CampaignFactory {
    address[] public deployedCampaigns;
    
    function createCampaign(uint minimum) public {
        address newCampaign = new Campaign(minimum, msg.sender);
        deployedCampaigns.push(newCampaign);
    }
    
    function getDeployedCampaigns() public view returns (address[]) {
        return deployedCampaigns;
    }
}


contract Campaign {
    struct Request {
        string description;
        uint value;
        address recipient;
        uint64 approvalCount;
        bool complete;
        mapping(address => bool) approvals;
    }
    
    Request[] public requests;
    address public manager;
    uint public minimumContribution;
    uint64 public approversCount;
    mapping(address => bool) public approvers;
    
    constructor(uint minimum, address creator) public {
        manager = creator;
        minimumContribution = minimum;
    }
    
    modifier restricted() {
        require(msg.sender == manager);
        _;
    }
    
    function contribute() public payable {
        require(msg.value >= minimumContribution);
        
        approvers[msg.sender] = true;
    }
    
    function createRequest(
        string description,
        uint value,
        address recipient
    ) public restricted {
        Request memory newRequest = Request({
            description: description,
            value: value,
            recipient: recipient,
            approvalCount: 0,
            complete: false
        });
        
        requests.push(newRequest);
    }
    
    function approveRequest(uint64 index) public {
        Request storage currentRequest = requests[index];
        
        require(approvers[msg.sender]);
        require(!currentRequest.approvals[msg.sender]);
        
        currentRequest.approvals[msg.sender] = true;
        currentRequest.approvalCount++;
    }
    
    function finalizeRequest(uint64 index) public restricted {
        Request storage currentRequest = requests[index];
        
        require(!currentRequest.complete);
        require(currentRequest.approvalCount > (approversCount / 2));
        
        currentRequest.complete = true;
        currentRequest.recipient.transfer(currentRequest.value);
    }
}

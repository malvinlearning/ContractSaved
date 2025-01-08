pragma solidity ^0.5.9;

contract Crowdfunding {
    address public owner;
    uint public campaignFee = 0.02 ether;
    uint public platformFees;

    bool public isDestroyed = false; // State to determine if the contract is active or destroyed

    // Structure to store details of a campaign
    struct Campaign{    
        uint campaignId;
        address payable entrepreneur; //Creator of a campaign
        string titles;
        uint pledgeCost;
        uint pledgesNeeded;
        uint pledgesCount;
        bool fulfilled;  // Whether the campaign is completed
        bool cancelled; // Whether the campaign is cancelled
        address[] backers; //Those you have invested
        mapping(address => uint256) shares;
        mapping(address => uint) investments;
        address[] investors; // List of investors for this campaign
    }

    uint private campaignCount = 0;
    mapping(uint => Campaign) public campaigns;
    mapping(address => bool) private bannedEntrepreneurs; // Changed from public to private
    mapping(uint => bool) private feesCollected;  // Track whether platform fees are collected for each campaign
    address[] public bannedEntrepreneursList; // Changed from public to private
    uint256 public campaignCounter;

    event CampaignCreated(uint campaignId, address entrepreneur, string title);
    event InvestmentMade(uint campaignId, address investor, uint amount);
    event CampaignCancelled(uint campaignId);
    event CampaignCompleted(uint campaignId, address entrepreneur);
    event InvestorRefunded(address investor, uint amount);
    event EntrepreneurBanned(address entrepreneur);
    event CollectPlatformEarnings(address owner);
    event DestroyContract(address owner);

    // Modifier to check if the contract is active
    modifier contractActive() {
        require(!isDestroyed, "Contract has been destroyed");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    modifier notOwner() {
        require(msg.sender != owner, "Owner can't create a campaign");
        _;
    }

    modifier onlyEntrepreneur(uint campaignId) {
        require(msg.sender == campaigns[campaignId].entrepreneur, "Not campaign owner");
        _;
    }

    modifier notBanned() {
        require(!bannedEntrepreneurs[msg.sender], "Banned entrepreneur");
        _;
    }

    modifier correctFee() {
        require(msg.value == campaignFee, "Incorrect campaign fee");
        _;
    }

    modifier campaignExists(uint campaignId) {
        require(campaignId > 0 && campaignId <= campaignCount, "Campaign does not exist");
        _;
    }

    modifier campaignNotFulfilled(uint campaignId) {
        require(!campaigns[campaignId].fulfilled, "Campaign fulfilled");
        _;
    }

    modifier campaignNotCancelled(uint campaignId) {
        require(!campaigns[campaignId].cancelled, "Campaign already cancelled");
        _;
    }

    modifier campaignCancelled(uint campaignId) {
        require(campaigns[campaignId].cancelled, "Campaign not cancelled");
        _;
    }

    modifier hasInvestment(uint campaignId) {
        require(campaigns[campaignId].investments[msg.sender] > 0, "No investment to refund");
        _;
    }

    modifier isPledgeValid(uint campaignId, uint shares) {
        Campaign storage campaign = campaigns[campaignId];
        require(msg.value == shares * campaign.pledgeCost, "Incorrect pledge amount");
        _;
    }

    modifier canCompleteCampaign(uint campaignId) {
        Campaign storage campaign = campaigns[campaignId];
        require(!campaign.cancelled, "Campaign cancelled");
        require(!campaign.fulfilled, "Campaign already completed");
        require(campaign.pledgesCount >= campaign.pledgesNeeded, "Pledges not fully met");
        _;
    }

    modifier noPlatformFees() {
        require(platformFees == 0, "Withdraw fees first");
        _;
    }

    modifier onlyAuthorized(uint campaignId) {
        require(
            msg.sender == owner || msg.sender == campaigns[campaignId].entrepreneur,
            "Not authorized"
        );
        _;
    }

    modifier alreadyBanned(address _entrepreneur) {
        require(!bannedEntrepreneurs[_entrepreneur], "Already banned");
        _;
    }


    constructor() public {
        owner = msg.sender;
    }

    // Function to create a campaign
    function createCampaign ( string memory _title, uint _pledgeCost, uint _pledgesNeeded) 
        public payable notBanned correctFee contractActive notOwner{
        campaignCount++;
        Campaign storage newCampaign = campaigns[campaignCount];
        newCampaign.campaignId = campaignCount;
        newCampaign.entrepreneur = msg.sender;
        newCampaign.titles = _title;
        newCampaign.pledgeCost = _pledgeCost;
        newCampaign.pledgesNeeded = _pledgesNeeded;

        platformFees += msg.value;

        emit CampaignCreated(campaignCount, msg.sender, _title);
    }

    // Function for backers to contribute to a campaign
    function contributeToCampaign(uint campaignId, uint shares) public payable campaignExists(campaignId) campaignNotFulfilled(campaignId)
        campaignNotCancelled(campaignId) isPledgeValid(campaignId, shares) contractActive
    {
        Campaign storage campaign = campaigns[campaignId];

        if (campaign.investments[msg.sender] == 0) {
            campaign.backers.push(msg.sender); // Add new backer
        }

        campaign.pledgesCount += shares;
        campaign.shares[msg.sender] += shares;
        campaign.investments[msg.sender] += shares;

        // Add the investor to the list if not already added
        bool alreadyInvestor = false;
        for (uint256 i = 0; i < campaign.investors.length; i++) {
            if (campaign.investors[i] == msg.sender) {
                alreadyInvestor = true;
                break;
            }
        }
        if (!alreadyInvestor) {
            campaign.investors.push(msg.sender);
        }

        emit InvestmentMade(campaignId, msg.sender, msg.value);
    }

    function getShares(uint256 campaignId, address _investor) external view returns (uint256) {
        return campaigns[campaignId].shares[_investor];
    }

    // Function to get investors of a campaign
    function getInvestors(uint256 campaignId) external view returns (address[] memory) {
        Campaign storage campaign = campaigns[campaignId];
        uint backerCount = campaign.backers.length; // Number of backers

        address[] memory investors = new address[](backerCount); // Array to store backer addresses
        uint[] memory shares = new uint[](backerCount); // Array to store corresponding shares

        // Iterate through backers to populate the arrays
        for (uint i = 0; i < backerCount; i++) {
            address backer = campaign.backers[i];
            investors[i] = backer; // Store backer's address
            shares[i] = campaign.investments[backer]; // Store backer's shares
        }
        return campaigns[campaignId].investors;
    }

    function cancelCampaign(uint campaignId) public campaignExists(campaignId) campaignNotFulfilled(campaignId) onlyAuthorized(campaignId)
        campaignNotCancelled(campaignId) contractActive
    {
        Campaign storage campaign = campaigns[campaignId];
        campaign.cancelled = true; // Mark campaign as cancelled

        emit CampaignCancelled(campaignId);
    }

    // Refund investor's contributions from all campaigns they invested in
    function refundAllInvestments() public {
        uint totalRefund = 0;

        // Iterate through all campaigns
        for (uint i = 1; i <= campaignCount; i++) {
            Campaign storage campaign = campaigns[i];

            // Skip campaigns that are not cancelled or don't have an investment from the investor
            if (!campaign.cancelled || campaign.investments[msg.sender] == 0) continue;

            // Calculate the refund amount for this campaign
            uint investment = campaign.investments[msg.sender];
            totalRefund += investment * campaign.pledgeCost;

            // Reset the investor's investment in this campaign
            campaign.shares[msg.sender] = 0; // Reset shares to 0
            campaign.investments[msg.sender] = 0; // Reset investment to 0

            emit InvestorRefunded(msg.sender, investment * campaign.pledgeCost);
        }

        require(totalRefund > 0, "No refundable investments");

        // Transfer the total refund amount to the investor
        msg.sender.transfer(totalRefund);
    }

    // Complete a campaign and distribute funds
    function completeCampaign(uint campaignId)
        public
        campaignExists(campaignId)
        canCompleteCampaign(campaignId)
        onlyAuthorized(campaignId)
        contractActive
    {
        Campaign storage campaign = campaigns[campaignId];

        uint amountToEntrepreneur = (campaign.pledgesCount * campaign.pledgeCost * 80) / 100; // 80% to entrepreneur
        uint platformEarnings = (campaign.pledgesCount * campaign.pledgeCost * 20) / 100; // 20% to platform

        platformFees += platformEarnings;
        campaign.fulfilled = true;

        campaign.entrepreneur.transfer(amountToEntrepreneur); // Transfer funds to entrepreneur

        emit CampaignCompleted(campaignId, campaign.entrepreneur);
    }

    // Destroy the contract after clearing platform fees
    function destroyContract() public onlyOwner contractActive noPlatformFees{
        isDestroyed = true; //Mark the contract as destroyed

        for (uint i = 1; i <= campaignCount; i++) {
            if (campaigns[i].fulfilled == true) continue;
            campaigns[i].cancelled = true; // Cancel all active campaigns
        }

        emit DestroyContract(owner);

        if (address(this).balance == 0) {
            selfdestruct(msg.sender); // Destroy contract
        }
    }

    function banEntrepreneur(address _entrepreneur) public onlyOwner contractActive alreadyBanned(_entrepreneur) {
        bannedEntrepreneurs[_entrepreneur] = true; // Mark entrepreneur as banned
        bannedEntrepreneursList.push(_entrepreneur);

        // Cancel all campaigns created by the banned entrepreneur
        for (uint i = 1; i <= campaignCount; i++) {
            Campaign storage campaign = campaigns[i];
            if (campaign.entrepreneur == _entrepreneur && !campaign.fulfilled && !campaign.cancelled) {
                campaign.cancelled = true; // Mark the campaign as cancelled
                emit CampaignCancelled(campaign.campaignId); // Emit cancellation event
            }
        }

        emit EntrepreneurBanned(_entrepreneur);
    }
    //Get the list with the banned entreprenuers
    function getBannedEntrepreneurs() public view returns (address[] memory) {
        return bannedEntrepreneursList;
    }

    // Function to collect platform earnings from all campaigns
    function collectPlatformEarnings() public onlyOwner contractActive {
        uint totalEarnings = platformFees; // Start with accumulated platform fees

        // Iterate through all campaigns
        for (uint i = 1; i <= campaignCount; i++) {
            Campaign storage campaign = campaigns[i];

            // Skip campaigns that have already had their fees collected or are not fulfilled
            if (feesCollected[i] || !campaign.fulfilled) continue;

            // Mark the campaign's fees as collected
            feesCollected[i] = true;
        }

        require(totalEarnings > 0, "No funds to collect"); // Ensure there are funds to collect

        platformFees = 0; // Reset platform fees to avoid double withdrawals
        msg.sender.transfer(totalEarnings); // Transfer total earnings to the owner
        emit CollectPlatformEarnings(owner);
    }

    function changeOwner(address _newOwner) public onlyOwner contractActive {
        owner = _newOwner; // Assign new owner
    }

    function getContractBalance() public view returns (uint) {
        return address(this).balance; // Returns the balance of the contract
    }

    // Get a list of active campaigns (not fulfilled or cancelled)
    function getActiveCampaigns() public view returns (uint[] memory ids, address[] memory entrepreneurs,
        uint[] memory pledgeCosts,uint[] memory pledgesNeeded, uint[] memory pledgesCounts) {
        uint count = 0;

        // First, count how many active campaigns there are
        for (uint i = 1; i <= campaignCount; i++) {
            if (!campaigns[i].fulfilled && !campaigns[i].cancelled) {
                count++;
            }
        }

        // Create arrays to hold active campaign data
        ids = new uint[](count);
        entrepreneurs = new address[](count);
        pledgeCosts = new uint[](count);
        pledgesNeeded = new uint[](count);
        pledgesCounts = new uint[](count);

        uint index = 0;

        // Populate the arrays with data from completed campaigns
        for (uint i = 1; i <= campaignCount; i++) {
            if (!campaigns[i].fulfilled && !campaigns[i].cancelled) {
                Campaign storage campaign = campaigns[i];
                ids[index] = campaign.campaignId;
                entrepreneurs[index] = campaign.entrepreneur;
                pledgeCosts[index] = campaign.pledgeCost;
                pledgesNeeded[index] = campaign.pledgesNeeded;
                pledgesCounts[index] = campaign.pledgesCount;
                index++;
            }
        }

        return (ids, entrepreneurs, pledgeCosts, pledgesNeeded, pledgesCounts);
    }

        // Get a list of completed campaigns (fulfilled but not cancelled)
    function getCompletedCampaigns() public view returns (uint[] memory ids, address[] memory entrepreneurs, uint[] memory pledgeCosts,uint[] memory pledgesNeeded, uint[] memory pledgesCounts,
        bool[] memory fulfilled
        ) {
        uint count = 0;

        // First, count how many completed campaigns there are
        for (uint i = 1; i <= campaignCount; i++) {
            if (campaigns[i].fulfilled && !campaigns[i].cancelled) {
                count++;
            }
        }

        // Create arrays to hold completed campaign data
        ids = new uint[](count);
        entrepreneurs = new address[](count);
        pledgeCosts = new uint[](count);
        pledgesNeeded = new uint[](count);
        pledgesCounts = new uint[](count);
        fulfilled = new bool[](count);

        uint index = 0;

        // Populate the arrays with data from completed campaigns
        for (uint i = 1; i <= campaignCount; i++) {
            if (campaigns[i].fulfilled && !campaigns[i].cancelled) {
                Campaign storage campaign = campaigns[i];
                ids[index] = campaign.campaignId;
                entrepreneurs[index] = campaign.entrepreneur;
                pledgeCosts[index] = campaign.pledgeCost;
                pledgesNeeded[index] = campaign.pledgesNeeded;
                pledgesCounts[index] = campaign.pledgesCount;
                fulfilled[index] = campaign.fulfilled;
                index++;
            }
        }

        return (ids, entrepreneurs, pledgeCosts, pledgesNeeded, pledgesCounts, fulfilled);
    }

    // Get a list of cancelled campaigns
    function getCancelledCampaigns() public view returns (uint[] memory ids, address[] memory entrepreneurs,
        uint[] memory pledgeCosts,uint[] memory pledgesNeeded, uint[] memory pledgesCounts,
        bool[] memory cancelled
        ) {
        uint count = 0;

        // First, count how many cancelled campaigns there are
        for (uint i = 1; i <= campaignCount; i++) {
            if (campaigns[i].cancelled && !campaigns[i].fulfilled) {
                count++;
            }
        }

        // Create arrays to hold cancelled campaign data
        ids = new uint[](count);
        entrepreneurs = new address[](count);
        pledgeCosts = new uint[](count);
        pledgesNeeded = new uint[](count);
        pledgesCounts = new uint[](count);
        cancelled = new bool[](count);

        uint index = 0;

        // Populate the arrays with data from cancelled campaigns
        for (uint i = 1; i <= campaignCount; i++) {
            if (!campaigns[i].fulfilled && campaigns[i].cancelled) {
                Campaign storage campaign = campaigns[i];
                ids[index] = campaign.campaignId;
                entrepreneurs[index] = campaign.entrepreneur;
                pledgeCosts[index] = campaign.pledgeCost;
                pledgesNeeded[index] = campaign.pledgesNeeded;
                pledgesCounts[index] = campaign.pledgesCount;
                cancelled[index] = campaign.cancelled;
                index++;
            }
        }

        return (ids, entrepreneurs, pledgeCosts, pledgesNeeded, pledgesCounts, cancelled);
    }

    // Get the total uncollected platform fees across all campaigns
    function getContractFees() public view returns (uint) {
        uint totalEarnings = platformFees; // Start with accumulated platform fees
        return totalEarnings; // Return total platform earnings
    }

    function getName(uint campaignId) public  view returns (string memory titles) {
        return campaigns[campaignId].titles;
    }

    function getDestroyed() public view returns (bool) {
        return isDestroyed;
    }
}

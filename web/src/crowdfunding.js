import web3 from './web3';

const address = '0x8a0198a35b3b60a2f54edB757789C30fC9d6416a';  // Διεύθυνση του smart contract
const abi = [
	{
		"constant": false,
		"inputs": [],
		"name": "destroyContract",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [
			{
				"name": "campaignId",
				"type": "uint256"
			}
		],
		"name": "getInvestors",
		"outputs": [
			{
				"name": "",
				"type": "address[]"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"name": "campaigns",
		"outputs": [
			{
				"name": "campaignId",
				"type": "uint256"
			},
			{
				"name": "entrepreneur",
				"type": "address"
			},
			{
				"name": "titles",
				"type": "string"
			},
			{
				"name": "pledgeCost",
				"type": "uint256"
			},
			{
				"name": "pledgesNeeded",
				"type": "uint256"
			},
			{
				"name": "pledgesCount",
				"type": "uint256"
			},
			{
				"name": "fulfilled",
				"type": "bool"
			},
			{
				"name": "cancelled",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "platformFees",
		"outputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [],
		"name": "collectPlatformEarnings",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "getDestroyed",
		"outputs": [
			{
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"name": "_title",
				"type": "string"
			},
			{
				"name": "_pledgeCost",
				"type": "uint256"
			},
			{
				"name": "_pledgesNeeded",
				"type": "uint256"
			}
		],
		"name": "createCampaign",
		"outputs": [],
		"payable": true,
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "getBannedEntrepreneurs",
		"outputs": [
			{
				"name": "",
				"type": "address[]"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [],
		"name": "refundAllInvestments",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "getCompletedCampaigns",
		"outputs": [
			{
				"name": "ids",
				"type": "uint256[]"
			},
			{
				"name": "entrepreneurs",
				"type": "address[]"
			},
			{
				"name": "pledgeCosts",
				"type": "uint256[]"
			},
			{
				"name": "pledgesNeeded",
				"type": "uint256[]"
			},
			{
				"name": "pledgesCounts",
				"type": "uint256[]"
			},
			{
				"name": "fulfilled",
				"type": "bool[]"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"name": "campaignId",
				"type": "uint256"
			}
		],
		"name": "cancelCampaign",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"name": "bannedEntrepreneursList",
		"outputs": [
			{
				"name": "",
				"type": "address"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [
			{
				"name": "campaignId",
				"type": "uint256"
			}
		],
		"name": "getName",
		"outputs": [
			{
				"name": "titles",
				"type": "string"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "getContractBalance",
		"outputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [
			{
				"name": "campaignId",
				"type": "uint256"
			},
			{
				"name": "_investor",
				"type": "address"
			}
		],
		"name": "getShares",
		"outputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "campaignFee",
		"outputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"name": "",
				"type": "address"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"name": "campaignId",
				"type": "uint256"
			}
		],
		"name": "completeCampaign",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "isDestroyed",
		"outputs": [
			{
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"name": "_newOwner",
				"type": "address"
			}
		],
		"name": "changeOwner",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"name": "_entrepreneur",
				"type": "address"
			}
		],
		"name": "banEntrepreneur",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "getCancelledCampaigns",
		"outputs": [
			{
				"name": "ids",
				"type": "uint256[]"
			},
			{
				"name": "entrepreneurs",
				"type": "address[]"
			},
			{
				"name": "pledgeCosts",
				"type": "uint256[]"
			},
			{
				"name": "pledgesNeeded",
				"type": "uint256[]"
			},
			{
				"name": "pledgesCounts",
				"type": "uint256[]"
			},
			{
				"name": "cancelled",
				"type": "bool[]"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "getActiveCampaigns",
		"outputs": [
			{
				"name": "ids",
				"type": "uint256[]"
			},
			{
				"name": "entrepreneurs",
				"type": "address[]"
			},
			{
				"name": "pledgeCosts",
				"type": "uint256[]"
			},
			{
				"name": "pledgesNeeded",
				"type": "uint256[]"
			},
			{
				"name": "pledgesCounts",
				"type": "uint256[]"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "coOwner",
		"outputs": [
			{
				"name": "",
				"type": "address"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "getContractFees",
		"outputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"name": "campaignId",
				"type": "uint256"
			},
			{
				"name": "shares",
				"type": "uint256"
			}
		],
		"name": "contributeToCampaign",
		"outputs": [],
		"payable": true,
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "campaignCounter",
		"outputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"name": "campaignId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"name": "entrepreneur",
				"type": "address"
			},
			{
				"indexed": false,
				"name": "title",
				"type": "string"
			}
		],
		"name": "CampaignCreated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"name": "campaignId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"name": "investor",
				"type": "address"
			},
			{
				"indexed": false,
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "InvestmentMade",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"name": "campaignId",
				"type": "uint256"
			}
		],
		"name": "CampaignCancelled",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"name": "campaignId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"name": "entrepreneur",
				"type": "address"
			}
		],
		"name": "CampaignCompleted",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"name": "investor",
				"type": "address"
			},
			{
				"indexed": false,
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "InvestorRefunded",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"name": "entrepreneur",
				"type": "address"
			}
		],
		"name": "EntrepreneurBanned",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"name": "owner",
				"type": "address"
			}
		],
		"name": "CollectPlatformEarnings",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"name": "owner",
				"type": "address"
			}
		],
		"name": "DestroyContract",
		"type": "event"
	}
];
const crowdfunding = new web3.eth.Contract(abi, address);
export default crowdfunding;
import React, { Component } from 'react';
import 'bootstrap/dist/css/bootstrap.css';
import web3 from './web3';
import crowdfunding from './crowdfunding';

class App extends Component {
    state = {
        ownerAddress: "", // Owner's address
        newOwnerAddress: "",
        balance: 0,
        collectedFees: 0,
        isDestroyed: false,
        liveCampaigns: [],
        canceledCampaigns: [], // New state for canceled campaigns
        completedCampaigns: [], // New state variable for completed campaigns
        bannedEntrepreneurs: [], // List of banned entrepreneurs
        message: "",
        currentAccount: '',
        title: '',
        pledgeCost: '',
        pledgesNeeded: '',
        entrepreneurToBan: '' // New state variable for the ban input,
    };

    async componentDidMount() {
        try { // Αν υπάρχει εγκατεστημένο metamask
            // Ορισμός των state μεταβλητών
            const ownerAddress = await crowdfunding.methods.owner().call();
            const collectedFees = web3.utils.fromWei(await crowdfunding.methods.getContractFees().call(), 'ether');
            const contractBalanceWei = await crowdfunding.methods.getContractBalance().call();
            const contractBalanceEther = web3.utils.fromWei(contractBalanceWei, 'ether');
            this.setState({ message: '', ownerAddress, collectedFees, balance: contractBalanceEther });
            
            if (!this.eventListenersSet) {
                this.setupEventListeners();
                this.eventListenersSet = true;
            }
            try { // Επικοινωνία με το metamask
                const currentAccount = (await window.ethereum.request({ method: 'eth_requestAccounts' }))[0];
                this.setState({ message: '', currentAccount });
                if (!currentAccount) {
                    this.setState({ message: 'No account connected. Please connect MetaMask.' });
                    return;
                }
                /*this.fetchLiveCampaigns();
                this.fetchCanceledCampaigns();
                this.fetchCompletedCampaigns(); // Fetch completed campaigns
                this.fetchBannedEntrepreneurs();
                this.checkContractStatus();*/
            } catch (error) { // Αν το metamask δεν έκανε accept το request
                this.setState({ message: 'Metamask has not connected yet' });
            }
        } catch (error) { // Αν το metamask δεν έχει εγκατασταθεί
            this.setState({ message: 'Metamask is not installed' });
        }
        
    }

    setupEventListeners = async () =>  {
        
        // Listen for account changes in MetaMask
        window.ethereum.on('accountsChanged', async (accounts) => {
            if (accounts.length > 0) {
                const currentAccount = (await window.ethereum.request({ method: 'eth_requestAccounts' }))[0];
                this.setState({ message: '', currentAccount });
                this.fetchLiveCampaigns(); // Ensure campaign data is updated
                this.fetchCanceledCampaigns();
                this.fetchCompletedCampaigns();
            } else {
                this.setState({ currentAccount: '', message: 'Please connect MetaMask.' });
            }
        });
        // Re-fetch campaigns when investment or new campaign events are triggered
        crowdfunding.events.InvestmentMade().on('data', async (data) => {
            this.fetchLiveCampaigns();
            this.fetchBalance();
        });
        crowdfunding.events.CampaignCreated().on('data', async (data) => {
            this.fetchLiveCampaigns();
            this.fetchBalance();
        });

        crowdfunding.events.CampaignCancelled().on('data', async(data) => {
            this.fetchCanceledCampaigns();
            this.fetchLiveCampaigns();
        });

        crowdfunding.events.CampaignCompleted().on('data', async(data) => {
            this.fetchLiveCampaigns();
            this.fetchCompletedCampaigns();
            this.fetchBalance();
        });

        crowdfunding.events.CollectPlatformEarnings().on('data', async(data) => {
            this.fetchBalance();
        });

        crowdfunding.events.EntrepreneurBanned().on('data', async(data) => {
            this.fetchBannedEntrepreneurs();
        });

        crowdfunding.events.DestroyContract().on('data', async(data) => {
            this.fetchLiveCampaigns();
            this.fetchCanceledCampaigns();
            this.fetchCompletedCampaigns(); // Fetch completed campaigns
            this.checkContractStatus();
        });

        crowdfunding.events.InvestorRefunded().on('data', async(data) => {
            this.setState({ message: 'Refund processed successfully!' });
            this.fetchCanceledCampaigns(); // Refresh campaigns
            this.fetchBalance();
        });
    }
    
    createCampaign = async () => {
        const { title, pledgeCost, pledgesNeeded } = this.state;
    
        if (!title || !pledgeCost || !pledgesNeeded) {
            this.setState({ message: 'Please fill in all fields.' });
            return;
        }
    
        if (parseFloat(pledgeCost) <= 0) {
            this.setState({ message: 'Pledge cost must be greater than 0.' });
            return;
        }
    
        this.setState({ message: 'Creating campaign...' });
    
        try {
            const accounts = await web3.eth.getAccounts();
            await crowdfunding.methods.createCampaign(title, web3.utils.toWei(pledgeCost, 'ether'), pledgesNeeded).send({
                from: this.state.currentAccount,
                value: web3.utils.toWei('0.02', 'ether'), // Ensure the value is in Wei
            });
    
            const collectedFees = web3.utils.fromWei(await crowdfunding.methods.getContractFees().call(),'ether');
            this.setState({ message: 'Campaign created successfully!', collectedFees });
        } catch (err) {
            this.setState({ message: `Error: ${err.message}` });
        }
    };
    

    fetchLiveCampaigns = async () => {
        try {
            const campaignsAll = await crowdfunding.methods.getActiveCampaigns().call();
            const { ids, entrepreneurs, titles, pledgeCosts, pledgesNeeded, pledgesCounts } = campaignsAll;
            const currentAccount = this.state.currentAccount; // Connected account
            const campaigns = [];
    
            for (let i = 0; i < ids.length; i++) {
                let userShares = 0; // Default to 0 if not found
                
                try {
                    userShares = await crowdfunding.methods.getShares(ids[i], currentAccount).call();
                    userShares = parseInt(userShares, 10);
                } catch (error) {
                    console.warn(`Error fetching shares for campaign ${ids[i]}:`, error);
                    userShares = 0; // Default to 0 in case of error
                }
                
                campaigns.push({
                    id: ids[i],
                    entrepreneur: entrepreneurs[i],
                    title: crowdfunding.methods.getName(ids[i]).call(),
                    pledgeCost: web3.utils.fromWei(pledgeCosts[i], 'ether'),
                    pledgesNeeded: pledgesNeeded[i],
                    pledgesCount: pledgesCounts[i],
                    remainingShares: pledgesNeeded[i] - pledgesCounts[i], // Always 0 for canceled campaigns
                    userShares,
                    canComplete: pledgesCounts[i] >= pledgesNeeded[i], // Add canComplete property
                });
            }
    
            this.setState({ liveCampaigns: campaigns });
        } catch (error) {
            console.error('Error fetching campaigns:', error);
            this.setState({ message: `Error fetching campaigns: ${error.message}` });
        }
    };
    
    pledge = async (campaignId, pledgeCost) => {
        const value = web3.utils.toWei(pledgeCost.toString(), 'ether');

        this.setState({ message: 'Processing pledge...' });
        try {
            const accounts = await web3.eth.getAccounts();
            await crowdfunding.methods.contributeToCampaign(campaignId, 1).send({
                from: this.state.currentAccount,
                value,
            });
            this.setState({ message: 'Pledge successful!' });
        } catch (error) {
            this.setState({ message: `Pledge failed: ${error.message}` });
        }
    };

    fetchCanceledCampaigns = async () => {
        try {
            const canceledCampaignsData = await crowdfunding.methods.getCancelledCampaigns().call();
            const { ids, entrepreneurs, pledgeCosts, pledgesNeeded, pledgesCounts, cancelled } = canceledCampaignsData;
    
            const currentAccount = this.state.currentAccount; // Connected account
            const canceledCampaigns = [];
            let hasRefundableInvestment = false; // Reset refundable flag
    
            for (let i = 0; i < ids.length; i++) {
                let userShares = 0;
                let owesRefund = false;
    
                try {
                    userShares = await crowdfunding.methods.getShares(ids[i], currentAccount).call();
                    userShares = parseInt(userShares, 10);
                    if (userShares > 0 && cancelled[i]) {
                        owesRefund = true;
                        hasRefundableInvestment = true;
                    }
                } catch (error) {
                    console.warn(`Error fetching shares for campaign ${ids[i]}:`, error);
                    userShares = 0;
                }
    
                canceledCampaigns.push({
                    id: ids[i],
                    entrepreneur: entrepreneurs[i],
                    title: await crowdfunding.methods.getName(ids[i]).call(),
                    pledgeCost: web3.utils.fromWei(pledgeCosts[i], 'ether'),
                    pledgesNeeded: pledgesNeeded[i],
                    pledgesCount: pledgesCounts[i],
                    remainingShares: 0,
                    userShares,
                    owesRefund, // Update owesRefund flag
                    cancelled: cancelled[i],
                });
            }
    
            this.setState({ canceledCampaigns, hasRefundableInvestment });
        } catch (error) {
            console.error('Error fetching canceled campaigns:', error);
            this.setState({ message: `Error fetching canceled campaigns: ${error.message}` });
        }
    };
    
    cancelCampaign = async (campaignId) => {
        this.setState({ message: 'Canceling campaign...' });
        try {
            const accounts = await web3.eth.getAccounts();
            await crowdfunding.methods.cancelCampaign(campaignId).send({
                from: this.state.currentAccount,
            });
            this.setState({ message: 'Campaign canceled successfully!' });

        } catch (error) {
            console.error(error);
            this.setState({ message: `Cancellation failed: ${error.message}` });
        }
    };

    fetchCompletedCampaigns = async () => {
        try {
            const completedCampaignsData = await crowdfunding.methods.getCompletedCampaigns().call();
            const { ids, entrepreneurs, pledgeCosts, pledgesNeeded, pledgesCounts, fulfilled } = completedCampaignsData;
            const currentAccount = this.state.currentAccount; // Connected account
            const completedCampaigns = [];
    
            for (let i = 0; i < ids.length; i++) {
                let userShares = 0; // Default to 0 if not found
                
                try {
                    userShares = await crowdfunding.methods.getShares(ids[i], currentAccount).call();
                    userShares = parseInt(userShares, 10);
                } catch (error) {
                    console.warn(`Error fetching shares for campaign ${ids[i]}:`, error);
                    userShares = 0; // Default to 0 in case of error
                }

                completedCampaigns.push({
                    id: ids[i],
                    entrepreneur: entrepreneurs[i],
                    title: crowdfunding.methods.getName(ids[i]).call(),
                    pledgeCost: web3.utils.fromWei(pledgeCosts[i], 'ether'),
                    pledgesNeeded: pledgesNeeded[i],
                    pledgesCount: pledgesCounts[i],
                    remainingShares: 0, // Always 0 for canceled campaigns
                    userShares,
                    fulfilled: fulfilled[i],
                });
            }
    
            this.setState({ completedCampaigns });
        } catch (error) {
            console.error('Error fetching completed campaigns:', error);
            this.setState({ message: `Error fetching completed campaigns: ${error.message}` });
        }
    };    

    fulfillCampaign = async (campaignId) => {
        this.setState({ message: 'Fulfilling campaign...' });
        try {
            const accounts = await web3.eth.getAccounts();
            await crowdfunding.methods.completeCampaign(campaignId).send({
                from: this.state.currentAccount,
            });
    
            this.setState({ message: 'Campaign fulfilled successfully!' });
        } catch (error) {
            console.error('Error fulfilling campaign:', error);
            this.setState({ message: `Fulfillment failed: ${error.message}` });
        }
    };

    fetchBalance = async () => {
        try {
            const contractBalanceWei = await crowdfunding.methods.getContractBalance().call();
            const contractBalanceEther = web3.utils.fromWei(contractBalanceWei, 'ether');
            const collectedFees = web3.utils.fromWei(await crowdfunding.methods.getContractFees().call(), 'ether');
            this.setState({ balance: contractBalanceEther, collectedFees });
        } catch (error) {
            console.error('Error fetching contract balance:', error);
            this.setState({ message: `Error fetching balance: ${error.message}` });
        }
    };

    withdrawFunds = async () => {
        this.setState({ message: 'Processing withdrawal...' });
        try {
            const accounts = await web3.eth.getAccounts();
            await crowdfunding.methods.collectPlatformEarnings().send({
                from: this.state.currentAccount,
            });
            this.setState({ message: 'Withdrawal successful!' });
        } catch (error) {
            console.error('Error during withdrawal:', error);
            this.setState({ message: `Withdrawal failed: ${error.message}` });
        }
    };
    
    changeOwner = async () => {
        const { newOwnerAddress } = this.state;

        if (!web3.utils.isAddress(newOwnerAddress)) {
            this.setState({ message: "Invalid Ethereum address." });
            return;
        }

        this.setState({ message: "Processing ownership transfer..." });

        try {
            const accounts = await web3.eth.getAccounts();
            await crowdfunding.methods.changeOwner(newOwnerAddress).send({
                from: accounts[0],
            });

            this.setState({
                message: "Ownership successfully transferred!",
                ownerAddress: newOwnerAddress,
            });
        } catch (error) {
            console.error(error);
            this.setState({ message: `Error: ${error.message}` });
        }
    };

    banEntrepreneur = async () => {
        const { entrepreneurToBan } = this.state;
    
        if (!web3.utils.isAddress(entrepreneurToBan)) {
            this.setState({ message: "Invalid Ethereum address." });
            return;
        }
    
        this.setState({ message: "Processing ban request..." });
    
        try {
            const accounts = await web3.eth.getAccounts();        

            await crowdfunding.methods.banEntrepreneur(entrepreneurToBan).send({
                from: this.state.currentAccount,
            });
        
            this.setState({ message: `Address ${entrepreneurToBan} banned successfully!` });
        } catch (error) {
            console.error("Error during banEntrepreneur:", error);
            this.setState({ message: `Error: ${error.message}` });
        }
        
    };
    
    // Fetch banned entrepreneurs from the contract
    fetchBannedEntrepreneurs = async () => {
        try {
            const bannedEntrepreneursList = await crowdfunding.methods.getBannedEntrepreneurs().call();
            const bannedEntrepreneurs = [];
            bannedEntrepreneursList.forEach((entrepreneur) => {
                bannedEntrepreneurs.push(entrepreneur.toLowerCase());
            })
            this.setState({ bannedEntrepreneurs });
        } catch (error) {
            console.error("Error fetching banned entrepreneurs:", error);
            this.setState({ message: `Error fetching banned list: ${error.message}` });
        }
    };

    destroyContract = async () => {
        try {
            this.setState({ message: "Destroying the contract..." });
    
            const accounts = await web3.eth.getAccounts();           
    
            this.setState({
                message: "The contract has been successfully destroyed.",
                isDestroyed: true,
            });
            await crowdfunding.methods.destroyContract().send({
                from: this.state.currentAccount,
            });
        } catch (error) {
            console.error("Error destroying contract:", error);
            this.setState({ message: `Error: ${error.message}` });
        }
    };

    checkContractStatus = async () => {
        try {
            const isDestroyed = await crowdfunding.methods.getDestroyed().call();
            this.setState({ isDestroyed });
        } catch (error) {
            console.error("Error fetching contract status:", error);
            this.setState({ message: `Error checking contract status: ${error.message}` });
        }
    };

    claimRefund = async () => {
        this.setState({ message: 'Processing refund...' });
        try {
            const accounts = await web3.eth.getAccounts();
            await crowdfunding.methods.refundAllInvestments().send({
                from: this.state.currentAccount,
            });
        } catch (error) {
            console.error('Refund failed:', error);
            this.setState({ message: `Refund failed: ${error.message}` });
        }
    };
    

    render() {
        const { isDestroyed, currentAccount, liveCampaigns, canceledCampaigns, newOwnerAddress, message, bannedEntrepreneurs,
                entrepreneurToBan, hasRefundableInvestment } = this.state;
        const isOwner = this.state.currentAccount === this.state.ownerAddress.toLocaleLowerCase();
        const isDisabled = isOwner || !window.ethereum;
        const canWithdraw = isOwner && parseFloat(this.state.collectedFees) > 0;
        const isBanned = bannedEntrepreneurs.includes(currentAccount); // Check if current account is banned
        return (
            <>
                <div className="container mt-4">
                    <h1 className="text-center">Crowdfunding DApp</h1>
                    
                    <div className="mb-4">
                        <div className="card-body">
                            {/* Current Address */}
                            <h5>
                                Current Address <input
                                    type="text"
                                    className="form-control d-inline-block ml-2"
                                    value={this.state.currentAccount}
                                    readOnly
                                    style={{ width: '400px', color: 'gray' }}
                                />
                            </h5>

                            {/* Owner's Address */}
                            <h5>
                                Owner's Address  <input
                                    type="text"
                                    className="form-control d-inline-block ml-2"
                                    value={this.state.ownerAddress}
                                    readOnly
                                    style={{ width: '400px', color: 'gray' }}
                                />
                            </h5>

                            <div className="d-flex">
                                <h5 className="mr-3">
                                    Contract Balance <input
                                        type="text"
                                        className="form-control d-inline-block ml-2"
                                        value={`${this.state.balance} ETH`}
                                        readOnly
                                        style={{ width: '100px', marginRight: '10px', color: 'gray' }}
                                    />
                                </h5>

                                <h5>
                                    Collected Fees <input
                                        type="text"
                                        className="form-control d-inline-block ml-2"
                                        value={`${this.state.collectedFees} ETH`}
                                        readOnly
                                        style={{ width: '100px', color: 'gray' }}
                                    />
                                </h5>
                            </div>
                        </div>
                    </div>
                </div>

                <hr />

                <div className="container mt-4">
                    <h2>Create a New Campaign</h2>
                    <div className="form-group">
                        <label>Title</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Enter campaign title"
                            value={this.state.title}
                            onChange={(e) => this.setState({ title: e.target.value })}
                            disabled={isDisabled}
                        />
                    </div>

                    <div className="form-group">
                        <label>Pledge Cost (ETH)</label>
                        <input
                            type="number"
                            className="form-control"
                            placeholder="Enter pledge cost"
                            value={this.state.pledgeCost}
                            onChange={(e) => this.setState({ pledgeCost: e.target.value })}
                            disabled={isDisabled}
                        />
                    </div>

                    <div className="form-group">
                        <label>Pledges Needed</label>
                        <input
                            type="number"
                            className="form-control"
                            placeholder="Enter number of pledges needed"
                            value={this.state.pledgesNeeded}
                            onChange={(e) => this.setState({ pledgesNeeded: e.target.value })}
                            disabled={isDisabled}
                        />
                    </div>
                    <div className="mt-4">
                        
                            <button
                            className={`btn btn-primary ${(isDisabled || isBanned || isDestroyed) ? 'disabled' : ''}`}
                            onClick={this.createCampaign}
                            disabled={isDisabled}
                        >
                                Create
                            </button>
                        
                        {isOwner && (
                            <p className="text-danger mt-2">Owners cannot create campaigns.</p>
                        )}
                        {isBanned && (
                            <p className="text-danger mt-2">Banned entrepreneurs can't create campaigns.</p>
                        )}
                        {isDestroyed && (
                            <p className="text-danger mt-2">The platform has been destroyed. Campaign creation is disabled.</p>
                        )}
                        <p className="text-muted mt-2">{this.state.message}</p>
                    </div>

                </div>

                <hr />

                <div className="container mt-4">
                    <h2>Live Campaigns</h2>
                    {message && <p className="text-muted">{message}</p>}
                    <table className="table table-bordered">
                        <thead className="thead-light">
                            <tr>
                                <th>Entrepreneur</th>
                                <th>Title</th>
                                <th>Price / Backers / Pledges left / Your Pledges</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {liveCampaigns.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="text-center">No live campaigns found.</td>
                                </tr>
                            ) : (
                                liveCampaigns.map((campaign) => (
                                    <tr key={campaign.id}>
                                        <td>{campaign.entrepreneur}</td>
                                        <td>{campaign.title}</td>
                                        <td>
                                            | {campaign.pledgeCost} | {campaign.pledgesCount} | {campaign.remainingShares} | {campaign.userShares} |
                                        </td>
                                        <td>
                                            <button
                                                className="btn btn-success btn-sm mr-2"
                                                onClick={() => this.pledge(campaign.id, campaign.pledgeCost)}
                                                style={{marginRight: '5px'}}
                                            >
                                                Pledge
                                            </button>

                                            {(currentAccount === campaign.entrepreneur.toLocaleLowerCase() || isOwner) && (
                                                    
                                                    <button
                                                        className="btn btn-danger btn-sm"
                                                        onClick={() => this.cancelCampaign(campaign.id)}
                                                        style={{marginRight: '5px'}}
                                                    >
                                                        Cancel
                                                    </button>
                                            )}

                                            {(currentAccount === campaign.entrepreneur.toLocaleLowerCase() || isOwner) && (
                                                    <button
                                                        className={`btn btn-success btn-sm ${!campaign.canComplete ? 'disabled' : ''}`}
                                                        onClick={() => this.fulfillCampaign(campaign.id)}
                                                        disabled={!campaign.canComplete} // Disable button if campaign cannot be completed
                                                    >
                                                        Complete Campaign
                                                    </button>
                                            )}      
                                            
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <hr />

                <div className="container mt-4">
                    <h2>Canceled Campaigns</h2>
                    {message && <p className="text-muted">{message}</p>}
                    <table className="table table-bordered">
                        <thead className="thead-light">
                            <tr>
                                <th>Entrepreneur</th>
                                <th>Title</th>
                                <th>Price / Backers / Pledges left / Your Pledges</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {canceledCampaigns.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="text-center">No canceled campaigns found.</td>
                                </tr>
                            ) : (
                                canceledCampaigns.map((campaign) => (
                                    <tr key={campaign.id}>
                                        <td>{campaign.entrepreneur}</td>
                                        <td>{campaign.title}</td>
                                        <td>
                                            | {campaign.pledgeCost} | {campaign.pledgesCount} |
                                            <span style={{ color: 'gray', marginLeft: '5px', marginRight: '5px' }}>{campaign.remainingShares}</span>
                                            | {campaign.userShares} |
                                        </td>
                                        <td>
                                            {campaign.owesRefund ? (
                                                <span className="text-success">Refundable</span>
                                            ) : (
                                                <span className="text-muted">No Refund</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    <button
                        className="btn btn-primary mt-3"
                        onClick={this.claimRefund}
                        disabled={!hasRefundableInvestment}
                    >
                        Claim Refund
                    </button>
                </div>

                <hr />
            
                <div className="container mt-4">
                    <h2>Completed Campaigns</h2>
                    <table className="table table-bordered">
                        <thead className="thead-light">
                            <tr>
                                <th>Entrepreneur</th>
                                <th>Title</th>
                                <th>Price / Backers / Pledges left / Your Pledges</th>
                            </tr>
                        </thead>
                        <tbody>
                            {this.state.completedCampaigns.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="text-center">No completed campaigns found.</td>
                                </tr>
                            ) : (
                                this.state.completedCampaigns.map((campaign) => (
                                    <tr key={campaign.id}>
                                        <td>{campaign.entrepreneur}</td>
                                        <td>{campaign.title}</td>
                                        <td>
                                            | {campaign.pledgeCost} | {campaign.pledgesCount} |
                                            <span style={{ color: 'gray', marginLeft: '5px', marginRight: '5px' }}>{campaign.remainingShares}</span>
                                            | {campaign.userShares} |
                                        </td>                                     
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <hr />

                <div className="container mt-4">
                    <h2>Control Panel</h2>
                    <div>
                        {isOwner ? (
                            <button
                                className="btn btn-warning"
                                onClick={this.withdrawFunds}
                                disabled={!canWithdraw}
                                style={{width: '150px'}}
                            >
                                Withdraw Funds
                            </button>
                        ) : (
                            <p className="text-muted">Only the owner can withdraw funds.</p>
                        )}
                        <p className="text-muted mt-2">{this.state.message}</p>

                        {(isOwner) ? (
                            <>
                                <div className="d-flex align-items-center">
                                    <button
                                        className="btn btn-primary mr-2"
                                        onClick={this.changeOwner}
                                        disabled={this.state.isDestroyed || !newOwnerAddress}
                                        style={{ width: '150px', marginRight: '5px' }}
                                    >
                                        Change Owner
                                    </button>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Enter new owner address"
                                        value={newOwnerAddress}
                                        onChange={(e) => this.setState({ newOwnerAddress: e.target.value })}
                                        style={{ width: '250px' }} // Adjust width as needed
                                    />
                                </div>


                            </>
                        ) : (
                            <p className="text-muted">Only the owner can change ownership.</p>
                        )}
                        {/* Ban Entrepreneur */}
                        {isOwner && (
                            <div className="d-flex align-items-center mt-3">
                                <button
                                    className="btn btn-danger mr-2"
                                    onClick={this.banEntrepreneur}
                                    disabled={this.state.isDestroyed || !entrepreneurToBan}
                                    style={{ width: "150px", marginRight: "5px" }}
                                >
                                    Ban Entrepreneur
                                </button>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Enter entrepreneur address"
                                    value={entrepreneurToBan}
                                    onChange={(e) => this.setState({ entrepreneurToBan: e.target.value })}
                                    style={{ width: "250px" }}
                                />

                            </div>
                        )}
                        {!isOwner && (
                            <p className="text-muted">Only the owner can ban entrepreneurs.</p>
                        )}
                        {message && <p className="text-info mt-2">{message}</p>}

                        {isOwner && (
                            <div className="mt-4">
                                <button
                                    className="btn btn-danger"
                                    onClick={this.destroyContract}
                                    disabled={isDestroyed || canWithdraw}
                                >
                                    Destroy Contract
                                </button>
                            </div>
                        )}
                        {!isOwner && (
                            <p className="text-muted">Only the owner can destroy a contract.</p>
                        )}
                        {message && <p className="text-info mt-2">{message}</p>}

                        {this.state.isDestroyed && (
                            <p className="text-danger mt-3">
                                The platform has been destroyed. All campaigns have been canceled, and further operations are disabled.
                            </p>
                        )}
                    </div>
                </div>
            </>
        );
    }
}

export default App;
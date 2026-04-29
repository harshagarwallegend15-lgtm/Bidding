import React, { useState } from 'react';
import { ethers } from 'ethers';
import { generateBidHash } from '../utils/hashing';
import contractABI from '../contractABI.json';

// Mock contract address for development
const CONTRACT_ADDRESS = "0x1234567890123456789012345678901234567890";

const CommitForm = ({ provider, isAuctionActive }) => {
  const [bidValue, setBidValue] = useState('');
  const [secretSalt, setSecretSalt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txStatus, setTxStatus] = useState('');

  const handleCommit = async (e) => {
    e.preventDefault();
    if (!provider) {
      setTxStatus("Please connect MetaMask first.");
      return;
    }
    
    if (!bidValue || !secretSalt) {
      setTxStatus("Please fill in both fields.");
      return;
    }

    try {
      setIsSubmitting(true);
      setTxStatus("Preparing transaction...");
      
      // Convert bid value to Wei
      const valueInWei = ethers.parseEther(bidValue.toString());
      
      // Generate the Secret Hash
      const bidHash = generateBidHash(valueInWei, secretSalt);
      console.log("Generated bidHash:", bidHash);
      
      // Get Signer
      const signer = await provider.getSigner();
      
      // Initialize Contract
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
      
      setTxStatus("Please confirm the transaction in MetaMask...");
      
      // Call commitBid function with the deposit
      const tx = await contract.commitBid(bidHash, { value: valueInWei });
      
      setTxStatus("Transaction submitted! Waiting for confirmation...");
      
      // Wait for transaction to be mined
      await tx.wait();
      
      setTxStatus(`Success! Your secret envelope is secured. Tx: ${tx.hash}`);
      setBidValue('');
      setSecretSalt('');
      
    } catch (err) {
      console.error("Commit failed:", err);
      setTxStatus("Transaction failed. " + (err.reason || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuctionActive) {
    return (
      <div className="glass-card disabled-form">
        <h3>Commit Phase Closed</h3>
        <p>The auction is no longer accepting new bids.</p>
      </div>
    );
  }

  return (
    <div className="glass-card commit-form">
      <h3>Step 1: The Secret Envelope</h3>
      <p className="subtitle">Lock in your bid. Nobody can see your value until the reveal phase.</p>
      
      <form onSubmit={handleCommit}>
        <div className="input-group">
          <label htmlFor="bidValue">Bid Amount (ETH)</label>
          <input 
            type="number" 
            id="bidValue" 
            value={bidValue}
            onChange={(e) => setBidValue(e.target.value)}
            step="0.0001"
            min="0"
            placeholder="e.g. 0.1"
            disabled={isSubmitting}
            required
          />
        </div>
        
        <div className="input-group">
          <label htmlFor="secretSalt">Secret Password</label>
          <input 
            type="password" 
            id="secretSalt" 
            value={secretSalt}
            onChange={(e) => setSecretSalt(e.target.value)}
            placeholder="e.g. Apple123!"
            disabled={isSubmitting}
            required
          />
          <small className="help-text">CRITICAL: Save this! You will need it to reveal your bid and win.</small>
        </div>
        
        <button 
          type="submit" 
          className="btn primary-btn submit-btn"
          disabled={isSubmitting || !provider}
        >
          {isSubmitting ? 'Locking Envelope...' : 'Send Secret Envelope'}
        </button>
      </form>
      
      {txStatus && (
        <div className={`status-message ${txStatus.includes('failed') ? 'error' : 'info'}`}>
          {txStatus}
        </div>
      )}
    </div>
  );
};

export default CommitForm;

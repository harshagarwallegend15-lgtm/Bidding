import React, { useState } from 'react';
import { ethers } from 'ethers';
import contractABI from '../contractABI.json';

// Mock contract address for development
const CONTRACT_ADDRESS = "0x1234567890123456789012345678901234567890";

const RevealForm = ({ provider, isRevealActive }) => {
  const [bidValue, setBidValue] = useState('');
  const [secretSalt, setSecretSalt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txStatus, setTxStatus] = useState('');

  const handleReveal = async (e) => {
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
      
      // Get Signer
      const signer = await provider.getSigner();
      
      // Initialize Contract
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
      
      setTxStatus("Please confirm the transaction in MetaMask...");
      
      // Call revealBid function
      const tx = await contract.revealBid(valueInWei, secretSalt);
      
      setTxStatus("Transaction submitted! Waiting for confirmation...");
      
      // Wait for transaction to be mined
      await tx.wait();
      
      setTxStatus(`Success! Your bid has been revealed. Tx: ${tx.hash}`);
      
    } catch (err) {
      console.error("Reveal failed:", err);
      setTxStatus("Transaction failed. " + (err.reason || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isRevealActive) {
    return (
      <div className="glass-card disabled-form">
        <h3>Reveal Phase Closed</h3>
        <p>The auction is currently not in the reveal phase.</p>
      </div>
    );
  }

  return (
    <div className="glass-card reveal-form">
      <h3>Step 2: The Key (Reveal Phase)</h3>
      <p className="subtitle">Time to open your envelope! Provide the exact details you used to commit.</p>
      
      <form onSubmit={handleReveal}>
        <div className="input-group">
          <label htmlFor="revealBidValue">Original Bid Amount (ETH)</label>
          <input 
            type="number" 
            id="revealBidValue" 
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
          <label htmlFor="revealSecretSalt">Secret Password</label>
          <input 
            type="text" 
            id="revealSecretSalt" 
            value={secretSalt}
            onChange={(e) => setSecretSalt(e.target.value)}
            placeholder="e.g. Apple123!"
            disabled={isSubmitting}
            required
          />
        </div>
        
        <button 
          type="submit" 
          className="btn secondary-btn submit-btn"
          disabled={isSubmitting || !provider}
        >
          {isSubmitting ? 'Unlocking...' : 'Unlock Envelope'}
        </button>
      </form>
      
      {txStatus && (
        <div className={`status-message ${txStatus.includes('failed') ? 'error' : 'success'}`}>
          {txStatus}
        </div>
      )}
    </div>
  );
};

export default RevealForm;

import React, { useState } from 'react';
import { ethers } from 'ethers';

const ConnectWallet = ({ onConnect }) => {
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState(null);
  const [error, setError] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const connectWallet = async () => {
    setIsConnecting(true);
    setError('');
    
    if (window.ethereum) {
      try {
        // Force MetaMask to show its popup every time.
        // wallet_requestPermissions always prompts the user to:
        //   1. Enter their MetaMask password (if locked)
        //   2. Choose which account to connect
        // This prevents auto-connecting to the last used account.
        await window.ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }],
        });

        // Now get the selected account
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        
        if (accounts.length > 0) {
          const userAccount = accounts[0];
          setAccount(userAccount);
          
          // Get balance
          const bal = await provider.getBalance(userAccount);
          const balInEth = ethers.formatEther(bal);
          setBalance(parseFloat(balInEth).toFixed(4));
          
          // Inform parent component
          if (onConnect) {
            onConnect(userAccount, provider);
          }
        }
      } catch (err) {
        console.error("Wallet connection failed", err);
        if (err.code === 4001) {
          setError('Connection rejected. Please approve in MetaMask.');
        } else {
          setError('Failed to connect wallet. Please try again.');
        }
      }
    } else {
      setError('MetaMask is not installed. Please install it to use this DApp.');
    }
    
    setIsConnecting(false);
  };

  const disconnectWallet = () => {
    setAccount(null);
    setBalance(null);
    setError('');
  };

  return (
    <div className="wallet-container">
      {!account ? (
        <button 
          className="btn primary-btn pulse-effect" 
          onClick={connectWallet}
          disabled={isConnecting}
        >
          {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
        </button>
      ) : (
        <div className="wallet-info glass-card">
          <div className="status-dot online"></div>
          <div>
            <p className="account-address">{account.slice(0, 6)}...{account.slice(-4)}</p>
            <p className="account-balance">{balance} ETH</p>
          </div>
          <button className="btn-icon" onClick={disconnectWallet} title="Switch Wallet">↻</button>
        </div>
      )}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
};

export default ConnectWallet;

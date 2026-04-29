import { ethers } from 'ethers';

/**
 * Creates a keccak256 hash of the bid value and secret salt.
 * Matches Solidity's keccak256(abi.encodePacked(bidValue, secretSalt))
 * 
 * @param {string} bidValue - The bid value in Wei (as a string)
 * @param {string} secretSalt - The user's secret password/salt
 * @returns {string} - The bytes32 hash representation
 */
export const generateBidHash = (bidValue, secretSalt) => {
  try {
    // We encode the values using ethers.js
    const encoded = ethers.solidityPacked(
      ["uint256", "string"],
      [bidValue, secretSalt]
    );
    
    // Hash the encoded payload
    const bidHash = ethers.keccak256(encoded);
    return bidHash;
  } catch (err) {
    console.error("Hashing error:", err);
    throw err;
  }
};

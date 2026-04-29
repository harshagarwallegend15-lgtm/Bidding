import React, { useState } from 'react';

const CreateAuctionForm = ({ onCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [commitHours, setCommitHours] = useState(4);
  const [revealHours, setRevealHours] = useState(4);
  const [minBid, setMinBid] = useState('0.00001');

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  };

  const handleCreate = (e) => {
    e.preventDefault();
    const auction = {
      id: Date.now(),
      code: generateCode(),
      title: title || 'Untitled Auction',
      description: description || 'No description provided.',
      imageUrl: imageUrl || '/product.png',
      commitDuration: commitHours * 60 * 60 * 1000,
      revealDuration: revealHours * 60 * 60 * 1000,
      minBid,
      createdAt: Date.now(),
      status: 'draft',
      participants: [],
      bids: [],
    };
    onCreated(auction);
  };

  return (
    <form className="create-auction-form" onSubmit={handleCreate}>
      <div className="input-group">
        <label htmlFor="auctionTitle">Auction Title</label>
        <input id="auctionTitle" type="text" placeholder="e.g. Rare Comic Book #1" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="input-group">
        <label htmlFor="auctionDesc">Description</label>
        <textarea id="auctionDesc" placeholder="Describe the item being auctioned..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} required />
      </div>
      <div className="input-group">
        <label htmlFor="auctionImage">Image URL (optional)</label>
        <input id="auctionImage" type="text" placeholder="https://... or leave blank for default" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
      </div>
      <div className="input-row">
        <div className="input-group">
          <label htmlFor="commitHours">Commit Phase (hours)</label>
          <input id="commitHours" type="number" min={1} max={48} value={commitHours} onChange={(e) => setCommitHours(Number(e.target.value))} />
        </div>
        <div className="input-group">
          <label htmlFor="revealHours">Reveal Phase (hours)</label>
          <input id="revealHours" type="number" min={1} max={48} value={revealHours} onChange={(e) => setRevealHours(Number(e.target.value))} />
        </div>
      </div>
      <div className="input-group">
        <label htmlFor="minBid">Minimum Bid (ETH)</label>
        <input id="minBid" type="number" step="0.00001" min="0" value={minBid} onChange={(e) => setMinBid(e.target.value)} />
        <span className="help-text">Default: 0.00001 ETH — set any amount you like</span>
      </div>
      <button type="submit" className="btn primary-btn full-width">Create Auction</button>
    </form>
  );
};

export default CreateAuctionForm;

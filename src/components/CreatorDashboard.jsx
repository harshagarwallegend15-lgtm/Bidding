import React, { useState, useRef, useEffect } from 'react';
import ConnectWallet from './ConnectWallet';
import CreateAuctionForm from './CreateAuctionForm';

const CreatorDashboard = ({ user, onBack, onLogout, auctions, addAuction, updateAuction, deleteAuction }) => {
  const [provider, setProvider] = useState(null);
  const [userAccount, setUserAccount] = useState(null);
  const [view, setView] = useState('list'); // 'list' | 'create' | 'manage' | 'results'
  const [selectedAuctionId, setSelectedAuctionId] = useState(null);
  const [showWinner, setShowWinner] = useState(false);
  const [refundProgress, setRefundProgress] = useState({}); // { participantIndex: 'pending'|'refunding'|'refunded' }
  const confettiRef = useRef(null);

  const handleConnect = (account, ethProvider) => {
    setUserAccount(account);
    setProvider(ethProvider);
  };

  const handleAuctionCreated = (auction) => {
    addAuction(auction);
    setSelectedAuctionId(auction.id);
    setView('manage');
  };

  const startAuction = (auctionId) => {
    const auction = auctions.find(a => a.id === auctionId);
    if (!auction) return;
    updateAuction(auctionId, {
      status: 'commit',
      commitDeadline: Date.now() + auction.commitDuration,
      revealDeadline: Date.now() + auction.commitDuration + auction.revealDuration,
    });
  };

  const switchToReveal = (auctionId) => {
    updateAuction(auctionId, { status: 'reveal' });
  };

  // End auction: pick winner (highest random bid), set refund data, show results
  const endAuction = (auctionId) => {
    const auction = auctions.find(a => a.id === auctionId);
    if (!auction) return;

    // Simulate bids for each participant (random amounts above minBid)
    const minB = parseFloat(auction.minBid) || 0.00001;
    const simulatedBids = auction.participants.map(p => ({
      ...p,
      bidAmount: parseFloat((minB + Math.random() * 0.05).toFixed(5)),
    }));

    // Sort by bid descending, pick winner
    simulatedBids.sort((a, b) => b.bidAmount - a.bidAmount);
    const winner = simulatedBids.length > 0 ? simulatedBids[0] : null;
    const losers = simulatedBids.slice(1);

    updateAuction(auctionId, {
      status: 'ended',
      endedAt: Date.now(),
      winner: winner,
      results: simulatedBids,
      losers: losers,
    });

    setShowWinner(true);
    setView('results');

    // Start automatic refund process for losers
    if (losers.length > 0) {
      const progress = {};
      losers.forEach((_, i) => { progress[i] = 'pending'; });
      setRefundProgress(progress);

      // Refund each loser one by one with delay
      losers.forEach((_, i) => {
        setTimeout(() => {
          setRefundProgress(prev => ({ ...prev, [i]: 'refunding' }));
          setTimeout(() => {
            setRefundProgress(prev => ({ ...prev, [i]: 'refunded' }));
          }, 1500);
        }, i * 2500 + 500);
      });
    }
  };

  const handleDeleteAuction = (auctionId) => {
    deleteAuction(auctionId);
    setSelectedAuctionId(null);
    setView('list');
  };

  // Confetti
  useEffect(() => {
    if (!showWinner || !confettiRef.current) return;
    const canvas = confettiRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = 500; canvas.height = 350;
    let pieces = [];
    for (let i = 0; i < 100; i++) {
      pieces.push({ x:250,y:175,vx:(Math.random()-0.5)*14,vy:(Math.random()-0.5)*14-5,s:Math.random()*6+3,c:['#6366f1','#ec4899','#10b981','#f59e0b','#8b5cf6'][Math.floor(Math.random()*5)],r:Math.random()*360,rs:(Math.random()-0.5)*10 });
    }
    let fid;
    const draw = () => {
      ctx.clearRect(0,0,500,350);
      pieces.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.15;p.r+=p.rs;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.r*Math.PI/180);ctx.fillStyle=p.c;ctx.fillRect(-p.s/2,-p.s/2,p.s,p.s*0.6);ctx.restore();});
      fid=requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(fid);
  }, [showWinner]);

  const activeAuction = auctions.find(a => a.id === selectedAuctionId);

  return (
    <div className="dashboard-container">
      {/* Winner Popup */}
      {showWinner && activeAuction?.winner && (
        <div className="popup-overlay" onClick={() => setShowWinner(false)}>
          <div className="popup-content glass-card" onClick={e => e.stopPropagation()}>
            <canvas ref={confettiRef} className="confetti-canvas" />
            <div className="popup-body">
              <div className="trophy-icon">🏆</div>
              <h2>We Have a Winner!</h2>
              <p className="winner-address">{activeAuction.winner.name}</p>
              <p className="winner-bid-amount">{activeAuction.winner.bidAmount} ETH</p>
              <p className="winner-sub">Losers are being refunded automatically.</p>
              <button className="btn primary-btn" onClick={() => setShowWinner(false)}>View Results</button>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="navbar glass-nav">
        <div className="nav-brand">
          <span className="brand-icon">🛡️</span>
          <h2>Sealed Auction</h2>
          <span className="role-badge creator-badge">Creator</span>
        </div>
        <div className="nav-actions">
          <span className="user-greeting">Hi, {user.name}</span>
          <ConnectWallet onConnect={handleConnect} />
          <button className="btn ghost-btn" onClick={() => {
            if (view === 'manage' || view === 'create' || view === 'results') { setView('list'); }
            else { onBack(); }
          }}>← Back</button>
        </div>
      </nav>

      <main className="main-content">
        {/* Tab Bar */}
        <div className="tab-bar">
          <button className={`tab-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>📋 My Auctions</button>
          <button className={`tab-btn ${view === 'create' ? 'active' : ''}`} onClick={() => setView('create')}>➕ Create New</button>
          {activeAuction && activeAuction.status !== 'ended' && (
            <button className={`tab-btn ${view === 'manage' ? 'active' : ''}`} onClick={() => setView('manage')}>⚙️ Manage</button>
          )}
          {activeAuction && activeAuction.status === 'ended' && (
            <button className={`tab-btn ${view === 'results' ? 'active' : ''}`} onClick={() => setView('results')}>🏆 Results</button>
          )}
        </div>

        {/* ── CREATE VIEW ── */}
        {view === 'create' && (
          <section className="glass-card fade-in" style={{ maxWidth: 600, margin: '0 auto' }}>
            <h3>Create New Auction</h3>
            <p className="subtitle" style={{ marginBottom: '1.5rem' }}>Set up a sealed-bid auction. Share the generated code with participants.</p>
            <CreateAuctionForm onCreated={handleAuctionCreated} />
          </section>
        )}

        {/* ── LIST VIEW ── */}
        {view === 'list' && (
          <section className="fade-in">
            {auctions.length === 0 ? (
              <div className="glass-card empty-state">
                <div className="empty-icon">📦</div>
                <h3>No Auctions Yet</h3>
                <p>Create your first sealed auction to get started.</p>
                <button className="btn primary-btn" onClick={() => setView('create')}>Create Auction</button>
              </div>
            ) : (
              <div className="auction-grid">
                {auctions.map(a => (
                  <div key={a.id} className="glass-card auction-card" onClick={() => {
                    setSelectedAuctionId(a.id);
                    setView(a.status === 'ended' ? 'results' : 'manage');
                  }}>
                    <img src={a.imageUrl} alt={a.title} className="auction-card-img" />
                    <div className="auction-card-body">
                      <h4>{a.title}</h4>
                      <div className="auction-card-meta">
                        <span className={`status-pill ${a.status}`}>{a.status.toUpperCase()}</span>
                        <span className="auction-code-small">{a.code}</span>
                      </div>
                      <p className="auction-card-desc">{a.description.slice(0, 80)}...</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── MANAGE VIEW ── */}
        {view === 'manage' && activeAuction && activeAuction.status !== 'ended' && (
          <section className="fade-in">
            <div className="manage-grid">
              <div className="glass-card no-pad">
                <img src={activeAuction.imageUrl} alt={activeAuction.title} className="manage-img" />
                <div style={{ padding: '1.5rem 2rem 2rem' }}>
                  <h3>{activeAuction.title}</h3>
                  <p className="description">{activeAuction.description}</p>
                  <div className="auction-stats">
                    <div className="stat-box"><span className="stat-label">Status</span><span className={`stat-value phase-${activeAuction.status}`}>{activeAuction.status.toUpperCase()}</span></div>
                    <div className="stat-box"><span className="stat-label">Min Bid</span><span className="stat-value">{activeAuction.minBid} ETH</span></div>
                    <div className="stat-box"><span className="stat-label">Bidders</span><span className="stat-value">{activeAuction.participants.length}</span></div>
                  </div>
                  <div className="code-display glass-card">
                    <span className="stat-label">Share This Auction Code</span>
                    <span className="big-code">{activeAuction.code}</span>
                  </div>
                </div>
              </div>
              <div className="manage-controls">
                <div className="glass-card">
                  <h4>Auction Controls</h4>
                  {activeAuction.status === 'draft' && (
                    <button className="btn primary-btn full-width" style={{ marginTop: '1rem' }} onClick={() => startAuction(activeAuction.id)}>🚀 Start Auction (Open Commit Phase)</button>
                  )}
                  {activeAuction.status === 'commit' && (
                    <button className="btn secondary-btn full-width" style={{ marginTop: '1rem' }} onClick={() => switchToReveal(activeAuction.id)}>🔑 Close Commits & Open Reveal Phase</button>
                  )}
                  {activeAuction.status === 'reveal' && (
                    <button className="btn secondary-btn full-width" style={{ marginTop: '1rem' }} onClick={() => endAuction(activeAuction.id)}>🏆 End Auction & Announce Winner</button>
                  )}
                </div>
                <div className="glass-card">
                  <h4><span className="live-dot"></span> Participants ({activeAuction.participants.length})</h4>
                  {activeAuction.participants.length > 0 ? (
                    <ul className="participant-list">
                      {activeAuction.participants.map((p, i) => (
                        <li key={i} className="participant-item">
                          <span className="participant-avatar" style={{ background: p.color }}>{p.name[0]}</span>
                          <div className="participant-info"><span className="participant-name">{p.name}</span><span className="participant-status">{p.status}</span></div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted" style={{ marginTop: '0.75rem' }}>No participants yet. Share the code!</p>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════ */}
        {/*            RESULTS DASHBOARD               */}
        {/* ══════════════════════════════════════════ */}
        {view === 'results' && activeAuction && activeAuction.status === 'ended' && (
          <section className="fade-in">
            <div className="results-dashboard">
              {/* Winner Card */}
              <div className="glass-card results-winner-card">
                <div className="results-winner-header">
                  <span className="results-trophy">🏆</span>
                  <div>
                    <h3>Winner</h3>
                    <p className="text-muted">{activeAuction.title}</p>
                  </div>
                </div>
                {activeAuction.winner ? (
                  <div className="results-winner-body">
                    <div className="winner-avatar-lg" style={{ background: activeAuction.winner.color }}>
                      {activeAuction.winner.name[0]}
                    </div>
                    <h2 className="winner-name-lg">{activeAuction.winner.name}</h2>
                    <div className="winner-bid-display">
                      <span className="bid-label">Winning Bid</span>
                      <span className="bid-value">{activeAuction.winner.bidAmount} ETH</span>
                    </div>
                    <div className="results-stats-row">
                      <div className="result-stat">
                        <span className="result-stat-num">{activeAuction.participants.length}</span>
                        <span className="result-stat-label">Total Bidders</span>
                      </div>
                      <div className="result-stat">
                        <span className="result-stat-num">{activeAuction.winner.bidAmount} ETH</span>
                        <span className="result-stat-label">Your Earnings</span>
                      </div>
                      <div className="result-stat">
                        <span className="result-stat-num">{(activeAuction.losers || []).length}</span>
                        <span className="result-stat-label">Refunded</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>No participants bid in this auction.</p>
                )}
              </div>

              {/* All Bids & Refunds */}
              <div className="glass-card results-bids-card">
                <h4>All Bids & Refund Status</h4>
                <p className="text-muted" style={{ marginBottom: '1rem' }}>Losers' deposits are automatically returned to their MetaMask wallets.</p>
                {activeAuction.results && activeAuction.results.length > 0 ? (
                  <ul className="results-bid-list">
                    {activeAuction.results.map((p, i) => {
                      const isWinner = i === 0;
                      const loserIdx = i - 1;
                      const refundStatus = isWinner ? 'kept' : (refundProgress[loserIdx] || 'refunded');
                      return (
                        <li key={i} className={`results-bid-item ${isWinner ? 'winner-row' : ''}`}>
                          <div className="bid-item-left">
                            <span className="participant-avatar" style={{ background: p.color }}>{p.name[0]}</span>
                            <div className="participant-info">
                              <span className="participant-name">{p.name} {isWinner && <span className="winner-tag">WINNER</span>}</span>
                              <span className="participant-status">{p.address ? `${p.address.slice(0, 8)}...${p.address.slice(-4)}` : 'No wallet'}</span>
                            </div>
                          </div>
                          <div className="bid-item-right">
                            <span className="bid-amount">{p.bidAmount} ETH</span>
                            {isWinner ? (
                              <span className="refund-status kept">💰 Kept by Creator</span>
                            ) : refundStatus === 'pending' ? (
                              <span className="refund-status pending">⏳ Pending</span>
                            ) : refundStatus === 'refunding' ? (
                              <span className="refund-status refunding">🔄 Refunding...</span>
                            ) : (
                              <span className="refund-status refunded">✅ Refunded</span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-muted">No bids were placed.</p>
                )}

                {/* Delete button */}
                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                  <button className="btn ghost-btn full-width" onClick={() => handleDeleteAuction(activeAuction.id)}>🗑️ Delete Auction</button>
                  <button className="btn primary-btn full-width" onClick={() => setView('list')}>← Back to List</button>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        <p>Powered by <strong>Ethereum</strong> Smart Contracts &nbsp;·&nbsp; Built for Web3</p>
      </footer>
    </div>
  );
};

export default CreatorDashboard;

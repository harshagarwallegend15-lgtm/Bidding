import React, { useState, useRef, useEffect } from 'react';
import ConnectWallet from './ConnectWallet';
import CommitForm from './CommitForm';
import RevealForm from './RevealForm';

/* Countdown Timer */
const CountdownTimer = ({ deadline, label }) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.max(0, deadline - Date.now());
      setTimeLeft({
        hours: Math.floor(diff / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline]);
  const pad = (n) => String(n).padStart(2, '0');
  return (
    <div className="countdown-widget">
      <span className="countdown-label">{label}</span>
      <div className="countdown-digits">
        <div className="digit-box"><span className="digit">{pad(timeLeft.hours)}</span><span className="digit-label">HRS</span></div>
        <span className="digit-sep">:</span>
        <div className="digit-box"><span className="digit">{pad(timeLeft.minutes)}</span><span className="digit-label">MIN</span></div>
        <span className="digit-sep">:</span>
        <div className="digit-box"><span className="digit">{pad(timeLeft.seconds)}</span><span className="digit-label">SEC</span></div>
      </div>
    </div>
  );
};

const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e'];

const BidderDashboard = ({ user, onLogout, findAuctionByCode, addParticipant, auctions }) => {
  const [provider, setProvider] = useState(null);
  const [userAccount, setUserAccount] = useState(null);
  const [auctionCode, setAuctionCode] = useState('');
  const [joinedAuctionId, setJoinedAuctionId] = useState(null);
  const [joinError, setJoinError] = useState('');
  const [showWinner, setShowWinner] = useState(false);
  const confettiRef = useRef(null);

  // Live reference to the auction from shared state
  const joinedAuction = joinedAuctionId ? auctions.find(a => a.id === joinedAuctionId) : null;

  // Watch for auction ending to show winner popup
  useEffect(() => {
    if (joinedAuction && joinedAuction.status === 'ended' && !showWinner) {
      setShowWinner(true);
    }
  }, [joinedAuction?.status]);

  const handleConnect = (account, ethProvider) => {
    setUserAccount(account);
    setProvider(ethProvider);

    // If already joined an auction, register as participant
    if (joinedAuctionId) {
      addParticipant(joinedAuctionId, {
        name: user.name,
        address: account,
        status: 'Connected',
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    }
  };

  const handleJoin = (e) => {
    e.preventDefault();
    setJoinError('');
    const code = auctionCode.trim();
    if (code.length < 4) {
      setJoinError('Invalid auction code. Must be at least 4 characters.');
      return;
    }
    const found = findAuctionByCode(code);
    if (!found) {
      setJoinError('No auction found with that code. Please check and try again.');
      return;
    }
    if (found.status === 'draft') {
      setJoinError('This auction has not started yet. Please wait for the creator to start it.');
      return;
    }

    setJoinedAuctionId(found.id);

    // If wallet already connected, add participant
    if (userAccount) {
      addParticipant(found.id, {
        name: user.name,
        address: userAccount,
        status: 'Connected',
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    }
  };

  // Confetti
  useEffect(() => {
    if (!showWinner || !confettiRef.current) return;
    const canvas = confettiRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = 500; canvas.height = 350;
    let pieces = [];
    for (let i = 0; i < 100; i++) pieces.push({ x:250,y:175,vx:(Math.random()-0.5)*14,vy:(Math.random()-0.5)*14-5,s:Math.random()*6+3,c:['#6366f1','#ec4899','#10b981','#f59e0b','#8b5cf6'][Math.floor(Math.random()*5)],r:Math.random()*360,rs:(Math.random()-0.5)*10 });
    let fid;
    const draw = () => { ctx.clearRect(0,0,500,350); pieces.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.15;p.r+=p.rs;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.r*Math.PI/180);ctx.fillStyle=p.c;ctx.fillRect(-p.s/2,-p.s/2,p.s,p.s*0.6);ctx.restore();}); fid=requestAnimationFrame(draw); };
    draw();
    return () => cancelAnimationFrame(fid);
  }, [showWinner]);

  /* ── JOIN SCREEN ── */
  if (!joinedAuction) {
    return (
      <div className="dashboard-container">
        <nav className="navbar glass-nav">
          <div className="nav-brand"><span className="brand-icon">🛡️</span><h2>Sealed Auction</h2><span className="role-badge bidder-badge">Bidder</span></div>
          <div className="nav-actions">
            <span className="user-greeting">Hi, {user.name}</span>
            <button className="btn ghost-btn" onClick={onLogout}>← Back</button>
          </div>
        </nav>
        <main className="main-content">
          <div className="join-container fade-in">
            <div className="glass-card join-box">
              <div className="logo-glow"></div>
              <h2>Join an Auction</h2>
              <p className="subtitle">Enter the auction code shared by the creator to participate.</p>
              <form onSubmit={handleJoin}>
                <div className="input-group">
                  <label htmlFor="joinCode">Auction Code</label>
                  <input id="joinCode" type="text" placeholder="e.g. X7K3M9QP" value={auctionCode} onChange={e => setAuctionCode(e.target.value)} required />
                </div>
                <button type="submit" className="btn primary-btn full-width">Join Auction Room</button>
                {joinError && <p className="error-text center">{joinError}</p>}
              </form>
            </div>
          </div>
        </main>
        <footer className="footer"><p>Powered by <strong>Ethereum</strong> Smart Contracts</p></footer>
      </div>
    );
  }

  /* ── AUCTION ROOM ── */
  const phase = joinedAuction.status; // 'commit' | 'reveal' | 'ended'

  return (
    <div className="dashboard-container">
      {showWinner && (
        <div className="popup-overlay" onClick={() => setShowWinner(false)}>
          <div className="popup-content glass-card" onClick={e => e.stopPropagation()}>
            <canvas ref={confettiRef} className="confetti-canvas" />
            <div className="popup-body">
              <div className="trophy-icon">🏆</div>
              <h2>We Have a Winner!</h2>
              <p className="winner-sub">The highest sealed bid has been verified on-chain. Losers get refunded automatically.</p>
              <button className="btn primary-btn" onClick={() => setShowWinner(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <nav className="navbar glass-nav">
        <div className="nav-brand"><span className="brand-icon">🛡️</span><h2>Sealed Auction</h2><span className="role-badge bidder-badge">Bidder</span></div>
        <div className="nav-actions">
          <div className="auction-code-badge">{joinedAuction.code}</div>
          <ConnectWallet onConnect={handleConnect} />
          <button className="btn ghost-btn" onClick={onLogout}>← Back</button>
        </div>
      </nav>

      <main className="main-content">
        {/* Phase Bar */}
        <section className="phase-bar fade-in">
          <div className="phase-indicator">
            <div className={`phase-step ${phase === 'commit' ? 'active' : 'done'}`}><span className="phase-dot"></span><span>Commit</span></div>
            <div className="phase-line"></div>
            <div className={`phase-step ${phase === 'reveal' ? 'active' : (phase === 'ended' ? 'done' : '')}`}><span className="phase-dot"></span><span>Reveal</span></div>
            <div className="phase-line"></div>
            <div className={`phase-step ${phase === 'ended' ? 'active' : ''}`}><span className="phase-dot"></span><span>Winner</span></div>
          </div>
          {joinedAuction.commitDeadline && phase !== 'ended' && (
            <CountdownTimer
              deadline={phase === 'commit' ? joinedAuction.commitDeadline : joinedAuction.revealDeadline}
              label={phase === 'commit' ? 'Commit Phase Ends In' : 'Reveal Phase Ends In'}
            />
          )}
        </section>

        <div className="grid-container fade-in-delay">
          {/* Product — real auction data */}
          <section className="product-section glass-card no-pad">
            <div className="product-image-container">
              <img src={joinedAuction.imageUrl} alt={joinedAuction.title} className="product-image" />
              <div className="image-overlay">
                <span className={`live-badge ${phase === 'ended' ? 'ended-badge' : ''}`}>
                  {phase === 'ended' ? 'ENDED' : 'LIVE AUCTION'}
                </span>
              </div>
            </div>
            <div className="product-details">
              <h2>{joinedAuction.title}</h2>
              <p className="description">{joinedAuction.description}</p>
              <div className="auction-stats">
                <div className="stat-box"><span className="stat-label">Current Phase</span><span className={`stat-value phase-${phase}`}>{phase.toUpperCase()}</span></div>
                <div className="stat-box"><span className="stat-label">Currency</span><span className="stat-value">ETH (Ξ)</span></div>
                <div className="stat-box"><span className="stat-label">Min Bid</span><span className="stat-value">{joinedAuction.minBid} ETH</span></div>
              </div>
            </div>
          </section>

          {/* Right */}
          <div className="right-column">
            <section className="bidding-section">
              {!userAccount ? (
                <div className="glass-card connect-prompt">
                  <div className="lock-icon">🔒</div>
                  <h3>Wallet Required</h3>
                  <p>Connect your MetaMask wallet to participate.</p>
                </div>
              ) : phase === 'commit' ? (
                <CommitForm provider={provider} isAuctionActive={true} />
              ) : phase === 'reveal' ? (
                <RevealForm provider={provider} isRevealActive={true} />
              ) : (
                <div className="glass-card connect-prompt">
                  <div className="lock-icon">🏆</div>
                  <h3>Auction Ended</h3>
                  {joinedAuction.winner ? (
                    <>
                      <p style={{ marginBottom: '0.5rem' }}>Winner: <strong>{joinedAuction.winner.name}</strong></p>
                      <p className="winner-bid-amount">{joinedAuction.winner.bidAmount} ETH</p>
                      {joinedAuction.winner.name === user.name ? (
                        <p style={{ color: 'var(--accent-success)', fontWeight: 600, marginTop: '0.5rem' }}>🎉 Congratulations! You won this auction!</p>
                      ) : (
                        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>✅ Your deposit has been automatically refunded to your wallet.</p>
                      )}
                    </>
                  ) : (
                    <p>The auction has ended. No winner was determined.</p>
                  )}
                </div>
              )}
            </section>

            {/* Real participants list */}
            <div className="glass-card">
              <h4><span className="live-dot"></span> Participants ({joinedAuction.participants.length})</h4>
              {joinedAuction.participants.length > 0 ? (
                <ul className="participant-list">
                  {joinedAuction.participants.map((p, i) => (
                    <li key={i} className="participant-item">
                      <span className="participant-avatar" style={{ background: p.color }}>{p.name[0]}</span>
                      <div className="participant-info"><span className="participant-name">{p.name}</span><span className="participant-status">{p.status}</span></div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted" style={{ marginTop: '0.75rem' }}>No participants yet.</p>
              )}
            </div>
          </div>
        </div>
      </main>
      <footer className="footer"><p>Powered by <strong>Ethereum</strong> Smart Contracts &nbsp;·&nbsp; Built for Web3</p></footer>
    </div>
  );
};

export default BidderDashboard;

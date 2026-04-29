import React, { useState, useEffect, useRef, useCallback } from 'react';
import CreatorDashboard from './components/CreatorDashboard';
import BidderDashboard from './components/BidderDashboard';
import BrowseAuctions from './components/BrowseAuctions';
import {
  isFirebaseConfigured,
  listenToAuctions, listenToUsers,
  saveAuctionsToCloud, saveUsersToCloud,
  saveOneAuction, updateOneAuction, deleteOneAuction,
  loadAuctionsFromCloud, loadUsersFromCloud,
} from './firebase';
import './index.css';

/* ─── LocalStorage fallback helpers ─── */
const STORAGE_KEY = 'sealed_auction_data';
const USERS_KEY = 'sealed_auction_users';

const loadLocal = () => { try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r); } catch(e){} return []; };
const saveLocal = (a) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(a)); } catch(e){} };
const loadLocalUsers = () => { try { const r = localStorage.getItem(USERS_KEY); if (r) return JSON.parse(r); } catch(e){} return []; };
const saveLocalUsers = (u) => { try { localStorage.setItem(USERS_KEY, JSON.stringify(u)); } catch(e){} };

const useCloud = isFirebaseConfigured();

/* ─── Particle Background ─── */
const ParticleCanvas = () => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animId, particles = [];
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    class P { constructor(){this.reset()} reset(){this.x=Math.random()*canvas.width;this.y=Math.random()*canvas.height;this.s=Math.random()*2+0.5;this.sx=(Math.random()-0.5)*0.3;this.sy=(Math.random()-0.5)*0.3;this.o=Math.random()*0.5+0.1;this.h=Math.random()>0.5?240:280} update(){this.x+=this.sx;this.y+=this.sy;if(this.x<0||this.x>canvas.width||this.y<0||this.y>canvas.height)this.reset()} draw(){ctx.beginPath();ctx.arc(this.x,this.y,this.s,0,Math.PI*2);ctx.fillStyle=`hsla(${this.h},80%,70%,${this.o})`;ctx.fill()} }
    for(let i=0;i<80;i++) particles.push(new P());
    const anim = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      particles.forEach(p=>{p.update();p.draw()});
      for(let i=0;i<particles.length;i++) for(let j=i+1;j<particles.length;j++){const dx=particles[i].x-particles[j].x,dy=particles[i].y-particles[j].y,d=Math.sqrt(dx*dx+dy*dy);if(d<120){ctx.beginPath();ctx.strokeStyle=`rgba(99,102,241,${0.08*(1-d/120)})`;ctx.lineWidth=0.5;ctx.moveTo(particles[i].x,particles[i].y);ctx.lineTo(particles[j].x,particles[j].y);ctx.stroke()}}
      animId = requestAnimationFrame(anim);
    };
    anim();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} className="particle-canvas" />;
};

/* ─── How It Works ─── */
const HowItWorks = () => {
  const steps = [
    { icon: '✉️', title: 'Create Secret Envelope', desc: 'Enter your bid and a secret password. Your bid is cryptographically hashed.' },
    { icon: '🔒', title: 'Lock & Deposit ETH', desc: 'Your hashed bid is sent on-chain with your ETH deposit.' },
    { icon: '🔑', title: 'Reveal Your Bid', desc: 'After commit phase ends, reveal your bid using the same password.' },
    { icon: '🏆', title: 'Winner Announced', desc: 'Highest bid wins! Losers get deposits refunded automatically.' },
  ];
  return (
    <section className="how-it-works">
      <h2 className="section-title">How Sealed Bidding Works</h2>
      <div className="steps-grid">
        {steps.map((s, i) => (
          <div key={i} className="step-card glass-card" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="step-number">{i + 1}</div>
            <div className="step-icon">{s.icon}</div>
            <h4>{s.title}</h4>
            <p>{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

/* ═══════════════════════════════════════════ */
/*                  MAIN APP                   */
/* ═══════════════════════════════════════════ */
function App() {
  // ══════ NAVIGATION WITH HISTORY ══════
  const [page, setPageRaw] = useState('home');
  const [pageHistory, setPageHistory] = useState([]);
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('signup');
  const [syncStatus, setSyncStatus] = useState(useCloud ? 'connecting' : 'local'); // 'local' | 'connecting' | 'synced'

  const navigateTo = useCallback((newPage) => {
    setPageRaw(prev => { setPageHistory(h => [...h, prev]); return newPage; });
  }, []);

  const goBack = useCallback(() => {
    setPageHistory(prev => {
      if (prev.length === 0) { setPageRaw('home'); return prev; }
      const history = [...prev];
      const lastPage = history.pop();
      setPageRaw(lastPage);
      return history;
    });
  }, []);

  // Sign-up / Login form state
  const [formName, setFormName] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // ══════ STATE (Cloud or Local) ══════
  const [auctions, setAuctions] = useState(() => loadLocal());
  const [registeredUsers, setRegisteredUsers] = useState(() => loadLocalUsers());
  const isListeningRef = useRef(false);

  // ── FIREBASE REAL-TIME SYNC ──
  // When Firebase is configured, listen for real-time changes from ALL devices.
  // This means if Laptop A creates an auction, Laptop B sees it INSTANTLY.
  useEffect(() => {
    if (!useCloud || isListeningRef.current) return;
    isListeningRef.current = true;

    const unsubAuctions = listenToAuctions((cloudAuctions) => {
      setAuctions(cloudAuctions);
      saveLocal(cloudAuctions); // keep local copy as backup
      setSyncStatus('synced');
    });

    const unsubUsers = listenToUsers((cloudUsers) => {
      setRegisteredUsers(cloudUsers);
      saveLocalUsers(cloudUsers);
    });

    return () => {
      if (typeof unsubAuctions === 'function') unsubAuctions();
      if (typeof unsubUsers === 'function') unsubUsers();
      isListeningRef.current = false;
    };
  }, []);

  // ── LOCAL-ONLY FALLBACK (when Firebase not configured) ──
  useEffect(() => {
    if (useCloud) return;
    saveLocal(auctions);
  }, [auctions]);

  useEffect(() => {
    if (useCloud) return;
    saveLocalUsers(registeredUsers);
  }, [registeredUsers]);

  // Cross-tab sync for local mode
  useEffect(() => {
    if (useCloud) return;
    const handler = (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try { setAuctions(JSON.parse(e.newValue)); } catch(err){}
      }
      if (e.key === USERS_KEY && e.newValue) {
        try { setRegisteredUsers(JSON.parse(e.newValue)); } catch(err){}
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // ══════ AUCTION OPERATIONS (sync to cloud automatically) ══════
  const addAuction = (auction) => {
    setAuctions(prev => [...prev, auction]);
    if (useCloud) saveOneAuction(auction);
    else saveLocal([...auctions, auction]);
  };

  const updateAuction = (auctionId, updates) => {
    setAuctions(prev => prev.map(a => a.id === auctionId ? { ...a, ...updates } : a));
    if (useCloud) updateOneAuction(auctionId, updates);
  };

  const findAuctionByCode = (code) => {
    return auctions.find(a => a.code.toUpperCase() === code.toUpperCase());
  };

  const addParticipant = (auctionId, participant) => {
    setAuctions(prev => {
      const updated = prev.map(a => {
        if (a.id === auctionId) {
          const exists = a.participants.some(p => p.name === participant.name && p.address === participant.address);
          if (exists) return a;
          const newA = { ...a, participants: [...a.participants, participant] };
          if (useCloud) saveOneAuction(newA);
          return newA;
        }
        return a;
      });
      return updated;
    });
  };

  const deleteAuction = (auctionId) => {
    setAuctions(prev => prev.filter(a => a.id !== auctionId));
    if (useCloud) deleteOneAuction(auctionId);
  };

  // Auto-delete ended auctions after 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setAuctions(prev => {
        const now = Date.now();
        const filtered = prev.filter(a => {
          if (a.status === 'ended' && a.endedAt && (now - a.endedAt > 60000)) {
            if (useCloud) deleteOneAuction(a.id);
            return false;
          }
          return true;
        });
        return filtered;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // ══════ AUTH HANDLERS ══════
  const handleSignup = (e) => {
    e.preventDefault();
    setFormError('');
    if (!formName.trim()) { setFormError('Please enter your name.'); return; }
    if (!formPassword || formPassword.length < 4) { setFormError('Password must be at least 4 characters.'); return; }
    if (!formRole) { setFormError('Please select a role.'); return; }
    const exists = registeredUsers.find(u => u.name.toLowerCase() === formName.trim().toLowerCase());
    if (exists) { setFormError('That name is already taken. Try logging in or use a different name.'); return; }
    const newUser = { name: formName.trim(), password: formPassword, role: formRole };
    const newUsers = [...registeredUsers, newUser];
    setRegisteredUsers(newUsers);
    if (useCloud) saveUsersToCloud(newUsers);
    setUser(newUser);
    navigateTo(formRole);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setFormError('');
    if (!formName.trim()) { setFormError('Please enter your name.'); return; }
    if (!formPassword) { setFormError('Please enter your password.'); return; }
    const found = registeredUsers.find(
      u => u.name.toLowerCase() === formName.trim().toLowerCase() && u.password === formPassword
    );
    if (!found) { setFormError('Invalid name or password.'); return; }
    setUser(found);
    navigateTo(found.role);
  };

  const handleLogout = () => {
    setUser(null);
    setPageRaw('home');
    setPageHistory([]);
    setFormName(''); setFormPassword(''); setFormRole(''); setFormError('');
  };

  const handleBrowseJoin = (auction) => {
    if (!user) { setFormRole('bidder'); navigateTo('auth'); }
    else { navigateTo('bidder'); }
  };

  const goToAuth = (mode, role = '') => {
    setAuthMode(mode); setFormRole(role); setFormError('');
    setFormName(''); setFormPassword(''); setShowPassword(false);
    navigateTo('auth');
  };

  // Sync status indicator
  const SyncBadge = () => {
    if (!useCloud) return <span className="sync-badge local" title="Local mode — data stays on this browser only">💾 Local</span>;
    if (syncStatus === 'connecting') return <span className="sync-badge connecting">🔄 Connecting...</span>;
    return <span className="sync-badge synced" title="Real-time sync active across all devices">☁️ Synced</span>;
  };

  /* ── HOME PAGE ── */
  if (page === 'home') {
    return (
      <div className="home-container">
        <ParticleCanvas />
        <nav className="hero-nav">
          <div className="nav-brand"><span className="brand-icon">🛡️</span><h2>Sealed Auction</h2><SyncBadge /></div>
          <div className="nav-actions">
            <button className="btn ghost-btn" onClick={() => navigateTo('browse')}>Browse Auctions</button>
            <button className="btn ghost-btn" onClick={() => goToAuth('login')}>Log In</button>
            <button className="btn primary-btn" onClick={() => goToAuth('signup')}>Sign Up</button>
          </div>
        </nav>
        <section className="hero fade-in">
          <div className="hero-content">
            <span className="hero-tag">Web3 · Ethereum · Commit-Reveal</span>
            <h1>The Un-Peekable<br/>Bidding Platform</h1>
            <p className="hero-desc">No more front-running. No more peeking. Our sealed auction uses cryptographic commit-reveal to ensure every bid is truly private. Fair, transparent, and powered by smart contracts.</p>
            <div className="hero-buttons">
              <button className="btn primary-btn btn-lg pulse-effect" onClick={() => goToAuth('signup', 'creator')}>🎨 Create an Auction</button>
              <button className="btn secondary-btn btn-lg" onClick={() => goToAuth('signup', 'bidder')}>🏷️ Join as Bidder</button>
            </div>
            <div className="hero-stats">
              <div className="hero-stat"><span className="hero-stat-num">{auctions.length}</span><span className="hero-stat-label">Auctions</span></div>
              <div className="hero-stat"><span className="hero-stat-num">ETH</span><span className="hero-stat-label">On-Chain</span></div>
              <div className="hero-stat"><span className="hero-stat-num">Auto</span><span className="hero-stat-label">Refunds</span></div>
            </div>
          </div>
          <div className="hero-visual"><img src="/product.png" alt="Digital Collectible" className="hero-img" /></div>
        </section>
        {auctions.length > 0 && (
          <section className="home-auctions-preview">
            <div className="preview-header">
              <h2 className="section-title">Recent Auctions</h2>
              <button className="btn ghost-btn" onClick={() => navigateTo('browse')}>View All →</button>
            </div>
            <div className="auction-grid">
              {auctions.slice(-3).reverse().map(a => (
                <div key={a.id} className="glass-card auction-card" onClick={() => navigateTo('browse')}>
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
          </section>
        )}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 2rem 4rem' }}><HowItWorks /></div>
        <section className="features-section">
          <div className="features-grid">
            <div className="feature-card glass-card"><div className="feature-icon">🔐</div><h3>Sealed Bids</h3><p>Your bid is hashed with a secret password. No one can see it until reveal.</p></div>
            <div className="feature-card glass-card"><div className="feature-icon">⛓️</div><h3>On-Chain Security</h3><p>Every commit and reveal is recorded on Ethereum. Immutable and verifiable.</p></div>
            <div className="feature-card glass-card"><div className="feature-icon">💰</div><h3>Automatic Refunds</h3><p>Lost the auction? Your ETH deposit is returned automatically.</p></div>
          </div>
        </section>
        <section className="cta-section">
          <div className="glass-card cta-card"><h2>Ready to Start?</h2><p>Create an auction or join one. It takes less than a minute.</p><button className="btn primary-btn btn-lg" onClick={() => goToAuth('signup')}>Sign Up Now</button></div>
        </section>
        <footer className="footer"><p>Powered by <strong>Ethereum</strong> Smart Contracts &nbsp;·&nbsp; Built for Web3</p></footer>
      </div>
    );
  }

  /* ── BROWSE AUCTIONS PAGE ── */
  if (page === 'browse') {
    return (
      <div className="home-container">
        <ParticleCanvas />
        <nav className="hero-nav">
          <div className="nav-brand"><span className="brand-icon">🛡️</span><h2>Sealed Auction</h2><SyncBadge /></div>
          <div className="nav-actions">
            <button className="btn ghost-btn" onClick={goBack}>← Back</button>
            <button className="btn primary-btn" onClick={() => goToAuth('signup')}>Get Started</button>
          </div>
        </nav>
        <main className="main-content"><BrowseAuctions auctions={auctions} onJoin={handleBrowseJoin} onBack={goBack} /></main>
        <footer className="footer"><p>Powered by <strong>Ethereum</strong> Smart Contracts &nbsp;·&nbsp; Built for Web3</p></footer>
      </div>
    );
  }

  /* ── AUTH PAGE ── */
  if (page === 'auth') {
    const isLogin = authMode === 'login';
    return (
      <div className="login-container">
        <ParticleCanvas />
        <div className="glass-card signup-box fade-in">
          <div className="logo-glow"></div>
          <div className="login-icon">🛡️</div>
          <h1>{isLogin ? 'Log In' : 'Sign Up'}</h1>
          <p className="subtitle">{isLogin ? 'Welcome back! Enter your credentials.' : 'Create your account to get started.'}</p>
          <div className="auth-toggle">
            <button className={`auth-toggle-btn ${!isLogin ? 'active' : ''}`} onClick={() => { setAuthMode('signup'); setFormError(''); }}>Sign Up</button>
            <button className={`auth-toggle-btn ${isLogin ? 'active' : ''}`} onClick={() => { setAuthMode('login'); setFormError(''); }}>Log In</button>
          </div>
          <form onSubmit={isLogin ? handleLogin : handleSignup}>
            <div className="input-group">
              <label htmlFor="authName">Your Name</label>
              <input id="authName" type="text" placeholder="e.g. John Doe" value={formName} onChange={e => setFormName(e.target.value)} required />
            </div>
            <div className="input-group">
              <label htmlFor="authPassword">Password</label>
              <div className="password-input-wrapper">
                <input id="authPassword" type={showPassword ? 'text' : 'password'} placeholder={isLogin ? 'Enter your password' : 'Create a password (min 4 chars)'} value={formPassword} onChange={e => setFormPassword(e.target.value)} required />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>{showPassword ? '🙈' : '👁️'}</button>
              </div>
            </div>
            {!isLogin && (
              <div className="role-selector">
                <div className={`role-card ${formRole === 'creator' ? 'selected' : ''}`} onClick={() => setFormRole('creator')}>
                  <div className="role-icon">🎨</div><h4>Auction Creator</h4><p>Create and manage sealed auctions.</p>
                </div>
                <div className={`role-card ${formRole === 'bidder' ? 'selected' : ''}`} onClick={() => setFormRole('bidder')}>
                  <div className="role-icon">🏷️</div><h4>Bidder</h4><p>Join auctions and place sealed bids.</p>
                </div>
              </div>
            )}
            <button type="submit" className="btn primary-btn full-width pulse-effect">
              {isLogin ? 'Log In' : `Sign Up as ${formRole === 'creator' ? 'Creator' : formRole === 'bidder' ? 'Bidder' : '...'}`}
            </button>
            {formError && <p className="error-text center">{formError}</p>}
          </form>
          <p className="auth-switch">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button className="link-btn" onClick={() => { setAuthMode(isLogin ? 'signup' : 'login'); setFormError(''); }}>{isLogin ? 'Sign Up' : 'Log In'}</button>
          </p>
          <button className="btn ghost-btn" style={{ marginTop: '0.5rem' }} onClick={goBack}>← Back</button>
        </div>
      </div>
    );
  }

  /* ── CREATOR DASHBOARD ── */
  if (page === 'creator' && user) {
    return (<><ParticleCanvas /><CreatorDashboard user={user} onBack={goBack} onLogout={handleLogout} auctions={auctions} addAuction={addAuction} updateAuction={updateAuction} deleteAuction={deleteAuction} /></>);
  }

  /* ── BIDDER DASHBOARD ── */
  if (page === 'bidder' && user) {
    return (<><ParticleCanvas /><BidderDashboard user={user} onBack={goBack} onLogout={handleLogout} findAuctionByCode={findAuctionByCode} addParticipant={addParticipant} auctions={auctions} /></>);
  }

  return null;
}

export default App;

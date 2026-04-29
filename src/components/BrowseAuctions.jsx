import React, { useState } from 'react';

const BrowseAuctions = ({ auctions, onJoin, onBack }) => {
  const [search, setSearch] = useState('');

  const filtered = auctions.filter(a => {
    const q = search.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.code.toLowerCase().includes(q)
    );
  });

  // Only show auctions that have been started (not drafts)
  const liveAuctions = filtered.filter(a => a.status !== 'draft');
  const draftAuctions = filtered.filter(a => a.status === 'draft');

  return (
    <div className="browse-container fade-in">
      <div className="browse-header">
        <div>
          <h2 className="browse-title">Browse All Auctions</h2>
          <p className="text-muted">{auctions.length} auction{auctions.length !== 1 ? 's' : ''} created so far</p>
        </div>
        {onBack && (
          <button className="btn ghost-btn" onClick={onBack}>← Back</button>
        )}
      </div>

      {/* Search Bar */}
      <div className="search-bar glass-card">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          id="auctionSearch"
          placeholder="Search by title, description, or auction code..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="search-input"
        />
        {search && (
          <button className="search-clear" onClick={() => setSearch('')}>✕</button>
        )}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="glass-card empty-state">
          <div className="empty-icon">🔎</div>
          <h3>{search ? 'No Matching Auctions' : 'No Auctions Yet'}</h3>
          <p>{search ? `No auctions match "${search}". Try a different search term.` : 'Be the first to create a sealed auction!'}</p>
        </div>
      ) : (
        <>
          {/* Live Auctions */}
          {liveAuctions.length > 0 && (
            <div className="browse-section">
              <h3 className="browse-section-title">
                <span className="live-dot"></span> Live & Active ({liveAuctions.length})
              </h3>
              <div className="auction-grid">
                {liveAuctions.map(a => (
                  <div key={a.id} className="glass-card auction-card" onClick={() => onJoin && onJoin(a)}>
                    <img src={a.imageUrl} alt={a.title} className="auction-card-img" />
                    <div className="auction-card-body">
                      <h4>{a.title}</h4>
                      <div className="auction-card-meta">
                        <span className={`status-pill ${a.status}`}>{a.status.toUpperCase()}</span>
                        <span className="auction-code-small">{a.code}</span>
                      </div>
                      <p className="auction-card-desc">{a.description.slice(0, 100)}{a.description.length > 100 ? '...' : ''}</p>
                      <div className="auction-card-footer">
                        <span className="card-stat">Min: {a.minBid} ETH</span>
                        <span className="card-stat">{a.participants?.length || 0} bidder{(a.participants?.length || 0) !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming / Draft */}
          {draftAuctions.length > 0 && (
            <div className="browse-section">
              <h3 className="browse-section-title">📋 Upcoming ({draftAuctions.length})</h3>
              <div className="auction-grid">
                {draftAuctions.map(a => (
                  <div key={a.id} className="glass-card auction-card auction-card-draft">
                    <img src={a.imageUrl} alt={a.title} className="auction-card-img" />
                    <div className="auction-card-body">
                      <h4>{a.title}</h4>
                      <div className="auction-card-meta">
                        <span className="status-pill draft">DRAFT</span>
                        <span className="auction-code-small">{a.code}</span>
                      </div>
                      <p className="auction-card-desc">{a.description.slice(0, 100)}{a.description.length > 100 ? '...' : ''}</p>
                      <p className="card-note">Not started yet — check back later!</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BrowseAuctions;

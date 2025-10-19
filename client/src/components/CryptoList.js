import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import CryptoTable from './CryptoTable';
import PriceChart from './PriceChart';
import CryptoDetail from './CryptoDetail';
import './CryptoList.css';

const CryptoList = () => {
  const [cryptos, setCryptos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCrypto, setSelectedCrypto] = useState(null);
  const [showCryptoDetail, setShowCryptoDetail] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('market_cap');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'

  useEffect(() => {
    fetchCryptos();
  }, []);

  const fetchCryptos = async () => {
    try {
      setLoading(true);
      // Use the working crypto endpoint with live CoinMarketCap data
      const response = await axios.get('/api/crypto');
      setCryptos(response.data);
    } catch (error) {
      console.error('Error fetching cryptocurrencies:', error);
      toast.error('Failed to load cryptocurrencies');
    } finally {
      setLoading(false);
    }
  };

  const handleForceUpdateAll = async () => {
    try {
      const response = await axios.post('/api/crypto/force-update-all');
      toast.success(`Force updated prices for ${response.data.updated_count} cryptocurrencies`);
      fetchCryptos(); // Refresh the list
    } catch (error) {
      console.error('Error force updating prices:', error);
      toast.error('Failed to force update prices');
    }
  };

  const handleCryptoSelect = (crypto) => {
    setSelectedCrypto(crypto);
    setShowCryptoDetail(true);
  };

  const handleCloseCryptoDetail = () => {
    setShowCryptoDetail(false);
    setSelectedCrypto(null);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const filteredAndSortedCryptos = cryptos
    .filter(crypto => 
      crypto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      crypto.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aValue = a[sortBy] || 0;
      let bValue = b[sortBy] || 0;
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="crypto-list">
      <div className="container">
        <div className="crypto-list-header">
          <h1 className="crypto-list-title">Market Overview</h1>
          <p className="crypto-list-subtitle">
            Top 15 cryptocurrencies by market cap - CoinMarketCap style data
          </p>
          <div className="crypto-list-actions">
            <button
              onClick={handleForceUpdateAll}
              className="btn btn-warning btn-sm"
            >
              🔄 Refresh Data
            </button>
          </div>
        </div>

        <div className="crypto-list-controls">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search cryptocurrencies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
            />
          </div>
          
          <div className="sort-container">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="form-input"
            >
              <option value="market_cap">Market Cap</option>
              <option value="current_price">Price</option>
              <option value="price_change_24h">24h Change</option>
              <option value="volume_24h">Volume</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="btn btn-secondary btn-sm"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>

            <div className="view-toggle">
              <button
                onClick={() => setViewMode('table')}
                className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Table
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`btn btn-sm ${viewMode === 'cards' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Cards
              </button>
            </div>
          </div>
        </div>

        <div className="crypto-list-content">
          <div className="crypto-table-section">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Market Overview</h2>
                <p className="card-subtitle">
                  {filteredAndSortedCryptos.length} cryptocurrencies
                </p>
              </div>
              {viewMode === 'table' ? (
                <CryptoTable 
                  cryptos={filteredAndSortedCryptos} 
                  onCryptoSelect={handleCryptoSelect}
                  showActions={true}
                />
              ) : (
                <div className="crypto-cards-grid">
                  {filteredAndSortedCryptos.map((crypto) => (
                    <div 
                      key={crypto.id} 
                      className="crypto-card"
                      onClick={() => handleCryptoSelect(crypto)}
                    >
                      <div className="crypto-card-header">
                        <div className="crypto-card-name">
                          <span className="crypto-card-symbol">{crypto.symbol}</span>
                          <span className="crypto-card-name-text">{crypto.name}</span>
                        </div>
                        <div className={`crypto-card-change ${crypto.price_change_24h >= 0 ? 'positive' : 'negative'}`}>
                          {crypto.price_change_24h >= 0 ? '+' : ''}{crypto.price_change_24h?.toFixed(2)}%
                        </div>
                      </div>
                      <div className="crypto-card-price">
                        ${crypto.current_price?.toLocaleString()}
                      </div>
                      <div className="crypto-card-details">
                        <div className="crypto-card-detail">
                          <span className="detail-label">Market Cap:</span>
                          <span className="detail-value">
                            {crypto.market_cap >= 1e12 ? `$${(crypto.market_cap / 1e12).toFixed(2)}T` :
                             crypto.market_cap >= 1e9 ? `$${(crypto.market_cap / 1e9).toFixed(2)}B` :
                             crypto.market_cap >= 1e6 ? `$${(crypto.market_cap / 1e6).toFixed(2)}M` :
                             `$${crypto.market_cap?.toLocaleString()}`}
                          </span>
                        </div>
                        <div className="crypto-card-detail">
                          <span className="detail-label">Volume:</span>
                          <span className="detail-value">
                            {crypto.volume_24h >= 1e12 ? `$${(crypto.volume_24h / 1e12).toFixed(2)}T` :
                             crypto.volume_24h >= 1e9 ? `$${(crypto.volume_24h / 1e9).toFixed(2)}B` :
                             crypto.volume_24h >= 1e6 ? `$${(crypto.volume_24h / 1e6).toFixed(2)}M` :
                             `$${crypto.volume_24h?.toLocaleString()}`}
                          </span>
                        </div>
                      </div>
                      <button 
                        className="btn btn-primary btn-sm crypto-card-action"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle add to portfolio
                        }}
                      >
                        Add to Portfolio
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedCrypto && (
            <div className="crypto-chart-section">
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">{selectedCrypto.symbol} Price Chart</h2>
                  <p className="card-subtitle">7-day price history</p>
                </div>
                <PriceChart symbol={selectedCrypto.symbol} />
              </div>
            </div>
          )}
        </div>
      </div>

      {showCryptoDetail && selectedCrypto && (
        <CryptoDetail 
          symbol={selectedCrypto.symbol} 
          onClose={handleCloseCryptoDetail}
        />
      )}
    </div>
  );
};

export default CryptoList;

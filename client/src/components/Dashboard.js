import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import PortfolioSummary from './PortfolioSummary';
import CryptoTable from './CryptoTable';
import PriceChart from './PriceChart';
import './Dashboard.css';

const Dashboard = () => {
  const [portfolioSummary, setPortfolioSummary] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [cryptos, setCryptos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCrypto, setSelectedCrypto] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch portfolio summary
      const summaryResponse = await axios.get('/api/portfolio/summary');
      setPortfolioSummary(summaryResponse.data);

      // Fetch portfolio
      const portfolioResponse = await axios.get('/api/portfolio');
      setPortfolio(portfolioResponse.data);

      // Fetch top cryptocurrencies
      const cryptoResponse = await axios.get('/api/crypto');
      setCryptos(cryptoResponse.data.slice(0, 10)); // Top 10

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleCryptoSelect = (crypto) => {
    setSelectedCrypto(crypto);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">
            Overview of your cryptocurrency portfolio
          </p>
        </div>

        {portfolioSummary && (
          <PortfolioSummary summary={portfolioSummary} />
        )}

        <div className="dashboard-grid">
          <div className="dashboard-section">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Your Portfolio</h2>
                <p className="card-subtitle">Your current holdings</p>
              </div>
              {portfolio.length > 0 ? (
                <div className="portfolio-list">
                  {portfolio.map((item) => (
                    <div key={item.id} className="portfolio-item">
                      <div className="portfolio-item-header">
                        <div className="crypto-info">
                          <span className="crypto-symbol">{item.symbol}</span>
                          <span className="crypto-name">{item.name}</span>
                        </div>
                        <span className="crypto-value">
                          ${item.current_value && !isNaN(Number(item.current_value)) ? Number(item.current_value).toLocaleString() : '0'}
                        </span>
                      </div>
                      <div className="portfolio-item-details">
                        <div className="detail">
                          <span className="detail-label">{item.symbol} Holdings:</span>
                          <span className="detail-value">{(Number(item.amount) || 0).toFixed(8)} {item.symbol}</span>
                        </div>
                        <div className="detail">
                          <span className="detail-label">Avg Price:</span>
                          <span className="detail-value">${item.purchase_price && !isNaN(Number(item.purchase_price)) ? Number(item.purchase_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</span>
                        </div>
                        <div className="detail">
                          <span className="detail-label">Current Price:</span>
                          <span className="detail-value">${item.current_price && !isNaN(Number(item.current_price)) ? Number(item.current_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</span>
                        </div>
                        <div className="detail">
                          <span className="detail-label">P&L:</span>
                          <span className={`detail-value ${item.profit_loss >= 0 ? 'text-green' : 'text-red'}`}>
                            {item.profit_loss >= 0 ? '+' : ''}${item.profit_loss && !isNaN(Number(item.profit_loss)) ? Number(item.profit_loss).toFixed(2) : '0.00'} 
                            ({item.profit_loss_percentage && !isNaN(Number(item.profit_loss_percentage)) ? Number(item.profit_loss_percentage).toFixed(2) : '0.00'}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <p>No cryptocurrencies in your portfolio yet.</p>
                  <a href="/add-crypto" className="btn btn-primary">
                    Add Your First Crypto
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="dashboard-section">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Top Cryptocurrencies</h2>
                <p className="card-subtitle">Current market prices</p>
              </div>
              <CryptoTable 
                cryptos={cryptos} 
                onCryptoSelect={handleCryptoSelect}
                showActions={false}
              />
            </div>
          </div>
        </div>

        {selectedCrypto && (
          <div className="dashboard-section">
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
  );
};

export default Dashboard;

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import PortfolioSummary from './PortfolioSummary';
import ConfirmationModal from './ConfirmationModal';
import './Portfolio.css';

const Portfolio = () => {
  const [portfolio, setPortfolio] = useState([]);
  const [portfolioSummary, setPortfolioSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    amount: '',
    purchase_price: '',
    notes: ''
  });
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    onConfirm: null
  });

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const fetchPortfolio = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Fetching portfolio data...');
      console.log('Token:', localStorage.getItem('token') ? 'Present' : 'Missing');
      
      // Fetch portfolio summary
      const summaryResponse = await axios.get('/api/portfolio/summary');
      console.log('📊 Portfolio summary:', summaryResponse.data);
      setPortfolioSummary(summaryResponse.data);

      // Fetch portfolio
      const portfolioResponse = await axios.get('/api/portfolio');
      console.log('💼 Portfolio data received:', portfolioResponse.data);
      console.log('📈 Number of items:', portfolioResponse.data.length);
      setPortfolio(portfolioResponse.data);

    } catch (error) {
      console.error('❌ Error fetching portfolio:', error);
      console.error('Error response:', error.response?.data);
      toast.error('Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setEditForm({
      amount: item.amount.toString(),
      purchase_price: item.purchase_price.toString(),
      notes: item.notes || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({
      amount: '',
      purchase_price: '',
      notes: ''
    });
  };

  const handleSaveEdit = async (id) => {
    try {
      await axios.put(`/api/portfolio/${id}`, editForm);
      toast.success('Portfolio updated successfully');
      setEditingId(null);
      fetchPortfolio(); // Refresh data
    } catch (error) {
      console.error('Error updating portfolio:', error);
      toast.error('Failed to update portfolio');
    }
  };

  const handleDelete = async (id) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Remove Cryptocurrency',
      message: 'Are you sure you want to remove this cryptocurrency from your portfolio? This action cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        try {
          await axios.delete(`/api/portfolio/${id}`);
          toast.success('Cryptocurrency removed from portfolio');
          fetchPortfolio(); // Refresh data
        } catch (error) {
          console.error('Error deleting portfolio entry:', error);
          toast.error('Failed to remove cryptocurrency from portfolio');
        }
      }
    });
  };

  const handleCleanup = async () => {
    setConfirmationModal({
      isOpen: true,
      title: 'Clean Up Portfolio',
      message: 'This will remove any portfolio entries with suspiciously large amounts (likely incorrect data). This action cannot be undone. Continue?',
      type: 'warning',
      onConfirm: async () => {
        try {
          const response = await axios.post('/api/portfolio/cleanup');
          toast.success(response.data.message);
          fetchPortfolio(); // Refresh data
        } catch (error) {
          console.error('Error cleaning up portfolio:', error);
          toast.error('Failed to cleanup portfolio');
        }
      }
    });
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '$0.00';
    const num = Number(amount);
    if (isNaN(num)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const formatPercentage = (percentage) => {
    if (!percentage && percentage !== 0) return '0.00%';
    const num = Number(percentage);
    if (isNaN(num)) return '0.00%';
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const closeConfirmationModal = () => {
    setConfirmationModal({
      isOpen: false,
      title: '',
      message: '',
      type: 'warning',
      onConfirm: null
    });
  };

  const handleManualPriceUpdate = async () => {
    try {
      const response = await axios.post('/api/crypto/manual-update');
      toast.success(`Updated prices for ${response.data.updated_count} cryptocurrencies`);
      fetchPortfolio(); // Refresh portfolio with new prices
    } catch (error) {
      console.error('Error updating prices:', error);
      toast.error('Failed to update prices');
    }
  };

  return (
    <div className="portfolio">
      <div className="container">
        <div className="portfolio-header">
          <h1 className="portfolio-title">My Portfolio</h1>
          <p className="portfolio-subtitle">
            Track and manage your cryptocurrency investments
          </p>
          <div className="portfolio-actions">
            <button
              onClick={handleManualPriceUpdate}
              className="btn btn-primary btn-sm"
            >
              🔄 Update Prices
            </button>
            {portfolio.length > 0 && portfolio.some(item => item.amount > 1) && (
              <button
                onClick={handleCleanup}
                className="btn btn-warning btn-sm"
              >
                🧹 Clean Up Incorrect Entries
              </button>
            )}
          </div>
        </div>

        {portfolioSummary && (
          <PortfolioSummary summary={portfolioSummary} />
        )}

        <div className="portfolio-content">
          {/* Debug Info - Remove after fixing */}
          {process.env.NODE_ENV === 'development' && (
            <div style={{ padding: '15px', background: '#f0f0f0', borderRadius: '8px', marginBottom: '20px' }}>
              <h4>🔍 Debug Info</h4>
              <p><strong>Portfolio Count:</strong> {portfolio.length}</p>
              <p><strong>Summary:</strong> {portfolioSummary ? 'Loaded' : 'Not loaded'}</p>
              <button 
                onClick={() => console.log('Token:', localStorage.getItem('token'))} 
                style={{ padding: '5px 10px', marginRight: '10px' }}
              >
                Check Token
              </button>
              <button 
                onClick={fetchPortfolio} 
                style={{ padding: '5px 10px' }}
              >
                Refresh
              </button>
            </div>
          )}
          
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Portfolio Holdings</h2>
              <p className="card-subtitle">
                {portfolio.length} cryptocurrency{portfolio.length !== 1 ? 's' : ''}
              </p>
            </div>

            {portfolio.length > 0 ? (
              <div className="portfolio-list">
                {portfolio.map((item) => (
                  <div key={item.id} className="portfolio-item">
                    {editingId === item.id ? (
                      <div className="portfolio-edit-form">
                        <div className="edit-form-grid">
                          <div className="form-group">
                            <label className="form-label">{item.symbol} Amount</label>
                            <input
                              type="number"
                              step="any"
                              value={editForm.amount}
                              onChange={(e) => setEditForm({...editForm, amount: e.target.value})}
                              className="form-input"
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Purchase Price</label>
                            <input
                              type="number"
                              step="any"
                              value={editForm.purchase_price}
                              onChange={(e) => setEditForm({...editForm, purchase_price: e.target.value})}
                              className="form-input"
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Notes</label>
                            <input
                              type="text"
                              value={editForm.notes}
                              onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                              className="form-input"
                            />
                          </div>
                        </div>
                        <div className="edit-form-actions">
                          <button
                            onClick={() => handleSaveEdit(item.id)}
                            className="btn btn-success btn-sm"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="btn btn-secondary btn-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="portfolio-item-header">
                          <div className="crypto-info">
                            <span className="crypto-symbol">{item.symbol}</span>
                            <span className="crypto-name">{item.name}</span>
                          </div>
                          <div className="crypto-value">
                            {formatCurrency(item.current_value)}
                          </div>
                        </div>

                        <div className="portfolio-item-details">
                          <div className="detail">
                            <span className="detail-label">{item.symbol} Holdings:</span>
                            <span className="detail-value">{item.amount} {item.symbol}</span>
                          </div>
                          <div className="detail">
                            <span className="detail-label">Avg Price:</span>
                            <span className="detail-value">{formatCurrency(item.purchase_price)}</span>
                          </div>
                          <div className="detail">
                            <span className="detail-label">Current Price:</span>
                            <span className="detail-value">{formatCurrency(item.current_price)}</span>
                          </div>
                          <div className="detail">
                            <span className="detail-label">P&L:</span>
                            <span className={`detail-value ${item.profit_loss >= 0 ? 'text-green' : 'text-red'}`}>
                              {formatCurrency(item.profit_loss)} 
                              ({formatPercentage(item.profit_loss_percentage)})
                            </span>
                          </div>
                          {item.notes && (
                            <div className="detail notes">
                              <span className="detail-label">Notes:</span>
                              <span className="detail-value">{item.notes}</span>
                            </div>
                          )}
                        </div>

                        <div className="portfolio-item-actions">
                          <button
                            onClick={() => handleEdit(item)}
                            className="btn btn-sm btn-secondary"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="btn btn-sm btn-danger"
                          >
                            Remove
                          </button>
                        </div>
                      </>
                    )}
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
      </div>

      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={closeConfirmationModal}
        onConfirm={confirmationModal.onConfirm}
        title={confirmationModal.title}
        message={confirmationModal.message}
        type={confirmationModal.type}
        confirmText="Confirm"
        cancelText="Cancel"
      />
    </div>
  );
};

export default Portfolio;

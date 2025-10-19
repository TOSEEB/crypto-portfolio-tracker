import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import './AddCrypto.css';

const AddCrypto = () => {
  const [formData, setFormData] = useState({
    symbol: '',
    usd_amount: '',
    purchase_price: '',
    notes: ''
  });
  const [cryptos, setCryptos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [selectedCrypto, setSelectedCrypto] = useState(null);
  const navigate = useNavigate();

  const formatPrice = (price) => {
    if (!price && price !== 0) return 'N/A';
    const num = Number(price);
    if (isNaN(num)) return 'N/A';
    
    // Determine appropriate decimal places based on price
    let maxFractionDigits = 2;
    if (num < 1) {
      maxFractionDigits = 6; // For prices like $0.123456
    } else if (num < 10) {
      maxFractionDigits = 4; // For prices like $1.2345
    } else if (num < 100) {
      maxFractionDigits = 3; // For prices like $12.345
    } else {
      maxFractionDigits = 2; // For prices like $123.45
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: maxFractionDigits
    }).format(num);
  };

  // Helper function to calculate crypto amount from USD investment
  const calculateCryptoAmount = (usdAmount, pricePerCrypto) => {
    if (!usdAmount || !pricePerCrypto || usdAmount <= 0 || pricePerCrypto <= 0) {
      return 0;
    }
    return usdAmount / pricePerCrypto;
  };

  // Helper function to calculate USD value from crypto amount
  const calculateUSDValue = (cryptoAmount, pricePerCrypto) => {
    if (!cryptoAmount || !pricePerCrypto || cryptoAmount <= 0 || pricePerCrypto <= 0) {
      return 0;
    }
    return cryptoAmount * pricePerCrypto;
  };

  useEffect(() => {
    fetchCryptos();
  }, []);

  const fetchCryptos = async () => {
    try {
      const response = await axios.get('/api/crypto');
      setCryptos(response.data);
    } catch (error) {
      console.error('Error fetching cryptocurrencies:', error);
      toast.error('Failed to load cryptocurrencies');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.symbol) {
      newErrors.symbol = 'Please select a cryptocurrency';
    }

    if (!formData.usd_amount || parseFloat(formData.usd_amount) <= 0) {
      newErrors.usd_amount = 'USD amount must be greater than 0';
    }

    if (!formData.purchase_price || parseFloat(formData.purchase_price) <= 0) {
      newErrors.purchase_price = 'Purchase price must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Calculate crypto amount from USD amount
      const usdAmount = parseFloat(formData.usd_amount);
      const pricePerCrypto = parseFloat(formData.purchase_price);
      const cryptoAmount = usdAmount / pricePerCrypto;

      await axios.post('/api/portfolio', {
        symbol: formData.symbol,
        amount: cryptoAmount, // Send calculated crypto amount
        purchase_price: pricePerCrypto,
        notes: formData.notes
      });

      toast.success('Cryptocurrency added to portfolio successfully!');
      navigate('/portfolio');
    } catch (error) {
      console.error('Error adding cryptocurrency:', error);
      const message = error.response?.data?.message || 'Failed to add cryptocurrency';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCryptoSelect = (crypto) => {
    setFormData({
      ...formData,
      symbol: crypto.symbol,
      purchase_price: crypto.current_price || ''
    });
    setSelectedCrypto(crypto);
  };

  return (
    <div className="add-crypto">
      <div className="container">
        <div className="add-crypto-header">
          <h1 className="add-crypto-title">Add Cryptocurrency</h1>
          <p className="add-crypto-subtitle">
            Add a new cryptocurrency to your portfolio
          </p>
        </div>

        <div className="add-crypto-content">
          <div className="add-crypto-form-section">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Portfolio Entry</h2>
                <p className="card-subtitle">Enter your cryptocurrency details</p>
              </div>

              <form onSubmit={handleSubmit} className="add-crypto-form">
                <div className="form-group">
                  <label htmlFor="symbol" className="form-label">
                    Cryptocurrency *
                  </label>
                  <select
                    id="symbol"
                    name="symbol"
                    value={formData.symbol}
                    onChange={handleChange}
                    className={`form-input ${errors.symbol ? 'error' : ''}`}
                    required
                    disabled={loading}
                  >
                    <option value="">Select a cryptocurrency</option>
                    {cryptos.map((crypto) => (
                      <option key={crypto.id} value={crypto.symbol}>
                        {crypto.symbol} - {crypto.name}
                      </option>
                    ))}
                  </select>
                  {errors.symbol && (
                    <div className="error-message">{errors.symbol}</div>
                  )}
                </div>

                {/* Important Notice */}
                <div className="form-notice">
                  <div className="notice-icon">💰</div>
                  <div className="notice-content">
                    <h4>Enter Your USD Investment Amount</h4>
                    <p>Enter how much USD you're spending, and we'll automatically calculate how much cryptocurrency you'll receive.</p>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="usd_amount" className="form-label">
                      USD Amount to Invest * 
                      <span className="label-help">(e.g., 200)</span>
                    </label>
                    <input
                      type="number"
                      id="usd_amount"
                      name="usd_amount"
                      step="any"
                      value={formData.usd_amount}
                      onChange={handleChange}
                      className={`form-input ${errors.usd_amount ? 'error' : ''}`}
                      placeholder="200"
                      required
                      disabled={loading}
                    />
                    <div className="form-help">
                      Enter the USD amount you want to spend on {formData.symbol || 'cryptocurrency'}
                    </div>
                    {errors.usd_amount && (
                      <div className="error-message">{errors.usd_amount}</div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="purchase_price" className="form-label">
                      Price Per Unit (USD) *
                    </label>
                    <input
                      type="number"
                      id="purchase_price"
                      name="purchase_price"
                      step="any"
                      value={formData.purchase_price}
                      onChange={handleChange}
                      className={`form-input ${errors.purchase_price ? 'error' : ''}`}
                      placeholder="107802.00"
                      required
                      disabled={loading}
                    />
                    <div className="form-help">
                      Current price per {formData.symbol || 'unit'} (auto-filled)
                    </div>
                    {errors.purchase_price && (
                      <div className="error-message">{errors.purchase_price}</div>
                    )}
                  </div>
                </div>

                {/* Calculation Helper */}
                {formData.usd_amount && formData.purchase_price && selectedCrypto && (
                  <div className="calculation-helper">
                    <h4>💰 Investment Summary</h4>
                    <div className="calculation-grid">
                      <div className="calc-item">
                        <span className="calc-label">USD Investment:</span>
                        <span className="calc-value">{formatPrice(formData.usd_amount)}</span>
                      </div>
                      <div className="calc-item">
                        <span className="calc-label">Price per {formData.symbol}:</span>
                        <span className="calc-value">{formatPrice(formData.purchase_price)}</span>
                      </div>
                      <div className="calc-item total">
                        <span className="calc-label">You'll receive:</span>
                        <span className="calc-value">{calculateCryptoAmount(parseFloat(formData.usd_amount), parseFloat(formData.purchase_price)).toFixed(8)} {formData.symbol}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="notes" className="form-label">
                    Notes (Optional)
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Add any notes about this investment..."
                    rows="3"
                    disabled={loading}
                  />
                </div>

                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    disabled={loading}
                  >
                    {loading ? 'Adding...' : 'Add to Portfolio'}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/portfolio')}
                    className="btn btn-secondary btn-lg"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="add-crypto-info-section">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Available Cryptocurrencies</h2>
                <p className="card-subtitle">Select from supported cryptocurrencies</p>
              </div>

              <div className="crypto-list">
                {cryptos.slice(0, 10).map((crypto) => (
                  <div
                    key={crypto.id}
                    className={`crypto-item ${formData.symbol === crypto.symbol ? 'selected' : ''}`}
                    onClick={() => handleCryptoSelect(crypto)}
                  >
                    <div className="crypto-info">
                      <span className="crypto-symbol">{crypto.symbol}</span>
                      <span className="crypto-name">{crypto.name}</span>
                    </div>
                    <div className="crypto-price">
                      {formatPrice(crypto.current_price)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddCrypto;

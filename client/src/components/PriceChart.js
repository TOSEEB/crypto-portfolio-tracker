import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import './PriceChart.css';

const PriceChart = ({ symbol }) => {
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (symbol) {
      fetchPriceHistory();
    }
  }, [symbol]);

  const fetchPriceHistory = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/crypto/${symbol}/history?days=7`);
      setPriceHistory(response.data);
    } catch (error) {
      console.error('Error fetching price history:', error);
      toast.error('Failed to load price history');
    } finally {
      setLoading(false);
    }
  }; 

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }).format(price);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="price-chart-loading">
        <div className="spinner"></div>
        <p>Loading price history...</p>
      </div>
    );
  }

  if (!priceHistory || priceHistory.length === 0) {
    return (
      <div className="price-chart-empty">
        <p>No price history available for {symbol}</p>
      </div>
    );
  }

  // Calculate min and max prices for scaling
  const prices = priceHistory.map(item => item.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;

  // Calculate chart dimensions
  const chartHeight = 300;
  const chartWidth = 100; // percentage
  const padding = 20;

  return (
    <div className="price-chart">
      <div className="chart-container">
        <div className="chart-header">
          <div className="chart-info">
            <h3>{symbol} Price History</h3>
            <p>Last 7 days</p>
          </div>
          <div className="chart-stats">
            <div className="stat">
              <span className="stat-label">Current Price:</span>
              <span className="stat-value">
                {formatPrice(priceHistory[priceHistory.length - 1]?.price)}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">7d High:</span>
              <span className="stat-value">{formatPrice(maxPrice)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">7d Low:</span>
              <span className="stat-value">{formatPrice(minPrice)}</span>
            </div>
          </div>
        </div>

        <div className="chart-area">
          <svg 
            className="price-chart-svg" 
            viewBox={`0 0 100 ${chartHeight}`}
            preserveAspectRatio="none"
          >
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="100"
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="0.5"
              />
            ))}

            {/* Price line */}
            <polyline
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              points={priceHistory.map((item, index) => {
                const x = (index / (priceHistory.length - 1)) * 100;
                const y = ((maxPrice - item.price) / priceRange) * (chartHeight - padding * 2) + padding;
                return `${x},${y}`;
              }).join(' ')}
            />

            {/* Data points */}
            {priceHistory.map((item, index) => {
              const x = (index / (priceHistory.length - 1)) * 100;
              const y = ((maxPrice - item.price) / priceRange) * (chartHeight - padding * 2) + padding;
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="2"
                  fill="#3b82f6"
                  className="data-point"
                />
              );
            })}
          </svg>
        </div>

        <div className="chart-footer">
          <div className="chart-labels">
            {priceHistory.filter((_, index) => index % Math.ceil(priceHistory.length / 5) === 0).map((item, index) => (
              <div key={index} className="chart-label">
                <span className="label-date">{formatDate(item.recorded_at)}</span>
                <span className="label-price">{formatPrice(item.price)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceChart;

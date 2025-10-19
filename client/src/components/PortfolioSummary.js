import React from 'react';
import './PortfolioSummary.css';

const PortfolioSummary = ({ summary }) => {
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

  return (
    <div className="portfolio-summary">
      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-icon">📊</div>
          <div className="summary-content">
            <h3 className="summary-title">Total Holdings</h3>
            <p className="summary-value">{summary.total_holdings}</p>
            <p className="summary-label">Cryptocurrencies</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">💰</div>
          <div className="summary-content">
            <h3 className="summary-title">Total Invested</h3>
            <p className="summary-value">{formatCurrency(summary.total_invested)}</p>
            <p className="summary-label">Initial Investment</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">📈</div>
          <div className="summary-content">
            <h3 className="summary-title">Current Value</h3>
            <p className="summary-value">{formatCurrency(summary.total_current_value)}</p>
            <p className="summary-label">Portfolio Value</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">🎯</div>
          <div className="summary-content">
            <h3 className="summary-title">Total P&L</h3>
            <p className={`summary-value ${summary.total_profit_loss >= 0 ? 'profit' : 'loss'}`}>
              {formatCurrency(summary.total_profit_loss)}
            </p>
            <p className={`summary-label ${summary.total_profit_loss >= 0 ? 'profit' : 'loss'}`}>
              {formatPercentage(summary.total_profit_loss_percentage)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioSummary;

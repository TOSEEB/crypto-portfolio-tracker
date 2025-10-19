import React from 'react';
import './CryptoTable.css';

const CryptoTable = ({ cryptos, onCryptoSelect, showActions = true }) => {
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '$0.00';
    const num = Number(amount);
    if (isNaN(num)) return '$0.00';
    
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

  const formatPercentage = (percentage) => {
    if (!percentage && percentage !== 0) return '0.00%';
    const num = Number(percentage);
    if (isNaN(num)) return '0.00%';
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  const formatMarketCap = (marketCap) => {
    if (!marketCap && marketCap !== 0) return '$0';
    const num = Number(marketCap);
    if (isNaN(num)) return '$0';
    if (num >= 1e12) {
      return `$${(num / 1e12).toFixed(2)}T`;
    } else if (num >= 1e9) {
      return `$${(num / 1e9).toFixed(2)}B`;
    } else if (num >= 1e6) {
      return `$${(num / 1e6).toFixed(2)}M`;
    } else {
      return `$${num.toLocaleString()}`;
    }
  };

  const handleRowClick = (crypto) => {
    if (onCryptoSelect) {
      onCryptoSelect(crypto);
    }
  };

  if (!cryptos || cryptos.length === 0) {
    return (
      <div className="crypto-table-empty">
        <p>No cryptocurrencies found.</p>
      </div>
    );
  }

  return (
    <div className="crypto-table-container">
      <table className="crypto-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Price</th>
            <th>24h Change</th>
            <th>Market Cap</th>
            <th>Volume</th>
            {showActions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {cryptos.map((crypto) => (
            <tr 
              key={crypto.id} 
              className={`crypto-row ${onCryptoSelect ? 'clickable' : ''}`}
              onClick={() => handleRowClick(crypto)}
            >
              <td className="crypto-name-cell">
                <div className="crypto-name-info">
                  <span className="crypto-symbol">{crypto.symbol}</span>
                  <span className="crypto-name">{crypto.name}</span>
                </div>
              </td>
              <td className="crypto-price">
                {formatCurrency(crypto.current_price)}
              </td>
              <td className={`crypto-change ${crypto.price_change_24h >= 0 ? 'positive' : 'negative'}`}>
                {formatPercentage(crypto.price_change_24h)}
              </td>
              <td className="crypto-market-cap">
                {formatMarketCap(crypto.market_cap)}
              </td>
              <td className="crypto-volume">
                {formatMarketCap(crypto.volume_24h)}
              </td>
              {showActions && (
                <td className="crypto-actions">
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle add to portfolio
                    }}
                  >
                    Add to Portfolio
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CryptoTable;

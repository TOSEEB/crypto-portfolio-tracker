import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import './CryptoDetail.css';

const CryptoDetail = ({ symbol, onClose }) => {
  const [cryptoData, setCryptoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    if (symbol) {
      fetchCryptoData();
      // Update every 30 seconds for real-time data
      const interval = setInterval(fetchCryptoData, 30000);
      return () => clearInterval(interval);
    }
  }, [symbol]);

  const fetchCryptoData = async () => {
    try {
      setLoading(true);
      
      // Fetch from our API first (which gets from CoinGecko/CoinCap)
      const response = await axios.get(`/api/crypto/${symbol}`);
      const crypto = response.data;
      
      // Also fetch additional real-time data from CoinGecko
      const coinGeckoResponse = await axios.get(
        `https://api.coingecko.com/api/v3/coins/${getCoinGeckoId(symbol)}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`
      );
      
      const coinGeckoData = coinGeckoResponse.data;
      
      // Combine data
      const combinedData = {
        ...crypto,
        realTimeData: {
          current_price: coinGeckoData.market_data?.current_price?.usd || crypto.current_price,
          price_change_24h: coinGeckoData.market_data?.price_change_24h || crypto.price_change_24h,
          price_change_percentage_24h: coinGeckoData.market_data?.price_change_percentage_24h || crypto.price_change_24h,
          market_cap: coinGeckoData.market_data?.market_cap?.usd || crypto.market_cap,
          total_volume: coinGeckoData.market_data?.total_volume?.usd || crypto.volume_24h,
          high_24h: coinGeckoData.market_data?.high_24h?.usd,
          low_24h: coinGeckoData.market_data?.low_24h?.usd,
          market_cap_rank: coinGeckoData.market_cap_rank,
          ath: coinGeckoData.market_data?.ath?.usd,
          ath_change_percentage: coinGeckoData.market_data?.ath_change_percentage?.usd,
          atl: coinGeckoData.market_data?.atl?.usd,
          atl_change_percentage: coinGeckoData.market_data?.atl_change_percentage?.usd,
          circulating_supply: coinGeckoData.market_data?.circulating_supply,
          total_supply: coinGeckoData.market_data?.total_supply,
          max_supply: coinGeckoData.market_data?.max_supply
        }
      };
      
      setCryptoData(combinedData);
      setLastUpdated(new Date());
      
    } catch (error) {
      console.error('Error fetching crypto data:', error);
      toast.error('Failed to load cryptocurrency data');
    } finally {
      setLoading(false);
    }
  };

  const getCoinGeckoId = (symbol) => {
    const coinGeckoIds = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'BNB': 'binancecoin',
      'ADA': 'cardano',
      'SOL': 'solana',
      'XRP': 'ripple',
      'DOT': 'polkadot',
      'DOGE': 'dogecoin',
      'AVAX': 'avalanche-2',
      'SHIB': 'shiba-inu',
      'MATIC': 'matic-network',
      'LTC': 'litecoin',
      'LINK': 'chainlink',
      'UNI': 'uniswap'
    };
    return coinGeckoIds[symbol] || symbol.toLowerCase();
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '$0.00';
    const num = Number(amount);
    if (isNaN(num)) return '$0.00';
    
    if (num >= 1e12) {
      return `$${(num / 1e12).toFixed(2)}T`;
    } else if (num >= 1e9) {
      return `$${(num / 1e9).toFixed(2)}B`;
    } else if (num >= 1e6) {
      return `$${(num / 1e6).toFixed(2)}M`;
    } else if (num >= 1000) {
      return `$${num.toLocaleString()}`;
    } else {
      return `$${num.toFixed(2)}`;
    }
  };

  const formatNumber = (num) => {
    if (!num && num !== 0) return '0';
    const number = Number(num);
    if (isNaN(number)) return '0';
    return number.toLocaleString();
  };

  const formatPercentage = (percentage) => {
    if (!percentage && percentage !== 0) return '0.00%';
    const num = Number(percentage);
    if (isNaN(num)) return '0.00%';
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="crypto-detail-overlay">
        <div className="crypto-detail-modal">
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading cryptocurrency data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!cryptoData) {
    return (
      <div className="crypto-detail-overlay">
        <div className="crypto-detail-modal">
          <div className="error-state">
            <p>Failed to load cryptocurrency data</p>
            <button onClick={onClose} className="btn btn-primary">Close</button>
          </div>
        </div>
      </div>
    );
  }

  const data = cryptoData.realTimeData;

  return (
    <div className="crypto-detail-overlay" onClick={onClose}>
      <div className="crypto-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="crypto-detail-header">
          <div className="crypto-info">
            <h1 className="crypto-name">{cryptoData.name}</h1>
            <span className="crypto-symbol">{cryptoData.symbol}</span>
            {data.market_cap_rank && (
              <span className="market-rank">#{data.market_cap_rank}</span>
            )}
          </div>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <div className="crypto-price-section">
          <div className="current-price">
            {formatCurrency(data.current_price)}
          </div>
          <div className={`price-change ${data.price_change_24h >= 0 ? 'positive' : 'negative'}`}>
            {formatCurrency(Math.abs(data.price_change_24h))} ({formatPercentage(data.price_change_percentage_24h)})
          </div>
          <div className="last-updated">
            Last updated: {lastUpdated?.toLocaleTimeString()}
          </div>
        </div>

        <div className="market-data-grid">
          <div className="market-stat">
            <span className="stat-label">Market Cap</span>
            <span className="stat-value">{formatCurrency(data.market_cap)}</span>
          </div>
          
          <div className="market-stat">
            <span className="stat-label">24h Volume</span>
            <span className="stat-value">{formatCurrency(data.total_volume)}</span>
          </div>
          
          <div className="market-stat">
            <span className="stat-label">24h High</span>
            <span className="stat-value">{formatCurrency(data.high_24h)}</span>
          </div>
          
          <div className="market-stat">
            <span className="stat-label">24h Low</span>
            <span className="stat-value">{formatCurrency(data.low_24h)}</span>
          </div>
        </div>

        <div className="supply-data">
          <h3>Supply Information</h3>
          <div className="supply-grid">
            {data.circulating_supply && (
              <div className="supply-stat">
                <span className="supply-label">Circulating Supply</span>
                <span className="supply-value">{formatNumber(data.circulating_supply)} {cryptoData.symbol}</span>
              </div>
            )}
            
            {data.total_supply && (
              <div className="supply-stat">
                <span className="supply-label">Total Supply</span>
                <span className="supply-value">{formatNumber(data.total_supply)} {cryptoData.symbol}</span>
              </div>
            )}
            
            {data.max_supply && (
              <div className="supply-stat">
                <span className="supply-label">Max Supply</span>
                <span className="supply-value">{formatNumber(data.max_supply)} {cryptoData.symbol}</span>
              </div>
            )}
          </div>
        </div>

        <div className="ath-data">
          <h3>All-Time High/Low</h3>
          <div className="ath-grid">
            {data.ath && (
              <div className="ath-stat">
                <span className="ath-label">All-Time High</span>
                <span className="ath-value">
                  {formatCurrency(data.ath)}
                  {data.ath_change_percentage && (
                    <span className={`ath-change ${data.ath_change_percentage >= 0 ? 'positive' : 'negative'}`}>
                      ({formatPercentage(data.ath_change_percentage)})
                    </span>
                  )}
                </span>
              </div>
            )}
            
            {data.atl && (
              <div className="ath-stat">
                <span className="ath-label">All-Time Low</span>
                <span className="ath-value">
                  {formatCurrency(data.atl)}
                  {data.atl_change_percentage && (
                    <span className={`ath-change ${data.atl_change_percentage >= 0 ? 'positive' : 'negative'}`}>
                      ({formatPercentage(data.atl_change_percentage)})
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="crypto-actions">
          <button 
            className="btn btn-primary"
            onClick={() => {
              // Navigate to add crypto page with this symbol pre-filled
              window.location.href = `/add-crypto?symbol=${cryptoData.symbol}`;
            }}
          >
            Add to Portfolio
          </button>
          <button 
            className="btn btn-secondary"
            onClick={fetchCryptoData}
          >
            🔄 Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default CryptoDetail;

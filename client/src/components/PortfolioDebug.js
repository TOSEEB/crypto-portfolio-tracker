import { useEffect, useState } from 'react';
import axios from 'axios';

const PortfolioDebug = () => {
  const [userInfo, setUserInfo] = useState(null);
  const [portfolioCount, setPortfolioCount] = useState(0);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      // Get current user
      const userResponse = await axios.get('/api/auth/me');
      setUserInfo(userResponse.data.user);
      console.log('Current user:', userResponse.data.user);

      // Get portfolio
      const portfolioResponse = await axios.get('/api/portfolio');
      console.log('Portfolio data:', portfolioResponse.data);
      setPortfolioCount(portfolioResponse.data.length);

      // Get all portfolio entries (for debugging)
      const adminCheck = await axios.get('/api/portfolio', {
        headers: { Authorization: localStorage.getItem('token') }
      });
      console.log('All portfolio entries:', adminCheck.data);
    } catch (error) {
      console.error('Debug error:', error);
    }
  };

  return (
    <div style={{ padding: '20px', background: '#f0f0f0', margin: '20px', borderRadius: '8px' }}>
      <h3>🔍 Debug Information</h3>
      {userInfo && (
        <div>
          <p><strong>User ID:</strong> {userInfo.id}</p>
          <p><strong>Username:</strong> {userInfo.username}</p>
          <p><strong>Email:</strong> {userInfo.email}</p>
          <p><strong>Portfolio Count:</strong> {portfolioCount}</p>
        </div>
      )}
      <button onClick={checkStatus} style={{ padding: '10px 20px', marginTop: '10px' }}>
        Refresh Debug Info
      </button>
    </div>
  );
};

export default PortfolioDebug;


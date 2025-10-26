import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="container">
        <div className="navbar-content">
          <Link to="/" className="navbar-brand">
            <span className="brand-icon">₿</span>
            Crypto Tracker
          </Link>
          
          <div className="navbar-menu">
            {user ? (
              <> 
                <Link to="/dashboard" className="navbar-link">
                  Dashboard
                </Link>
                <Link to="/crypto" className="navbar-link">
                  Crypto Prices
                </Link>
                <Link to="/portfolio" className="navbar-link">
                  Portfolio
                </Link>
                <Link to="/add-crypto" className="navbar-link">
                  Add Crypto
                </Link>
                <div className="navbar-user">
                  <span className="user-name">Welcome, {user.name || user.username || (user.email ? user.email.split('@')[0] : 'User')}</span>
                  {process.env.NODE_ENV === 'development' && user.email && (
                    <span style={{ fontSize: '12px', color: '#666', marginLeft: '10px' }}>
                      ({user.email})
                    </span>
                  )}
                  <button onClick={handleLogout} className="btn btn-sm btn-secondary">
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="navbar-link">
                  Login
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

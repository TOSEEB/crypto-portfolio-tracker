import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const token = searchParams.get('token');
  const error = searchParams.get('error');

  useEffect(() => {
    // Prevent duplicate processing
    if (isProcessing) return;
    
    if (error) {
      toast.error('Google authentication failed');
      navigate('/login');
      return;
    }

    if (token && !isProcessing) {
      setIsProcessing(true);
      
      const processAuth = async () => {
        try {
          const result = await loginWithToken(token);
          if (result.success) {
            toast.success('Successfully signed in with Google!');
            navigate('/dashboard');
          } else {
            toast.error('Authentication failed');
            navigate('/login');
          }
        } catch (error) {
          console.error('Auth processing error:', error);
          toast.error('Authentication failed');
          navigate('/login');
        }
      };

      processAuth();
    } else if (!token && !error) {
      toast.error('No authentication token received');
      navigate('/login');
    }
  }, [token, error, navigate, loginWithToken, isProcessing]);

  return (
    <div className="loading">
      <div className="spinner"></div>
      <p>Completing authentication...</p>
    </div>
  );
};

export default AuthCallback;

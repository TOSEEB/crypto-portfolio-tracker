# 🚀 Crypto Price Tracker

A full-stack cryptocurrency portfolio tracking application with real-time price updates, portfolio management, and Google OAuth authentication.

![Crypto Tracker](https://img.shields.io/badge/React-18.2.0-blue) ![Node.js](https://img.shields.io/badge/Node.js-Express-green) ![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-blue) ![API](https://img.shields.io/badge/API-CoinMarketCap-orange)

## ✨ Features

### 🔐 Authentication & Security
- **Google OAuth 2.0** integration
- **JWT-based** authentication
- **Password reset** functionality
- **Secure session** management

### 📊 Real-time Data
- **Live cryptocurrency prices** from CoinMarketCap API
- **Top 15 cryptocurrencies** by market cap
- **Real-time portfolio** value updates
- **Price change tracking** (24h)

### 💼 Portfolio Management
- **Add/Remove** cryptocurrencies
- **Track investments** with USD amounts
- **Automatic calculation** of crypto amounts
- **Portfolio summary** with P&L
- **Investment notes** and history

### 📈 Advanced Features
- **Interactive charts** with Chart.js
- **Responsive design** for all devices
- **Toast notifications** for user feedback
- **Confirmation modals** for critical actions
- **Search and filter** functionality

## 🛠️ Tech Stack

### Frontend
- **React 18.2.0** - UI framework
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Chart.js** - Data visualization
- **React Hot Toast** - Notifications
- **CSS3** - Styling

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **JWT** - Authentication
- **Passport.js** - OAuth strategies
- **Axios** - External API calls

### APIs & Services
- **CoinMarketCap API** - Cryptocurrency data
- **Google OAuth** - Authentication
- **Nodemailer** - Email services

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL database
- CoinMarketCap API key
- Google OAuth credentials

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/crypto-price-tracker.git
cd crypto-price-tracker
```

2. **Install dependencies**
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

3. **Environment Setup**
```bash
# Copy environment template
cp server/env.example server/.env

# Update server/.env with your credentials:
# - Database connection details
# - CoinMarketCap API key
# - Google OAuth credentials
# - JWT secret
```

4. **Database Setup**
```bash
# Create PostgreSQL database
createdb crypto_tracker

# The app will automatically create tables on first run
```

5. **Start Development Servers**
```bash
# Terminal 1 - Start backend
cd server
npm start

# Terminal 2 - Start frontend
cd client
npm start
```

6. **Access the Application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 📱 Screenshots

### Dashboard
![Dashboard](https://via.placeholder.com/800x400/1a1a1a/ffffff?text=Dashboard+View)

### Portfolio Management
![Portfolio](https://via.placeholder.com/800x400/1a1a1a/ffffff?text=Portfolio+Management)

### Real-time Prices
![Prices](https://via.placeholder.com/800x400/1a1a1a/ffffff?text=Real-time+Prices)

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/google` - Google OAuth
- `POST /api/auth/forgot-password` - Password reset

### Cryptocurrency Data
- `GET /api/crypto` - Get all cryptocurrencies
- `GET /api/crypto/:symbol` - Get specific crypto
- `POST /api/crypto/manual-update` - Update prices

### Portfolio Management
- `GET /api/portfolio` - Get user portfolio
- `POST /api/portfolio` - Add to portfolio
- `PUT /api/portfolio/:id` - Update portfolio entry
- `DELETE /api/portfolio/:id` - Remove from portfolio

## 🌐 Deployment

### Vercel Deployment
This project is configured for easy deployment on Vercel:

1. **Deploy Backend**
```bash
cd server
vercel
```

2. **Deploy Frontend**
```bash
cd client
vercel
```

3. **Set Environment Variables** in Vercel dashboard
4. **Configure Database** (Vercel Postgres recommended)

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## 🔑 Environment Variables

### Server (.env)
```bash
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crypto_tracker
DB_USER=your_username
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
COINMARKETCAP_API_KEY=your_api_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
CLIENT_URL=http://localhost:3000
SERVER_URL=http://localhost:5000
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

### Client
```bash
REACT_APP_API_URL=http://localhost:5000
```

## 📊 Database Schema

### Users Table
- `id` - Primary key
- `username` - Unique username
- `email` - Unique email
- `password` - Hashed password
- `google_id` - Google OAuth ID
- `created_at` - Timestamp

### Cryptocurrencies Table
- `id` - Primary key
- `symbol` - Crypto symbol (BTC, ETH, etc.)
- `name` - Full name
- `current_price` - Current USD price
- `market_cap` - Market capitalization
- `volume_24h` - 24h trading volume
- `price_change_24h` - 24h price change %
- `last_updated` - Last update timestamp

### Portfolio Table
- `id` - Primary key
- `user_id` - Foreign key to users
- `crypto_id` - Foreign key to cryptocurrencies
- `amount` - Amount of crypto owned
- `purchase_price` - Average purchase price
- `notes` - Investment notes
- `created_at` - Timestamp

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Your Name**
- GitHub: [@yourusername](https://github.com/yourusername)
- LinkedIn: [Your LinkedIn](https://linkedin.com/in/yourprofile)
- Email: your.email@example.com

## 🙏 Acknowledgments

- [CoinMarketCap](https://coinmarketcap.com/) for cryptocurrency data API
- [Google](https://developers.google.com/identity) for OAuth authentication
- [Chart.js](https://www.chartjs.org/) for data visualization
- [React](https://reactjs.org/) community for excellent documentation

---

⭐ **Star this repository if you found it helpful!**
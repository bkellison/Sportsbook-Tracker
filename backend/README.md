# Sportsbook Tracker API

A comprehensive backend API for managing multiple sportsbook accounts, tracking transactions, and analyzing betting performance. Built with Node.js, Express, and MySQL.

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

## 🚀 Features

### Core Functionality
- **Multi-Account Management** - Track multiple sportsbook accounts (DraftKings, FanDuel, BetMGM, etc.)
- **Transaction Tracking** - Record deposits, withdrawals, bets, and bonus credits
- **Bet Management** - Track pending bets, settle wins/losses, calculate ROI
- **Advanced Analytics** - Win rates, profit/loss analysis, streak tracking
- **Data Import/Export** - CSV import/export for bulk operations

### Technical Features
- **JWT Authentication** - Secure user authentication and authorization
- **RESTful API** - Clean, documented API endpoints
- **Database Optimization** - Efficient MySQL queries with connection pooling
- **Rate Limiting** - Protection against abuse and DoS attacks
- **Comprehensive Validation** - Input validation and sanitization
- **Error Handling** - Detailed error responses and logging
- **Health Monitoring** - System health checks and performance metrics

## 🏗️ Architecture

```
src/
├── controllers/     # Route handlers and business logic
├── models/         # Database models and queries
├── services/       # Business logic services
├── middleware/     # Custom middleware (auth, validation, errors)
├── routes/         # API route definitions
├── utils/          # Helper functions and utilities
├── config/         # Configuration files
└── app.js          # Express application setup
```

## 📋 Prerequisites

- **Node.js** >= 18.0.0
- **MySQL** >= 8.0
- **npm** >= 8.0.0

## ⚡ Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/sportsbook-tracker-api.git
cd sportsbook-tracker-api
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory:

```env
# Server Configuration
NODE_ENV=development
PORT=3001
API_VERSION=1.0.0

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=sportsbook_tracker
DB_PORT=3306

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-at-least-32-characters
JWT_EXPIRES_IN=7d

# Security
BCRYPT_SALT_ROUNDS=12

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Email Configuration (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### 4. Database Setup
```bash
# Create database
mysql -u root -p -e "CREATE DATABASE sportsbook_tracker;"

# Run migrations
npm run db:migrate

# Seed initial data (optional)
npm run db:seed
```

### 5. Start the Server
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start

# Debug mode
npm run dev:debug
```

The API will be available at `http://localhost:3001`

## 📚 API Documentation

### Base URL
```
http://localhost:3001/api
```

### Authentication
All protected endpoints require a JWT token:
```bash
Authorization: Bearer <your-jwt-token>
```

### Key Endpoints

#### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/validate` - Validate token
- `POST /auth/change-password` - Change password

#### Accounts
- `GET /accounts` - Get all user accounts
- `GET /accounts/summary` - Get accounts summary
- `GET /accounts/:accountKey` - Get specific account
- `PUT /accounts/:accountKey` - Update account
- `DELETE /accounts/:accountKey` - Clear account data

#### Transactions
- `GET /transactions` - Get all transactions (with pagination)
- `POST /transactions` - Create new transaction
- `PUT /transactions/:id` - Update transaction
- `DELETE /transactions/:id` - Delete transaction
- `GET /transactions/stats` - Get transaction statistics

#### Bets
- `GET /bets` - Get all bets (with pagination)
- `POST /bets` - Create new bet
- `PUT /bets/:id` - Update bet status (settle)
- `DELETE /bets/:id` - Delete bet
- `GET /bets/pending` - Get pending bets
- `GET /bets/stats` - Get betting statistics

#### Bulk Operations
- `POST /bulk-import` - Import bulk data
- `GET /export` - Export data to CSV
- `DELETE /reset` - Reset all user data

### Example Requests

#### Register User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "testuser",
    "password": "securepassword123"
  }'
```

#### Create Transaction
```bash
curl -X POST http://localhost:3001/api/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "account": "draftkings1",
    "type": "deposit",
    "amount": 100.00,
    "description": "Initial deposit"
  }'
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration

# Watch mode for development
npm run test:watch
```

## 🚀 Deployment

### Using PM2 (Recommended for VPS)
```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
npm run pm2:start

# View logs
npm run pm2:logs

# Restart
npm run pm2:restart
```

### Using Docker
```bash
# Build Docker image
npm run docker:build

# Run container
npm run docker:run
```

### Environment Variables for Production
```env
NODE_ENV=production
PORT=3001
DB_HOST=your-production-db-host
DB_PASSWORD=your-secure-db-password
JWT_SECRET=your-production-jwt-secret-at-least-32-characters
FRONTEND_URL=https://your-frontend-domain.com
```

## 📊 Database Schema

### Users
- `id` (Primary Key)
- `email` (Unique)
- `username` (Unique)
- `password_hash`
- `created_at`
- `updated_at`

### Accounts
- `id` (Primary Key)
- `user_id` (Foreign Key)
- `account_key` (Unique per user)
- `name`
- `balance`
- `total_deposits`
- `total_withdrawals`

### Transactions
- `id` (Primary Key)
- `account_id` (Foreign Key)
- `type` (deposit, withdrawal, bet, bonus-credit, etc.)
- `amount`
- `description`
- `transaction_date`

### Bets
- `id` (Primary Key)
- `account_id` (Foreign Key)
- `amount`
- `display_amount`
- `description`
- `bet_date`
- `status` (pending, won, lost)
- `winnings`
- `is_bonus_bet`

## 🛠️ Development

### Code Style
The project uses ESLint and Prettier for consistent code formatting:

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

### Git Hooks
Pre-commit hooks are set up to ensure code quality:
- Linting and formatting
- Running tests
- Security audit

### Database Operations
```bash
# Create database backup
npm run db:backup

# Reset database (WARNING: Destroys all data)
npm run db:reset

# Run migrations
npm run db:migrate
```

## 📈 Monitoring & Performance

### Health Check
```bash
curl http://localhost:3001/health
```

Returns system health including:
- Database status
- Memory usage
- Uptime
- Response times

### Performance Testing
```bash
# Run performance analysis
npm run performance:test
```

### Security Audit
```bash
# Check for vulnerabilities
npm run security:audit

# Fix vulnerabilities
npm run security:fix
```

## 🔒 Security Features

- **JWT Authentication** with configurable expiration
- **Password Hashing** using bcrypt with salt rounds
- **Rate Limiting** to prevent abuse
- **Input Validation** and sanitization
- **SQL Injection Protection**
- **XSS Protection**
- **Security Headers** via Helmet.js
- **CORS Configuration**

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style
- Write tests for new features
- Update documentation
- Ensure all tests pass
- Follow conventional commit messages

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Bug Reports

If you discover a bug, please create an issue on GitHub with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- System information (Node.js version, OS, etc.)

## 💡 Feature Requests

Feature requests are welcome! Please:
- Check if the feature already exists
- Provide a clear use case
- Explain the expected behavior
- Consider the impact on existing functionality

## 📧 Support

For support questions:
- Check the documentation first
- Search existing GitHub issues
- Create a new issue with the `question` label

## 🙏 Acknowledgments

- [Express.js](https://expressjs.com/) - Web framework
- [MySQL2](https://github.com/sidorares/node-mysql2) - Database driver
- [JSON Web Tokens](https://jwt.io/) - Authentication
- [Helmet.js](https://helmetjs.github.io/) - Security middleware

---

**Made with ❤️ for responsible betting tracking**
const config = {
  development: {
    port: process.env.PORT || 3001,
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true,
      optionsSuccessStatus: 200
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    },
    bcrypt: {
      saltRounds: 10
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    }
  },
  production: {
    port: process.env.PORT || 3001,
    cors: {
      origin: process.env.FRONTEND_URL || 'https://your-domain.com',
      credentials: true,
      optionsSuccessStatus: 200
    },
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    },
    bcrypt: {
      saltRounds: 12
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 50
    }
  },
  test: {
    port: process.env.PORT || 3002,
    cors: {
      origin: 'http://localhost:3000',
      credentials: true
    },
    jwt: {
      secret: 'test-secret-key',
      expiresIn: '1h'
    },
    bcrypt: {
      saltRounds: 8
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 200
    }
  }
};

const environment = process.env.NODE_ENV || 'development';

module.exports = {
  ...config[environment],
  environment: environment,
  version: process.env.API_VERSION || '1.0.0'
};
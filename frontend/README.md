Sportsbook Tracker - Frontend
A beautiful, modern React application for tracking and analyzing sports betting accounts with comprehensive analytics and multi-platform support.
Features
Comprehensive Dashboard

Real-time account balances and performance metrics
Interactive analytics with win rates, ROI, and profit factors
Visual progress indicators and performance charts
Multi-account overview with activity tracking

Beautiful UI/UX

12 stunning themes with smooth animations
Responsive design for all devices
Animated glow effects and transitions
Accessibility-first design with reduced motion support

Advanced Analytics

Detailed profit & loss analysis
Win rate and ROI calculations
Streak tracking and performance trends
Account-specific performance breakdowns

Powerful Management Tools

Multi-account betting platform support
Transaction management with categories
Bet tracking with status updates
CSV import/export for data portability

Getting Started
Prerequisites

Node.js 18.0.0 or higher
npm 8.0.0 or higher
Backend server running on port 3001

Installation

Install dependencies

bash   npm install

Set up environment variables

bash   cp .env.example .env.local
Edit .env.local:
env   REACT_APP_API_URL=http://localhost:3001

Start development server

bash   npm start

Open your browser
Navigate to http://localhost:3000

🏗️ Project Structure
src/
├── components/           # React components
│   ├── auth/            # Authentication components
│   ├── dashboard/       # Dashboard views and cards
│   ├── analytics/       # Analytics components
│   ├── accounts/        # Account management
│   ├── transactions/    # Transaction forms and bulk import
│   ├── ui/              # Reusable UI components
│   └── common/          # Common components
├── context/             # React Context providers
├── hooks/               # Custom React hooks
├── services/            # API service layer
├── styles/              # Styling and themes
├── utils/               # Utility functions
└── App.jsx              # Main application component
Themes
Choose from 12 beautiful themes:

Purple Galaxy (default) - Deep purple with cosmic vibes
Ocean Blue - Calming blue ocean depths
Emerald Forest - Rich green forest tones
Rose Garden - Elegant rose and pink hues
Golden Sunset - Warm amber and gold colors
Indigo Night - Deep indigo midnight blues
Teal Lagoon - Refreshing teal waters
Orange Flame - Energetic orange fire
Cosmic Aurora - Multi-color cosmic gradients
Neon Cyber - Futuristic cyan and green
Volcano Fire - Intense red and orange
Deep Forest - Multiple green forest shades

Supported Platforms
Current

Web Application - Full-featured responsive web app
Progressive Web App - Install on mobile devices

Future Roadmap

React Native - Native iOS and Android apps
Electron - Cross-platform desktop application

Available Scripts
Development
bashnpm start          # Start development server
npm test           # Run tests in watch mode  
npm run lint       # Run ESLint
npm run lint:fix   # Fix ESLint errors
Production
bashnpm run build      # Build for production
npm run analyze    # Build and serve locally for testing
Supported Betting Platforms

DraftKings (2 accounts supported)
FanDuel
BetMGM
Bet365
Easy to add more platforms

Configuration
Environment Variables
envREACT_APP_API_URL=http://localhost:3001    # Backend API URL
Theme Customization
Themes are stored in src/styles/themes.js and can be easily customized or extended.
Features Toggle

Glow line animations can be toggled in user settings
Auto-backup functionality with localStorage
Theme persistence across sessions

Analytics Features
Performance Metrics

Net P&L - Total profit/loss across all accounts
Win Rate - Percentage of successful bets
ROI - Return on investment calculation
Profit Factor - Ratio of total wins to total losses
Average Bet Size - Mean wager amount
Current Streak - Active winning or losing streak

Account Insights

Individual account performance
Activity tracking with last action dates
Portfolio return percentages
Pending bet monitoring

Security Features

JWT token-based authentication
Automatic token validation and refresh
Secure API communication
Local data encryption for sensitive information

Accessibility

WCAG 2.1 AA compliant
Keyboard navigation support
Screen reader friendly
High contrast mode support
Reduced motion preferences respected
Focus indicators and proper ARIA labels

Performance

Code splitting for optimal loading
Lazy loading of components
Memoized calculations for large datasets
Efficient re-renders with React optimization
Progressive Web App capabilities

Testing
bashnpm test                    # Run tests
npm test -- --coverage     # Run with coverage
npm test -- --watch        # Run in watch mode
Build & Deployment
Production Build
bashnpm run build
Deployment Options

Vercel - Automatic deployments from Git
Netlify - Static site hosting with form handling
AWS S3 - Static website hosting
Docker - Containerized deployment

Docker Deployment
bash# Build image
docker build -t sportsbook-tracker-frontend .

# Run container
docker run -p 3000:80 sportsbook-tracker-frontend
Data Management
Import/Export

CSV export of all account data
CSV import for data migration
Automatic backup functionality
Manual bulk data import

Storage

Local theme and preferences storage
Secure token management
Auto-backup settings persistence

Contributing

Fork the repository
Create a feature branch (git checkout -b feature/amazing-feature)
Commit your changes (git commit -m 'Add amazing feature')
Push to the branch (git push origin feature/amazing-feature)
Open a Pull Request

Development Guidelines

Follow ESLint rules
Maintain test coverage above 80%
Use TypeScript for new components (optional)
Follow existing component patterns
Update documentation for new features

Troubleshooting
Common Issues
Build fails with memory issues:
bashexport NODE_OPTIONS=--max-old-space-size=4096
npm run build
API connection issues:

Verify backend server is running on port 3001
Check REACT_APP_API_URL environment variable
Ensure CORS is properly configured on backend

Theme not persisting:

Check localStorage permissions
Clear browser cache and try again

Dependencies
Core Dependencies

React 19.1.1 - UI library
Lucide React - Icon library
Web Vitals - Performance monitoring

Development Dependencies

React Scripts - Build tooling
Testing Library - Component testing
ESLint - Code linting

Performance Optimization

Bundle size optimization with code splitting
Image optimization and lazy loading
Efficient state management with Context API
Memoized expensive calculations
Virtualized lists for large datasets

Support
For support and questions:

Create an issue in the repository
Check the troubleshooting section
Review the documentation

License
This project is licensed under the MIT License - see the LICENSE file for details.

Built using React and modern web technologies
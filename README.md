# Investo

A modern investment group management platform built with React and Node.js.

## Project Structure

- `client/` - React frontend application (Vite + TypeScript)
- `server/` - Node.js backend API (Express + Sequelize + PostgreSQL)

## Features

- User authentication and authorization
- Group management and administration
- Real-time updates with Socket.IO
- Multi-language support (i18next)
- Auctions and bidding system
- Payment management
- Admin features and controls

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd investo
```

2. Install dependencies:
```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

3. Configure environment variables:

Create a `.env` file in the `server/` directory:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=investo
DB_USER=your_username
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
```

4. Initialize the database:
```bash
cd server
npm run db:init
npm run db:seed-features
npm run db:seed
```

5. Run the development server:

On Windows:
```bash
.\run-dev.ps1
```

Or manually:
```bash
# Terminal 1 - Start server
cd server
npm run dev

# Terminal 2 - Start client
cd client
npm run dev
```

## Scripts

### Server Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:init` - Initialize database
- `npm run db:seed` - Seed database with sample data

### Client Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Documentation

- [Role System](ROLE_SYSTEM.md)
- [Twilio Setup](server/TWILIO_SETUP.md)

## License

ISC


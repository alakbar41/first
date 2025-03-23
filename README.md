# ADA University Voting System

A secure and user-friendly university voting platform designed to empower ADA University students with an innovative, protected electoral participation experience.

## Features

- Secure user authentication with email verification
- Role-based access control for students and administrators
- Election creation and management
- Candidate registration and management
- Vote casting and verification via blockchain technology
- Real-time election results and analytics
- Mobile-responsive design

## Technologies Used

- **Frontend**: React.js with TypeScript, Tailwind CSS, Shadcn UI components
- **Backend**: Node.js with Express
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Session-based authentication with custom email verification
- **Blockchain**: Polygon Amoy Testnet for vote immutability and verification

## Project Structure

```
├── blockchain/            # Smart contract code and deployment scripts
├── client/                # React frontend application
│   ├── public/            # Static assets
│   └── src/               # Source code
│       ├── components/    # UI components
│       ├── hooks/         # Custom React hooks
│       ├── lib/           # Utility functions and services
│       ├── pages/         # Page components
│       └── types/         # TypeScript type definitions
├── server/                # Express backend application
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Data access layer
│   └── auth.js            # Authentication logic
└── shared/                # Shared code between frontend and backend
    └── schema.ts          # Database schema and validation
```

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Email account for sending verification emails

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ada-university-voting-system.git
   cd ada-university-voting-system
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Fill in the required environment variables

4. Set up the database schema:
   ```bash
   npm run db:push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open your browser and navigate to `http://localhost:5000`

## Authentication

The system provides two types of user roles:
- **Administrator**: Can create and manage elections and candidates
- **Student**: Can view elections and cast votes

### Default Administrator Account
- Email: admin@ada.edu.az
- Password: Admin123@

## Blockchain Integration

The vote casting is recorded on the Polygon Amoy testnet, ensuring transparency and immutability of the electoral process. The smart contract address is deployed at: `0x52F608AF1F45661E9294B11B2013d34C9566bAB6` on the Polygon Amoy testnet.

To interact with the blockchain features:
1. Install a Web3 wallet like MetaMask
2. Connect to the Polygon Amoy testnet
3. Ensure you have some testnet MATIC for gas fees

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- ADA University for inspiration and support
- Polygon for providing the Amoy testnet
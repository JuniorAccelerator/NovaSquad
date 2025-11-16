# Backend Setup Guide

## Prerequisites

1. **PostgreSQL** must be installed and running
   - Download from: https://www.postgresql.org/download/
   - Default port: 5432

## Database Setup

### Step 1: Create the Database

Open PostgreSQL command line (psql) or pgAdmin and run:

```sql
CREATE DATABASE hackathon_drawings;
```

### Step 2: Configure Environment Variables

Create a `.env` file in the `backend` directory with:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hackathon_drawings
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# Server Configuration
PORT=5000

# JWT Secret (change in production)
JWT_SECRET=your-secret-key-change-in-production

# Google Maps API Key (optional, for map features)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

**Important:** Replace `your_postgres_password` with your actual PostgreSQL password.

### Step 3: Install Dependencies

```bash
cd Hackathon/backend
npm install
```

### Step 4: Initialize Database Schema and Seed Data

```bash
npm run seed
```

This will:
- Create the necessary tables (users, drawings)
- Create a default user account:
  - Username: `admin`
  - Password: `admin123`

### Step 5: Start the Server

```bash
npm start
```

The server should start on `http://localhost:5000`

## Troubleshooting

### Error: "ECONNREFUSED"
- **Problem:** PostgreSQL is not running
- **Solution:** Start PostgreSQL service
  - Windows: Check Services, start "postgresql-x64-XX" service
  - Mac/Linux: `sudo service postgresql start` or `brew services start postgresql`

### Error: "Database does not exist"
- **Problem:** Database `hackathon_drawings` hasn't been created
- **Solution:** Run `CREATE DATABASE hackathon_drawings;` in PostgreSQL

### Error: "Authentication failed"
- **Problem:** Wrong database credentials
- **Solution:** Check your `.env` file and ensure DB_USER and DB_PASSWORD are correct

### Error: "500 Internal Server Error"
- Check the backend console for detailed error messages
- Ensure PostgreSQL is running
- Ensure database exists and is accessible
- Run `npm run seed` to initialize the database

## Default Account

After running the seed script, you can login with:
- **Username:** `admin`
- **Password:** `admin123`


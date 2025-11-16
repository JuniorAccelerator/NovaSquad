# Hackathon Project - Interactive Map Application

A modern web application built for Hackathon featuring Google Maps integration with drawing tools, built with React.js frontend and Express.js backend.

## Features

- 🗺️ Interactive Google Maps with full controls
- 🔍 Location search functionality
- 📍 Get current location using browser geolocation
- 🎯 Click on map to place markers
- 📱 Fully responsive design
- 🎨 Modern, beautiful UI with gradient design

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- PostgreSQL 18.1.1 (or compatible version)

## Installation

1. **Install all dependencies** (root, backend, and frontend):
   ```bash
   npm run install-all
   ```

   Or install manually:
   ```bash
   npm install
   cd backend && npm install && cd ..
   cd frontend && npm install && cd ..
   ```

2. **Set up PostgreSQL:**
   
   - Install PostgreSQL 18.1.1 from [postgresql.org](https://www.postgresql.org/download/)
   - Start PostgreSQL service
   - Create a database for the project:
     ```sql
     CREATE DATABASE hackathon_drawings;
     ```
   - Or use an existing database

3. **Configure Environment Variables:**
   
   Create a `backend/.env` file with the following:
   ```env
   PORT=5000
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   
   # PostgreSQL Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=hackathon_drawings
   DB_USER=postgres
   DB_PASSWORD=your_postgres_password
   ```
   
   The database schema (table) will be created automatically when you start the server.

4. **Seed the database with default data (optional):**
   
   To populate the database with sample drawings:
   ```bash
   cd backend
   npm run seed
   ```
   
   To reseed (clear existing data and add defaults):
   ```bash
   npm run seed -- --force
   ```

## Running the Application

### Option 1: Run both servers concurrently (Recommended)
```bash
npm run dev
```

This will start both the Express backend (port 5000) and React frontend (port 3000) simultaneously.

### Option 2: Run servers separately

**Terminal 1 - Backend:**
```bash
npm run server
```

**Terminal 2 - Frontend:**
```bash
npm run client
```

## Access the Application

Once running, open your browser and navigate to:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000/api/health

## Project Structure

```
hackaton/
├── backend/
│   ├── db/
│   │   └── connection.js # PostgreSQL connection and schema
│   ├── models/
│   │   └── Drawing.js    # PostgreSQL Drawing model
│   ├── server.js          # Express server
│   ├── package.json       # Backend dependencies
│   └── .env              # Environment variables (API key, DB config)
├── frontend/
│   ├── public/
│   │   └── index.html    # HTML template
│   ├── src/
│   │   ├── App.js        # Main React component
│   │   ├── App.css       # Styles
│   │   ├── index.js      # React entry point
│   │   └── index.css     # Global styles
│   └── package.json      # Frontend dependencies
├── package.json          # Root package.json
└── README.md            # This file
```

## API Endpoints

- `GET /api/config` - Returns Google Maps API key configuration
- `GET /api/health` - Health check endpoint (includes database status)
- `GET /api/drawings` - Get all drawings from database
- `GET /api/drawings/:id` - Get a single drawing by ID
- `POST /api/drawings` - Save a new drawing to database
- `DELETE /api/drawings/:id` - Delete a drawing by ID

## Google Maps API Key

The API key is configured in `backend/.env`. Make sure your Google Maps API key has the following APIs enabled in Google Cloud Console:

- Maps JavaScript API
- Geocoding API
- Places API (optional, for enhanced search)

## Development

- Backend uses Express.js with CORS enabled
- Frontend uses Create React App
- The React app proxies API requests to the backend (configured in `frontend/package.json`)

## Database

The application uses PostgreSQL 18.1.1 to persist all drawings. Each drawing entry includes:
- **ID**: Auto-incrementing primary key
- **Type**: marker, circle, polygon, polyline, or rectangle (with validation)
- **Data**: Drawing coordinates and properties (stored as JSONB)
- **Title**: User-provided title
- **Description**: Optional description
- **Timestamps**: Automatic `created_at` and `updated_at` timestamps

The database schema is automatically created when you start the server. The `drawings` table includes:
- Indexes on `type` and `created_at` for optimized queries
- JSONB data type for efficient storage and querying of drawing coordinates
- Constraints to ensure data integrity

Drawings are automatically saved when created through the drawing interface and are shared across all users in real-time.

**Default Data:** You can populate the database with sample drawings using the seed script:
```bash
cd backend
npm run seed
```

This will add 10 sample drawings (2 markers, 2 circles, 2 polygons, 2 polylines, and 2 rectangles) centered around Pazardzik, Bulgaria.

## Troubleshooting

1. **Port already in use:** Change the PORT in `backend/.env` or stop the process using the port
2. **Maps not loading:** Verify your Google Maps API key is valid and has the required APIs enabled
3. **CORS errors:** Ensure the backend CORS middleware is properly configured
4. **PostgreSQL connection errors:** 
   - Verify PostgreSQL is running (check service status)
   - Ensure the database exists: `CREATE DATABASE hackathon_drawings;`
   - Check your database credentials in `backend/.env` are correct
   - Verify PostgreSQL is listening on the configured port (default: 5432)
   - Check the server console for connection status messages
   - Ensure your PostgreSQL user has permissions to create tables

## License

ISC


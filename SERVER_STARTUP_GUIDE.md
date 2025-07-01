# 🚀 Chanspaw Platform Server Startup Guide

## Quick Start Options

### Option 1: Using Batch File (Windows - Easiest)
```bash
# Double-click this file or run in command prompt:
start-servers.bat
```

### Option 2: Using PowerShell Script (Windows)
```powershell
# Run in PowerShell:
.\start-servers.ps1
```

### Option 3: Using Node.js Script
```bash
# Run in terminal:
npm start
# or
node start-server.js
```

### Option 4: Manual Start
```bash
# Terminal 1 - Start Backend:
cd backend
node server.js

# Terminal 2 - Start Frontend:
npm run dev
```

## What Each Server Does

### Backend Server (Port 3001)
- Handles API requests
- Database operations
- Authentication
- Admin functions
- Game logic

### Frontend Server (Port 5174)
- React application
- User interface
- Game components
- Admin dashboard

## URLs After Startup

- **Frontend**: http://localhost:5174/
- **Backend API**: http://localhost:3001/
- **Admin Login**: admin@chanspaw.com / Chanspaw@2025!

## Troubleshooting

### If Backend Won't Start
1. Make sure you're in the backend folder
2. Check if port 3001 is available
3. Verify all dependencies are installed: `npm install`

### If Frontend Won't Start
1. Make sure you're in the root folder
2. Check if port 5174 is available
3. Verify all dependencies are installed: `npm install`

### If Both Servers Won't Start
1. Close any existing terminal windows
2. Restart your computer
3. Try running the batch file as administrator

## Stopping Servers

- **Batch File**: Close the command windows
- **PowerShell**: Press Ctrl+C
- **Node.js Script**: Press Ctrl+C
- **Manual**: Press Ctrl+C in each terminal

## Default Admin Credentials

- **Email**: admin@chanspaw.com
- **Password**: Chanspaw@2025!

## Need Help?

If you're still having issues:
1. Check the console for error messages
2. Make sure Node.js is installed
3. Verify all files are in the correct folders
4. Try running as administrator 
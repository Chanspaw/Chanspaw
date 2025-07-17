## Production Deployment Instructions

1. **Install dependencies:**
   ```sh
   npm install
   ```
2. **Build the frontend:**
   ```sh
   npm run build
   ```
3. **Copy the frontend build to backend/dist:**
   ```sh
   cp -r dist backend/dist
   ```
4. **Install backend dependencies:**
   ```sh
   cd backend && npm install && cd ..
   ```
5. **Run database migrations and generate Prisma client:**
   ```sh
   npx prisma generate --schema=backend/prisma/schema.prisma
   node backend/pre-migrate.js
   npx prisma migrate deploy --schema=backend/prisma/schema.prisma
   ```
6. **Start the backend server:**
   ```sh
   node backend/server.js
   ```

**Note:**
- Always ensure `cp -r dist backend/dist` is run after every frontend build and before starting the backend server in production.
- Do not commit `backend/dist` to git. The build and copy step must be part of your deploy process (e.g., Render build command). 
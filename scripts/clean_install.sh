#!/bin/bash
echo "------------------------------------------------"
echo "Starting Clean Install to fix Build Errors"
echo "------------------------------------------------"

echo "[1/4] Removing existing node_modules and lock file..."
rm -rf node_modules package-lock.json

echo "[2/4] Installing dependencies from scratch..."
npm install

echo "[3/4] Generating Prisma Client..."
npx prisma generate

echo "[4/4] Building project..."
npm run build

echo "------------------------------------------------"
echo "Done! If there are no errors above, run 'npm start'."
echo "------------------------------------------------"

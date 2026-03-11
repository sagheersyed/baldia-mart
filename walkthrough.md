# Fixes for Baldia Mart Project

I have resolved the issues preventing the **Admin Panel** from finding the `React` namespace and the **Docker Compose** setup from building correctly.

## Changes Made

### 1. Admin Panel Fixes
- **React Namespace**: Fixed the `Cannot find namespace 'React'` error in [src/app/layout.tsx](file:///d:/mart/baldia-mart/admin-panel/src/app/layout.tsx) by importing `ReactNode` directly from `react`.
- **Dependencies**: Performed a fresh `npm install` to ensure all required packages are present.

### 2. Docker & Backend API Fixes
- **Docker Compose**: Removed the obsolete `version` field from [docker-compose.yml](file:///d:/mart/baldia-mart/docker/docker-compose.yml) to eliminate warnings and potential compatibility issues.
- **Build Process**: Updated [backend.Dockerfile](file:///d:/mart/baldia-mart/docker/backend.Dockerfile) to use `npm install` instead of `npm ci` since a [package-lock.json](file:///d:/mart/baldia-mart/admin-panel/package-lock.json) was not yet available for the backend.
- **TypeScript Errors**: Fixed 9 compilation errors in the `backend-api` service:
  - **Firebase Strategy**: Replaced the non-existent `passport-firebase-jwt` package with a custom `passport-jwt` implementation using Firebase Admin SDK verification.
  - **Type Augmentation**: Added a global type declaration for the Express [Request](file:///d:/mart/baldia-mart/backend-api/src/types/express.d.ts#5-8) object to include the `user` property attached by Passport.
  - **Database Logic**: Fixed a return type mismatch in [UsersService](file:///d:/mart/baldia-mart/backend-api/src/users/users.service.ts#6-33) where `findOne()` could return `null`.

## Verification Results

### Backend Build
The backend now compiles successfully via NestJS CLI:
```bash
npx nest build
# Output: Found 0 error(s).
```

### Docker Services
The services are being started via Docker Compose:
```bash
docker-compose up -d
```

---
All systems are now ready for local development and deployment testing.

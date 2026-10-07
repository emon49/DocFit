# Tasks: Patient Registration & OTP Auth (`add-patient-auth`)

## 1. Database Schema & Data Models
- [x] 1.1 Create database schema migration for `Patient` table (`id`, `phone`, `name`, `dateOfBirth`, `gender`, `email`, `createdAt`, `updatedAt`).
- [x] 1.2 Create database schema migration for `OtpSession` table (`id`, `phone`, `otpHash`, `attemptsCount`, `expiresAt`, `lockedUntil`, `isVerified`, `createdAt`).
- [x] 1.3 Create database schema migration for `PatientSession` table (`id`, `patientId`, `token`, `expiresAt`, `createdAt`).

## 2. SMS Delivery Adapter & OTP Services
- [x] 2.1 Implement SMS Gateway Adapter interface with configurable production driver and local/mock dev driver.
- [x] 2.2 Implement OTP generation service (6-digit passcode generation, salted hashing, 5-minute TTL calculation).
- [x] 2.3 Implement rate limiting and security lockout logic (5 consecutive failed attempts -> 15-minute lockout flag on phone number).

## 3. Auth API Endpoints
- [x] 3.1 Implement `POST /api/auth/otp/request` endpoint to request OTP for a Bangladesh phone number.
- [x] 3.2 Implement `POST /api/auth/otp/verify` endpoint to validate OTP, increment failed attempt counters, trigger lockout on 5th failure, and route existing vs new users.
- [x] 3.3 Implement `POST /api/auth/register` endpoint to process new patient profiles (Name, DOB, Gender, optional Email) and generate prescription email warning when email is missing.
- [x] 3.4 Implement `GET /api/auth/me` and `POST /api/auth/logout` endpoints for active session validation and termination.

## 4. Automated Testing & Verification
- [x] 4.1 Write unit tests for OTP expiration (5 min) and security lockout (5 wrong attempts -> 15 min lock).
- [x] 4.2 Write integration test for new Patient registration flow (request OTP -> verify -> complete profile -> issue session).
- [x] 4.3 Write integration test for returning Patient login flow (request OTP -> verify -> restore session).
- [x] 4.4 Write test confirming system notice returned when email is omitted during registration.

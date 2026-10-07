# Design: Patient Registration & OTP Auth (`add-patient-auth`)

## Context
Patient authentication is the foundation for all patient-facing workflows in DocFit. The system operates via phone numbers and SMS OTP passcodes, bypassing traditional passwords.

## Architecture & System Flow

```
[ Patient Client ]
       |
       |  1. POST /api/auth/otp/request (Phone)
       v
[ Auth Service ] ---> [ SMS Gateway Adapter ] ---> (SMS to Bangladesh Phone)
       |
       |  2. POST /api/auth/otp/verify (Phone, OTP)
       v
[ Auth Service ] ---> Check OTP / Expiry / Lockout
       |
       |-- If existing patient --> Issue Session Token --> Return Authenticated Session
       |
       `-- If new user --> Mark OTP Verified --> Prompt Profile Completion
                               |
                               |  3. POST /api/auth/register (Name, DOB, Gender, optional Email)
                               v
                         [ Patient Record Created ] ---> Issue Session Token
```

## Data Models

### `Patient`
| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | Primary Key | Unique patient ID |
| `phone` | String | Unique, Indexed | Bangladesh phone number (E.164 format) |
| `name` | String | Required | Full name of patient |
| `dateOfBirth` | Date | Required | Patient date of birth |
| `gender` | Enum | Required (`MALE`, `FEMALE`, `OTHER`) | Patient gender |
| `email` | String | Nullable | Optional email address |
| `createdAt` | DateTime | Auto | Record creation timestamp |
| `updatedAt` | DateTime | Auto | Record last updated timestamp |

### `OtpSession`
| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | Primary Key | OTP transaction ID |
| `phone` | String | Indexed | Target phone number |
| `otpHash` | String | Required | Salted hash of 6-digit OTP |
| `attemptsCount` | Integer | Default `0` | Consecutive failed verification attempts |
| `expiresAt` | DateTime | Required | Expiration timestamp (5 minutes from creation) |
| `lockedUntil` | DateTime | Nullable | Lockout end time (15 minutes after 5 failures) |
| `isVerified` | Boolean | Default `false` | Set to true upon successful OTP entry |
| `createdAt` | DateTime | Auto | Creation timestamp |

### `PatientSession`
| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | Primary Key | Session record ID |
| `patientId` | UUID | Foreign Key -> `Patient.id` | Patient reference |
| `token` | String | Unique, Indexed | Cryptographically secure bearer token / JWT |
| `expiresAt` | DateTime | Required | Session expiration timestamp |
| `createdAt` | DateTime | Auto | Creation timestamp |

## API Contracts

### 1. `POST /api/auth/otp/request`
- **Request Body**: `{ "phone": "+8801700000000" }`
- **Logic**:
  - Validates phone format (Bangladesh E.164).
  - Checks if `lockedUntil` is active on any active `OtpSession` for this phone number. If active, returns HTTP 429 (Too Many Requests) with remaining lock time.
  - Generates a random 6-digit OTP code, saves hashed OTP to `OtpSession` with `expiresAt = now() + 5 min`.
  - Triggers SMS delivery via SMS provider adapter.
- **Response**: `{ "success": true, "message": "OTP sent successfully", "isRegistered": true|false }`

### 2. `POST /api/auth/otp/verify`
- **Request Body**: `{ "phone": "+8801700000000", "otp": "123456" }`
- **Logic**:
  - Fetches active `OtpSession` for phone number.
  - Checks if `now() > expiresAt`. If expired, returns HTTP 400 (`OTP_EXPIRED`).
  - Verifies `otp` against `otpHash`.
  - **If invalid**:
    - Increments `attemptsCount`.
    - If `attemptsCount >= 5`, sets `lockedUntil = now() + 15 min` and returns HTTP 429 (`ACCOUNT_LOCKED_15_MIN`).
    - Otherwise returns HTTP 400 (`INVALID_OTP`, remaining attempts count).
  - **If valid**:
    - Marks `isVerified = true`.
    - Checks if phone exists in `Patient` table.
    - If registered: Creates `PatientSession`, returns session token and patient profile (`isNewUser: false`).
    - If new user: Returns token/ticket indicating OTP verified (`isNewUser: true`), prompting profile completion.

### 3. `POST /api/auth/register`
- **Headers**: Authorization token or OTP verification token.
- **Request Body**:
  ```json
  {
    "phone": "+8801700000000",
    "name": "Jane Doe",
    "dateOfBirth": "1995-05-15",
    "gender": "FEMALE",
    "email": null
  }
  ```
- **Logic**:
  - Verifies that phone number OTP status is `isVerified = true`.
  - Ensures required profile fields are present (`name`, `dateOfBirth`, `gender`).
  - Creates new `Patient` record.
  - Generates `PatientSession`.
- **Response**:
  ```json
  {
    "patient": {
      "id": "uuid",
      "phone": "+8801700000000",
      "name": "Jane Doe",
      "dateOfBirth": "1995-05-15",
      "gender": "FEMALE",
      "email": null
    },
    "token": "bearer-token-string",
    "notice": "Prescription PDFs cannot be emailed until an email address is added to your profile."
  }
  ```

### 4. `GET /api/auth/me`
- Returns current authenticated patient session and profile.

### 5. `POST /api/auth/logout`
- Invalidation of current session token.

## Security & Reliability Considerations

1. **OTP Hash Storage**: OTP passcodes must never be logged or stored as plaintext in the database; only salted hashes are stored.
2. **Rate Limiting & Lockout**: Hard lockout at 5 consecutive wrong OTP attempts per phone number for 15 minutes prevents brute-force attacks.
3. **5-Minute Expiry**: Expired OTP passcodes are rejected immediately upon verification request.
4. **Email Notice Flag**: System flags profile responses where `email == null` so the UI can display the required notification regarding Prescription PDF email delivery.

# Proposal: Patient Registration & OTP Auth (`add-patient-auth`)

## Why
DocFit requires a simple, low-friction authentication mechanism tailored for healthcare consumers in Bangladesh. Phone-number-based One-Time Passcode (OTP) authentication eliminates password friction and uses the phone number as the core identity anchor across appointments, SMS reminders, and consultation sessions.

## What
Implement feature **F-01 "Patient Registration & OTP Auth"** from `PRD.md`:
- **OTP Authentication**: Authenticate patients via phone number using 6-digit OTPs without password setup.
- **Profile Onboarding**: Collect essential demographic data (Name, Date of Birth, Gender, Phone Number) during initial registration.
- **Optional Email**: Allow optional email input with system notice explaining that prescription PDFs are delivered via email when present.
- **OTP Security Controls**: Enforce a 5-minute OTP lifespan and a 15-minute lockout after 5 consecutive failed OTP entries.
- **Returning User Recognition**: Automatically detect existing patient accounts and route them through session restoration upon OTP verification.

## Capabilities

### `auth`
- Creates the `auth` capability specification (`specs/auth/spec.md`).
- Defines requirements and acceptance scenarios for phone number entry, OTP generation and verification, security lockouts, profile creation, and returning user session restoration.

## In Scope
- Phone number input and OTP request handling.
- OTP verification and attempt tracking.
- Profile completion form (Full Name, Date of Birth, Gender, optional Email).
- Email omission notice handling.
- Patient session token generation and session state management.

## Out of Scope
- Password-based authentication or social sign-in.
- Doctor onboarding or Admin authentication (defined in F-02 and F-04).
- Patient home address collection.

## Impact
- Establishes the primary `Patient` data model and authentication infrastructure required by subsequent features (Doctor discovery, Appointment booking, Video consultations).

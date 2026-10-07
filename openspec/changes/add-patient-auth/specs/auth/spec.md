# Auth Capability Specification Delta

## Requirements

### Requirement: OTP Authentication
The system SHALL authenticate Patients using a one-time passcode (OTP) sent to their phone number only; no password is set or stored.

#### Scenario: First-time registration
- **WHEN** a Patient enters a phone number not yet in the system
- **THEN** the system sends an OTP, verifies it, and prompts the Patient to complete their profile (name, DOB, gender, optional email).

#### Scenario: Returning login
- **WHEN** a registered Patient enters their phone number
- **THEN** the system sends an OTP and, upon correct entry, restores their session.

#### Scenario: OTP expiry
- **WHEN** a Patient enters an OTP more than 5 minutes after it was sent
- **THEN** the system rejects it and offers to resend.

#### Scenario: Repeated wrong OTP
- **WHEN** a Patient enters an incorrect OTP 5 times consecutively
- **THEN** the system locks that phone number from OTP requests for 15 minutes.

### Requirement: Profile Data Collection
The system SHALL collect name, phone number, date of birth, and gender at registration; email address is optional and NOT required.

#### Scenario: Email omitted
- **WHEN** a Patient completes registration without an email
- **THEN** the account is created and a notice is shown that Prescription PDFs cannot be emailed until an email is added.

#### Scenario: Phone already registered
- **WHEN** a Patient enters a phone number already associated with an account
- **THEN** the system routes them through the login OTP flow, not a new registration.

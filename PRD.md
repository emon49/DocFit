# PRD: DocFit

> Source idea: `docs/idea.md` · Glossary: `GLOSSARY.md` · ADRs: `docs/adr/` · Last updated: 2026-10-07

## 1. Overview

### Problem

Patients in Bangladesh seeking online medical consultations often do not know which type of specialist to see, leading to wrong bookings, wasted time, and delayed care. Existing telemedicine platforms require the patient to already know their specialty. DocFit solves this with an AI model that maps symptom descriptions to the right medical Specialty and connects the Patient with a verified, available Doctor.

### Users

- **Patient**: describes symptoms, gets routed to the right Specialty, books a Consultation, and receives a Prescription
- **Doctor**: manages availability, conducts video Consultations, generates Prescriptions, earns per-Consultation fees
- **Admin**: approves incoming Doctor applications and maintains the medicines database

### Goals and success metrics

| Goal | Metric | Target | Traces |
|------|--------|--------|--------|
| Correct specialty routing | % of Specialty Matches accepted without override by Patient | ≥ 85% | D-08, D-09 |
| Consultation completion | % of confirmed Appointments that result in a completed Consultation | ≥ 90% | D-22 |
| Doctor no-show rate | % of Appointments triggering automatic refund due to Doctor no-show | ≤ 5% | D-22 |

*Targets are proposed defaults — see Deferred questions (D-25).*

### Non-goals

- Walk-in / waiting-room queue (D-03)
- Native mobile app for v1 (D-02)
- Bengali language UI for v1 (D-19)
- Patient home address collection (D-24)
- External pharmacy or lab system integration
- Insurance or government health scheme billing

---

## 2. Cross-cutting requirements

- **NFR-01**: The system SHALL be a responsive web application only; native mobile apps are out of scope for v1. *(Traces: D-02)*
- **NFR-02**: All user-facing text SHALL be in English. *(Traces: D-19)*
- **NFR-03**: All phone numbers, payment methods, and legal compliance SHALL be scoped to Bangladesh for v1. *(Traces: D-01)*
- **NFR-04**: All patient health data (symptoms, diagnoses, Prescriptions) SHALL be encrypted in transit via TLS 1.2+ and encrypted at rest.
- **NFR-05**: Patient personal data SHALL be retained in accordance with applicable Bangladeshi data protection regulations.

---

## 3. Feature map

| ID | Feature | OpenSpec change | Capability | Depends on | Priority |
|----|---------|-----------------|------------|------------|----------|
| F-01 | Patient registration & OTP auth | `add-patient-auth` | `auth` | — | P0 |
| F-02 | Doctor onboarding & profile | `add-doctor-onboarding` | `doctors` | F-01 | P0 |
| F-03 | Symptom input & specialty matching | `add-symptom-matching` | `matching` | — | P0 |
| F-04 | Admin panel | `add-admin-panel` | `admin` | F-02 | P0 |
| F-05 | Doctor discovery & availability | `add-doctor-discovery` | `doctors` | F-02, F-04 | P0 |
| F-06 | Appointment booking & payment | `add-appointment-booking` | `appointments` | F-03, F-05 | P0 |
| F-07 | Video consultation | `add-video-consultation` | `consultations` | F-06 | P0 |
| F-08 | Prescription generation & delivery | `add-prescription-generation` | `prescriptions` | F-07 | P0 |
| F-09 | Consultation history | `add-consultation-history` | `consultations` | F-07, F-08 | P1 |
| F-10 | Post-consultation ratings | `add-doctor-ratings` | `doctors` | F-07 | P1 |

**Build order:** F-01 → F-02 → (F-03 ∥ F-04) → F-05 → F-06 → F-07 → F-08 → (F-09 ∥ F-10)

---

## 4. Features

### F-01 · Patient Registration & OTP Auth

| OpenSpec change | Capability | Depends on | Priority |
|---|---|---|---|
| `add-patient-auth` | `auth` | — | P0 |

**Propose with:**
```
/opsx:propose add-patient-auth Implement F-01 "Patient Registration & OTP Auth" from PRD.md. Use its requirements and scenarios as the spec delta for the `auth` capability.
```

**Why:** Establishes the identity layer every other Patient-facing feature depends on. OTP lowers friction for first-time users unfamiliar with passwords.

**In scope**
- Phone number–based OTP registration and login
- Profile creation: name, DOB, gender; optional email
- Session management

**Out of scope**
- Social login, email/password
- Patient home address
- Doctor or Admin authentication (see F-02, F-04)

**Requirements**

- **OTP authentication**: The system SHALL authenticate Patients using a one-time passcode sent to their phone number only; no password is set or stored. *(Traces: D-21)*
  - *Scenario: first-time registration*: **WHEN** a Patient enters a phone number not yet in the system **THEN** the system sends an OTP, verifies it, and prompts the Patient to complete their profile (name, DOB, gender, optional email).
  - *Scenario: returning login*: **WHEN** a registered Patient enters their phone number **THEN** the system sends an OTP and, upon correct entry, restores their session.
  - *Scenario: OTP expiry*: **WHEN** a Patient enters an OTP more than 5 minutes after it was sent **THEN** the system rejects it and offers to resend.
  - *Scenario: repeated wrong OTP*: **WHEN** a Patient enters an incorrect OTP 5 times consecutively **THEN** the system locks that phone number from OTP requests for 15 minutes.

- **Profile data**: The system SHALL collect name, phone number, date of birth, and gender at registration; email address is optional and NOT required. *(Traces: D-24)*
  - *Scenario: email omitted*: **WHEN** a Patient completes registration without an email **THEN** the account is created and a notice is shown that Prescription PDFs cannot be emailed until an email is added.
  - *Scenario: phone already registered*: **WHEN** a Patient enters a phone number already associated with an account **THEN** the system routes them through the login OTP flow, not a new registration.

**Acceptance criteria**
- [ ] A new Patient can register, receive an OTP, and complete a profile in one session
- [ ] A returning Patient can log in via OTP without re-entering profile data
- [ ] An expired or incorrect OTP is rejected with a clear message
- [ ] A Patient who omits email can still complete registration

---

### F-02 · Doctor Onboarding & Profile

| OpenSpec change | Capability | Depends on | Priority |
|---|---|---|---|
| `add-doctor-onboarding` | `doctors` | F-01 | P0 |

**Propose with:**
```
/opsx:propose add-doctor-onboarding Implement F-02 "Doctor Onboarding & Profile" from PRD.md. Use its requirements and scenarios as the spec delta for the `doctors` capability.
```

**Why:** Doctors must be onboarded and Admin-approved before any Consultation flow is possible. This feature also establishes the data model for availability and fees.

**In scope**
- Doctor self-registration form
- Profile: name, BMDC registration number, Specialty, photo, bio, consultation fee, weekly availability schedule
- "Pending" state until Admin approval

**Out of scope**
- Automated BMDC credential verification via external API
- Multiple Specialties per Doctor in v1

**Requirements**

- **Profile fields**: A Doctor SHALL provide name, BMDC registration number, Specialty (one of: Medicine, Orthopedics, Dermatology, Gynecology, Pediatrics), profile photo, bio, consultation fee, and weekly availability schedule at registration. *(Traces: D-08, D-14)*
  - *Scenario: incomplete submission*: **WHEN** a Doctor submits the registration form with any required field missing **THEN** the system rejects the submission and highlights the missing fields.

- **Pending state**: A Doctor account SHALL be placed in "pending" state upon registration and SHALL NOT be visible to Patients or able to receive Appointments until an Admin approves it. *(Traces: D-06)*
  - *Scenario: unapproved Doctor browsed*: **WHEN** a Patient searches for Doctors **THEN** Doctors in "pending" or "rejected" state SHALL NOT appear in results.

- **Fee setting**: Each Doctor SHALL set their own consultation fee; DocFit SHALL retain 20% of each collected fee as platform commission. *(Traces: D-14)*
  - *Scenario: fee displayed to Patient*: **WHEN** a Patient views a Doctor profile **THEN** the full Doctor-set fee (before commission deduction) is displayed.

- **Availability schedule**: A Doctor SHALL define their weekly recurring availability in 30-minute Slots; individual days may be marked unavailable. *(Traces: D-15)*

**Acceptance criteria**
- [ ] A Doctor can submit a complete registration form and enter "pending" state
- [ ] A pending Doctor does not appear in Patient-facing Doctor lists
- [ ] Doctor fee and availability schedule are editable after approval
- [ ] The 20% platform commission is recorded on each Appointment

---

### F-03 · Symptom Input & Specialty Matching

| OpenSpec change | Capability | Depends on | Priority |
|---|---|---|---|
| `add-symptom-matching` | `matching` | — | P0 |

**Propose with:**
```
/opsx:propose add-symptom-matching Implement F-03 "Symptom Input & Specialty Matching" from PRD.md. Use its requirements and scenarios as the spec delta for the `matching` capability.
```

**Why:** DocFit's core differentiator — eliminating the need for Patients to self-diagnose which type of Doctor they need.

**In scope**
- Text-based symptom description input (unauthenticated)
- AI model returns top Specialty Match(es)
- Manual specialty override for Patients who already know their Specialty

**Out of scope**
- Voice input (deferred — see Deferred questions, D-26)
- Storing symptom descriptions of unauthenticated visitors

**Requirements**

- **Public access**: The symptom input and Specialty Matching flow SHALL be accessible without login. *(Traces: D-20)*
  - *Scenario: unauthenticated match*: **WHEN** an unauthenticated visitor submits a symptom description **THEN** the system returns a Specialty Match result without requiring login.

- **Match result**: The system SHALL return the single top Specialty when model confidence is high, or the top 2–3 Specialties for the Patient to choose when confidence is low. *(Traces: D-09)*
  - *Scenario: high-confidence match*: **WHEN** the model confidence exceeds the threshold **THEN** the system displays one Specialty and a "Find Doctors in this specialty" call to action.
  - *Scenario: low-confidence match*: **WHEN** the model confidence is at or below the threshold **THEN** the system displays 2–3 Specialty options and asks the Patient to select the most relevant.
  - *Scenario: no match*: **WHEN** the model cannot match the description to any Specialty **THEN** the system defaults to Medicine (General Physician) and informs the Patient of the fallback.

- **Manual override**: The system SHALL provide an "I already know my specialty" path that lets a Patient select a Specialty directly without entering symptoms. *(Traces: D-09)*

- **Supported Specialties**: The system SHALL support exactly five Specialties at launch: Medicine, Orthopedics, Dermatology, Gynecology, Pediatrics. *(Traces: D-08)*

**Acceptance criteria**
- [ ] An unauthenticated visitor can submit symptoms and receive a Specialty Match without being redirected to login
- [ ] A high-confidence match displays one Specialty; a low-confidence match displays 2–3 options
- [ ] Unmatched input falls back to Medicine with a visible explanation
- [ ] The manual specialty selection path works independently of symptom input

---

### F-04 · Admin Panel

| OpenSpec change | Capability | Depends on | Priority |
|---|---|---|---|
| `add-admin-panel` | `admin` | F-02 | P0 |

**Propose with:**
```
/opsx:propose add-admin-panel Implement F-04 "Admin Panel" from PRD.md. Use its requirements and scenarios as the spec delta for the `admin` capability.
```

**Why:** Without an approval mechanism no Doctors can go live, and without a medicines database UI the Prescription feature (F-08) has no data to draw from.

**In scope**
- Doctor application review: approve or reject with a reason
- Medicines database management: add, edit, deactivate

**Out of scope**
- Platform analytics dashboard (post-v1)
- Patient account management by Admin

**Requirements**

- **Doctor approval**: An Admin SHALL approve or reject a pending Doctor application and SHALL provide a reason when rejecting. *(Traces: D-06)*
  - *Scenario: approval*: **WHEN** an Admin approves a Doctor **THEN** the Doctor's status changes to "approved", they become visible to Patients, and the system sends the Doctor an SMS notification. *(Traces: D-07)*
  - *Scenario: rejection*: **WHEN** an Admin rejects a Doctor **THEN** the Doctor's status changes to "rejected", they are not shown to Patients, and the system sends the Doctor an SMS notification containing the rejection reason. *(Traces: D-07)*
  - *Scenario: re-application after rejection*: **WHEN** a rejected Doctor updates their profile and resubmits **THEN** their status returns to "pending" for Admin review.

- **Medicines management**: An Admin SHALL add medicines (name, generic name, available forms, standard dosages) and SHALL deactivate existing medicines from the curated list. *(Traces: D-16)*
  - *Scenario: deactivated medicine on new Prescription*: **WHEN** a Doctor opens the Prescription form **THEN** deactivated medicines SHALL NOT appear in the medicines dropdown.
  - *Scenario: deactivated medicine on existing Prescription*: **WHEN** an Admin deactivates a medicine already listed on a previously submitted Prescription **THEN** the deactivation applies only to new Prescriptions; existing Prescriptions are unaffected.

**Acceptance criteria**
- [ ] Admin can approve a pending Doctor; Doctor immediately appears in Patient-facing search
- [ ] Admin can reject a Doctor with a reason; Doctor receives an SMS notification
- [ ] Admin can add a medicine; it appears in the Prescription dropdown
- [ ] Admin can deactivate a medicine; it disappears from the Prescription dropdown on new Prescriptions

---

### F-05 · Doctor Discovery & Availability

| OpenSpec change | Capability | Depends on | Priority |
|---|---|---|---|
| `add-doctor-discovery` | `doctors` | F-02, F-04 | P0 |

**Propose with:**
```
/opsx:propose add-doctor-discovery Implement F-05 "Doctor Discovery & Availability" from PRD.md. Use its requirements and scenarios as the spec delta for the `doctors` capability.
```

**Why:** Patients arriving from a Specialty Match need to browse and select a specific Doctor before booking.

**In scope**
- Specialty-filtered Doctor listing
- Doctor profile page with available Slots
- Login gate before Slot selection

**Out of scope**
- Search by Doctor name in v1
- Filters beyond Specialty, availability, and fee in v1

**Requirements**

- **Doctor listing**: The system SHALL display approved Doctors filtered by Specialty, showing each Doctor's name, photo, Specialty, consultation fee, average rating, and next available Slot. *(Traces: D-08, D-14, D-18)*

- **Slot display**: The system SHALL show available 30-minute Slots for each Doctor up to 7 days in advance. *(Traces: D-13, D-15)*
  - *Scenario: all Slots booked*: **WHEN** all of a Doctor's Slots for the next 7 days are booked **THEN** the Doctor card shows "No availability in the next 7 days".
  - *Scenario: simultaneous booking conflict*: **WHEN** a Patient is viewing a Slot that gets booked by another Patient simultaneously **THEN** the Slot is removed from the view and the Patient is shown a message to select another Slot.

- **Login gate**: The system SHALL prompt an unauthenticated visitor to log in or register when they attempt to select a Slot. *(Traces: D-20)*
  - *Scenario: post-login redirect*: **WHEN** a visitor logs in after being gated on the Slot selection **THEN** the system returns them to the same Doctor's availability page.

**Acceptance criteria**
- [ ] Only approved Doctors appear in Specialty listings
- [ ] Slots beyond 7 days are not shown
- [ ] An unauthenticated visitor who selects a Slot is redirected to login, then returned to the same Doctor's page
- [ ] A Doctor with no Slots in the next 7 days shows an appropriate message

---

### F-06 · Appointment Booking & Payment

| OpenSpec change | Capability | Depends on | Priority |
|---|---|---|---|
| `add-appointment-booking` | `appointments` | F-03, F-05 | P0 |

**Propose with:**
```
/opsx:propose add-appointment-booking Implement F-06 "Appointment Booking & Payment" from PRD.md. Use its requirements and scenarios as the spec delta for the `appointments` capability.
```

**Why:** Converts a Slot selection into a confirmed, paid Appointment and establishes the cancellation and refund contract.

**In scope**
- Slot selection and checkout
- Payment via SSLCommerz
- Email confirmation + SMS reminder to Patient; SMS notification to Doctor
- Cancellation and refund

**Out of scope**
- Partial refunds
- Rescheduling (cancel + rebook is the path in v1)

**Requirements**

- **Payment**: The system SHALL process Appointment payments via SSLCommerz; a Slot SHALL be locked only upon SSLCommerz payment confirmation. *(Traces: D-10)*
  - *Scenario: payment failure*: **WHEN** SSLCommerz reports a payment failure **THEN** the Slot is NOT locked and the Patient is shown an error with the option to retry.
  - *Scenario: payment timeout*: **WHEN** a Patient does not complete payment within 10 minutes of initiating checkout **THEN** the held Slot is released.

- **Notifications on booking**: The system SHALL send an email confirmation (Appointment date, time, Doctor name, fee receipt) to the Patient upon booking. The system SHALL send an SMS reminder to the Patient 1 hour before the Appointment start. The system SHALL send an SMS notification to the Doctor upon each new confirmed Appointment. *(Traces: D-07)*

- **Cancellation & refund**: A Patient SHALL receive a full refund when cancelling more than 2 hours before the scheduled Appointment start. A Patient SHALL NOT receive a refund when cancelling within 2 hours of the scheduled Appointment start. *(Traces: D-13)*
  - *Scenario: on-time cancellation*: **WHEN** a Patient cancels more than 2 hours before the Appointment start **THEN** the system initiates a full refund via SSLCommerz and releases the Slot.
  - *Scenario: late cancellation*: **WHEN** a Patient cancels within 2 hours of the Appointment start **THEN** the system records the cancellation, marks the Slot unavailable, and issues no refund.

- **Commission**: DocFit SHALL retain 20% of the consultation fee as platform commission; the remaining 80% is credited to the Doctor. *(Traces: D-14)*

**Acceptance criteria**
- [ ] A Slot is locked only after successful SSLCommerz payment confirmation
- [ ] Patient receives an email confirmation immediately after booking
- [ ] Patient receives an SMS reminder 1 hour before the Appointment
- [ ] Cancellation more than 2 hours before start triggers a full refund
- [ ] Cancellation within 2 hours of start records the cancellation with no refund

---

### F-07 · Video Consultation

| OpenSpec change | Capability | Depends on | Priority |
|---|---|---|---|
| `add-video-consultation` | `consultations` | F-06 | P0 |

**Propose with:**
```
/opsx:propose add-video-consultation Implement F-07 "Video Consultation" from PRD.md. Use its requirements and scenarios as the spec delta for the `consultations` capability.
```

**Why:** The core Consultation experience — connects Patient and Doctor in a time-boxed video session.

**In scope**
- Daily.co video room provisioned per Appointment
- Join link active 5 minutes before scheduled start
- 30-minute session cap
- Automatic full refund on Doctor no-show (> 10 minutes)
- Doctor access to Patient's DocFit history during session

**Out of scope**
- Recording Consultations
- In-session text chat or file sharing in v1

**Requirements**

- **Video infrastructure**: The system SHALL provision a Daily.co video room for each confirmed Appointment. *(Traces: D-12)*
  - *Scenario: joining on time*: **WHEN** a Patient or Doctor opens the join link within 5 minutes before the scheduled start or during the session **THEN** the Daily.co room is accessible.
  - *Scenario: early join attempt*: **WHEN** a Patient attempts to join more than 5 minutes before the scheduled start **THEN** they see a countdown and are not yet admitted to the room.

- **Session duration**: The system SHALL end the video session after 30 minutes from the scheduled start time. *(Traces: D-15)*
  - *Scenario: end-of-session warning*: **WHEN** 5 minutes remain in the Consultation **THEN** both parties receive an in-session notification.

- **Doctor no-show refund**: The system SHALL issue an automatic full refund to the Patient if the Doctor has not joined the Daily.co room within 10 minutes of the scheduled start time. *(Traces: D-22)*
  - *Scenario: Doctor joins late (> 10 min)*: **WHEN** the Doctor joins after the 10-minute window has elapsed **THEN** the refund has already been issued and the room is closed.
  - *Scenario: Doctor joins within 10 min*: **WHEN** the Doctor joins within 10 minutes of the scheduled start **THEN** no refund is triggered and the session proceeds normally.

- **Patient history access**: During an active Consultation, the Doctor SHALL be able to view the Patient's past DocFit Consultations and Prescriptions. *(Traces: D-17)*

**Acceptance criteria**
- [ ] A Daily.co room is provisioned for each confirmed Appointment
- [ ] Join links become active 5 minutes before scheduled start
- [ ] Session automatically ends at 30 minutes from scheduled start
- [ ] If Doctor has not joined at the 10-minute mark, a full refund is issued and the room is closed
- [ ] Doctor can view Patient's consultation history from within the Consultation interface

---

### F-08 · Prescription Generation & Delivery

| OpenSpec change | Capability | Depends on | Priority |
|---|---|---|---|
| `add-prescription-generation` | `prescriptions` | F-07 | P0 |

**Propose with:**
```
/opsx:propose add-prescription-generation Implement F-08 "Prescription Generation & Delivery" from PRD.md. Use its requirements and scenarios as the spec delta for the `prescriptions` capability.
```

**Why:** Closes the Consultation loop — a structured Prescription is the primary deliverable the Patient takes away from the session.

**In scope**
- Structured Prescription form for the Doctor
- Required fields enforced before submission
- PDF generation
- PDF emailed to Patient (if email on file) + viewable in-app

**Out of scope**
- E-signature or digital stamp
- Pharmacy system integration

**Requirements**

- **Required fields**: The system SHALL require the following fields before a Prescription can be submitted: patient name, patient age, date, diagnosis / chief complaint, at least one medicine entry (name, dosage, frequency, duration), Doctor name, Doctor Specialty. An optional "Notes / Advice" free-text field SHALL also be available. *(Traces: D-23)*
  - *Scenario: incomplete form*: **WHEN** a Doctor submits a Prescription with any required field missing **THEN** the system highlights the missing fields and does not submit.

- **Medicine selection**: Medicines SHALL be selected from the DocFit curated medicines list; free-text medicine entry is NOT permitted. *(Traces: D-16)*
  - *Scenario: medicine not in list*: **WHEN** a Doctor cannot find a medicine in the dropdown **THEN** they may request the Admin to add it; they cannot add it themselves via the Prescription form.

- **PDF generation**: The system SHALL generate a formatted PDF Prescription upon submission. *(Traces: D-11)*

- **Delivery**: The system SHALL email the PDF to the Patient's registered email address if one is on file. The Prescription SHALL be viewable in-app in the Patient's consultation history regardless of whether an email address exists. *(Traces: D-11, D-24)*
  - *Scenario: no email on file*: **WHEN** a Patient has no email address registered **THEN** the system stores the Prescription PDF in-app only and does not attempt to send an email.

**Acceptance criteria**
- [ ] Doctor cannot submit a Prescription with any required field empty
- [ ] Medicines dropdown shows only active entries from the curated list
- [ ] A PDF is generated and accessible in-app immediately after submission
- [ ] PDF is emailed to Patient when an email address is on file; no error is raised when it is not

---

### F-09 · Consultation History

| OpenSpec change | Capability | Depends on | Priority |
|---|---|---|---|
| `add-consultation-history` | `consultations` | F-07, F-08 | P1 |

**Propose with:**
```
/opsx:propose add-consultation-history Implement F-09 "Consultation History" from PRD.md. Use its requirements and scenarios as the spec delta for the `consultations` capability.
```

**Why:** Gives Patients ongoing access to their medical records and lets Doctors provide continuity of care.

**In scope**
- Patient view: past Consultations with Prescription PDFs
- Doctor view: their past Consultations
- Doctor access to Patient's DocFit history during an active Consultation

**Out of scope**
- Sharing history with external healthcare providers
- Importing records from outside DocFit

**Requirements**

- **Patient history**: The system SHALL store all completed Consultations per Patient and display a list showing date, Doctor name, Specialty, and a link to the Prescription PDF. *(Traces: D-17)*
  - *Scenario: no history yet*: **WHEN** a Patient views their history tab with no completed Consultations **THEN** the system shows an empty-state message prompting them to book their first Consultation.

- **Doctor history**: The system SHALL display a Doctor's past Consultations (date, Patient pseudonym, Specialty) in the Doctor's dashboard.

- **In-Consultation access**: During an active Consultation, the Doctor SHALL be able to view the Patient's full DocFit history (past Consultations and Prescriptions). *(Traces: D-17)*

**Acceptance criteria**
- [ ] Patient can view all past Consultations and open any Prescription PDF from their history tab
- [ ] Doctor can view their Consultation history from their dashboard
- [ ] Patient history is accessible to Doctor from within the active Consultation interface

---

### F-10 · Post-Consultation Ratings

| OpenSpec change | Capability | Depends on | Priority |
|---|---|---|---|
| `add-doctor-ratings` | `doctors` | F-07 | P1 |

**Propose with:**
```
/opsx:propose add-doctor-ratings Implement F-10 "Post-Consultation Ratings" from PRD.md. Use its requirements and scenarios as the spec delta for the `doctors` capability.
```

**Why:** Builds Patient trust by surfacing Doctor quality; helps Patients choose confidently.

**In scope**
- Post-Consultation rating prompt (1–5 stars + optional comment)
- Ratings displayed on Doctor profile and discovery listing

**Out of scope**
- Admin moderation of comments in v1
- Doctor responses to reviews in v1

**Requirements**

- **Rating prompt**: The system SHALL prompt the Patient to rate their Doctor after each completed Consultation. *(Traces: D-18)*
  - *Scenario: rating skipped*: **WHEN** a Patient dismisses the rating prompt without rating **THEN** the system does not prompt again for that Consultation.
  - *Scenario: rating submitted*: **WHEN** a Patient submits a 1–5 star rating with an optional comment **THEN** the system records it and updates the Doctor's average rating immediately.

- **Rating display**: A Doctor's average rating and total review count SHALL be displayed on their profile and in the Doctor discovery listing. *(Traces: D-18)*
  - *Scenario: no ratings yet*: **WHEN** a Doctor has not yet received any ratings **THEN** their profile shows "No ratings yet" rather than a zero-star display.

**Acceptance criteria**
- [ ] Patient receives a rating prompt after a Consultation ends
- [ ] A submitted rating immediately updates the Doctor's average on their profile
- [ ] A Doctor with no ratings shows "No ratings yet" rather than 0 stars

---

## 5. Integrations and external dependencies

| Service | Purpose | Constraints | Traces |
|---------|---------|-------------|--------|
| SSLCommerz | Payment processing (bKash, Nagad, cards, bank transfer) | Use test sandbox before going live; refunds via SSLCommerz API | D-10 |
| Daily.co | Video call room provisioning | One room per Appointment; 30-min cap enforced server-side | D-12 |
| SMS provider (Twilio or SSL Wireless) | OTP delivery, Appointment reminders, Doctor notifications | Bangladesh phone numbers required; evaluate local termination rates | D-07, D-21 |
| Email provider (e.g. SendGrid, AWS SES) | Appointment confirmations, Prescription PDF delivery | Triggered transactional email only; no marketing emails in v1 | D-07, D-11 |
| AI/ML model | Symptom-to-Specialty classification | Training data and confidence threshold to be determined before F-03 ships; rule-based fallback required at launch | D-08, D-09 |

---

## 6. Risks and assumptions

| Risk / Assumption | Impact | Mitigation | Traces |
|---|---|---|---|
| ML model accuracy below 85% at launch | Patients routed to wrong Specialty; erodes trust | Launch with rule-based fallback; Patient can always override; improve model iteratively | D-08, D-09 |
| SSLCommerz integration delay | Blocks the entire booking flow | Begin SSLCommerz sandbox integration in parallel with F-05 development | D-10 |
| Daily.co per-minute cost exceeds projections at scale | Video call costs erode margin | Monitor costs from launch; renegotiate or migrate provider after v1 validation | D-12 |
| Doctor no-show rate above 5% | Refund costs and Patient trust damage | Monitor from day one; add Doctor accountability measures if threshold is exceeded | D-22 |
| Bangladeshi telehealth regulation | Platform may require BMDC licencing or physician oversight compliance | Consult BMDC guidelines and legal counsel before public launch | D-01 |
| Admin authentication not yet designed | Admin panel has no secure login | See Deferred questions (D-27) | — |

---

## 7. Deferred questions

| Question | Owner | Blocks | Needed by |
|---|---|---|---|
| D-25: Success metric targets (≥ 85% match accuracy, ≥ 90% completion rate, ≤ 5% no-show) — are these the agreed targets? | Product owner | Goals table | Before launch |
| D-26: Voice input for symptom description — in scope for v1 or deferred? | Product owner | F-03 scope | Before F-03 starts |
| D-27: Admin authentication method — how does the Admin log in to the admin panel securely? | Engineering | F-04 | Before F-04 starts |
| D-28: Doctor payout mechanism — how and when are Doctors paid their 80% share of each fee? | Product owner / Finance | F-06 | Before F-06 goes live |

---

## Appendix A: Decision log

| ID | Decision | Rationale | Used in |
|----|----------|-----------|---------|
| D-01 | Target geography is Bangladesh for v1 launch | Lower regulatory overhead; validate before expanding | NFR-03 |
| D-02 | Responsive web app only for v1; no native mobile app | Faster to ship; validate before investing in mobile | NFR-01 |
| D-03 | Scheduled Appointments only; no walk-in queue for v1 | Walk-in requires real-time queue infrastructure; scheduling is simpler to start | Non-goals |
| D-04 | Consultation medium is video call | Gold standard for telemedicine trust and clinical utility | F-07 |
| D-05 | Per-consultation fee paid by Patient | Simplest monetisation model; avoids subscription churn risk at launch | F-06 |
| D-06 | DocFit Admin manually approves each Doctor before they can see Patients | Controls quality and prevents unqualified Doctors while user base is small | F-02, F-04 |
| D-07 | Email for confirmations/receipts; SMS for reminders and time-sensitive alerts | Email for detail and record-keeping; SMS for timely, no-app-needed delivery | F-06, F-08, F-04 |
| D-08 | Five Specialties at launch: Medicine, Orthopedics, Dermatology, Gynecology, Pediatrics | Covers the most common teleconsultation needs; manageable for initial Doctor recruitment | F-03, F-05 |
| D-09 | Low-confidence Specialty Match shows top 2–3 Specialties for Patient to choose | Avoids silent wrong defaults; preserves Patient agency | F-03 |
| D-10 | Payment gateway: SSLCommerz | Aggregates bKash, Nagad, cards, and bank transfers — standard for Bangladeshi web apps | F-06 |
| D-11 | Prescription output: PDF emailed to Patient + viewable in-app | PDF is professional and printable; in-app access does not depend on email being set | F-08, F-09 |
| D-12 | Video call infrastructure: Daily.co managed service | No infrastructure to maintain; pay-as-you-go; correct scale for v1 | F-07 |
| D-13 | Book up to 7 days ahead; cancel more than 2 hours before for full refund; no refund within 2 hours | Balances Patient flexibility with Doctor schedule reliability | F-05, F-06 |
| D-14 | Each Doctor sets their own consultation fee; DocFit retains 20% commission | Attractive for Doctor recruitment; simple commission model | F-02, F-06 |
| D-15 | Fixed 30-minute consultation Slots | Simple to schedule; sufficient for a typical teleconsultation | F-02, F-07 |
| D-16 | DocFit-maintained curated medicines list; Admin adds and removes entries | Prevents free-text errors; no paid third-party drug API needed at launch | F-04, F-08 |
| D-17 | Past Consultations and Prescription PDFs stored per Patient; Doctor can view Patient history during Consultation | Enables continuity of care; builds Patient confidence | F-07, F-09 |
| D-18 | Post-Consultation rating: 1–5 stars + optional comment; displayed on Doctor profile | Builds trust; surfaces quality without requiring moderation in v1 | F-05, F-10 |
| D-19 | English only for v1 | Faster to build; medical terminology is predominantly used in English in Bangladeshi healthcare | NFR-02 |
| D-20 | Symptom input and Specialty Matching are public (no login); Slot selection and booking require login | Lowers friction for first-time visitors; login gate at the point of commitment | F-03, F-05 |
| D-21 | Phone OTP only authentication; no passwords | Most Bangladeshi users are comfortable with OTP; phone number is the identity anchor | F-01 |
| D-22 | Automatic full refund if Doctor has not joined within 10 minutes of scheduled Appointment start | Protects Patient trust without requiring manual support intervention | F-07 |
| D-23 | Required Prescription fields: patient name, age, date, diagnosis, medicines (name/dosage/frequency/duration), Doctor name, Specialty; optional Notes/Advice | Minimum fields for a valid prescription; structured to reduce errors | F-08 |
| D-24 | Patient registration collects name, phone, DOB, gender; email optional; address out of scope | Minimises friction while capturing identity and demographic data needed for care | F-01, F-08 |

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**DocFit** is an online healthcare consultation system that matches patients with appropriate medical specialists based on their symptoms, manages doctor availability, and facilitates consultations with prescription generation.

### Key Features
- Voice/text symptom input from patients
- AI-powered medical specialty matching (fine-tuned ML model)
- Doctor availability and scheduling system
- Real-time consultation system
- Structured prescription generation with pre-populated fields
- Automated prescription delivery via email

### Architecture Assumptions
This is a project in ideation phase. As development begins, expect to build:
- **Frontend**: Patient portal (symptom input, doctor selection, consultation interface) + Doctor dashboard (availability management, consultation, prescription creation)
- **Backend**: API for patient matching, availability queries, consultation management
- **ML Component**: Fine-tuned model for symptom → specialty classification
- **Database**: Patient profiles, doctor profiles, availability schedules, consultation records, prescriptions

## Development Setup

As the project progresses, add build/test commands here. For now:
- Initialize with `git init` when ready to track changes
- Set up a git repository on GitHub/similar before team collaboration

## Key Implementation Notes

### Symptom-to-Specialty Matching
- This is the core differentiator. Plan for:
  - A fine-tuned model (likely using an LLM API or custom training)
  - Training data preparation with actual medical domain knowledge
  - Fallback: confidence threshold + manual review queue for ambiguous cases
- Start with rule-based matching if ML model isn't ready; migrate when ready

### Doctor Availability
- Doctors set recurring schedules (weekly availability) + exceptions
- System generates available slots based on:
  - Doctor's schedule
  - Existing consultations
  - Patient's preferred time
- Use calendar/scheduling library (e.g., `ical.js`, `react-calendar`) rather than building from scratch

### Consultation System
- Likely video/audio + messaging (consider WebRTC or third-party service like Twilio/Jitsi)
- Ensure HIPAA compliance if handling healthcare data in US
- Secure session management and data encryption

### Prescription Generation
- Structured form with dropdowns for medicines
- Database of available medicines with dosages/frequencies
- Generate formatted output (PDF or email-ready HTML)
- Consider integrations with pharmacy systems (future scope)

### Privacy & Compliance
- HIPAA (US) / GDPR (EU) / local regulations apply
- Encrypt patient health data at rest and in transit
- Audit logging for all patient data access
- Get legal review early; don't defer compliance

## Testing Strategy

Establish clear patterns:
- **Unit tests**: Data validation, prescription generation logic, matching algorithm
- **Integration tests**: API flows (patient registration → symptom input → doctor matching → consultation)
- **E2E tests**: Full patient and doctor workflows (browsers/Cypress/Playwright)
- **Manual testing**: Real consultation scenarios with fake doctors

## Useful Resources

- Telemedicine regulations vary by region—understand your target market early
- Consider existing HIPAA-compliant backends (e.g., AWS HealthLake, Azure Health Data Services) if handling real patient data
- Open-source telemedicine platforms: OpenTeleMed, Telehealth.ai (reference architecture)

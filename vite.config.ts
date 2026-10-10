import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  publicDir: false,
  build: {
    outDir: 'dist/public',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'public/index.html'),
        'auth-signin': resolve(__dirname, 'public/auth-signin.html'),
        'auth-signup': resolve(__dirname, 'public/auth-signup.html'),
        'patient-dashboard': resolve(__dirname, 'public/patient-dashboard.html'),
        'doctor-schedule': resolve(__dirname, 'public/doctor-schedule.html'),
        'admin-queue': resolve(__dirname, 'public/admin-queue.html'),
        'admin-review-detail': resolve(__dirname, 'public/admin-review-detail.html'),
        'auth-forbidden': resolve(__dirname, 'public/auth-forbidden.html'),
        'auth-mfa-enroll': resolve(__dirname, 'public/auth-mfa-enroll.html'),
        'auth-signin-mfa': resolve(__dirname, 'public/auth-signin-mfa.html'),
        'auth-signup-doctor': resolve(__dirname, 'public/auth-signup-doctor.html'),
        'auth-verify-pending': resolve(__dirname, 'public/auth-verify-pending.html'),
        'auth-verify-expired': resolve(__dirname, 'public/auth-verify-expired.html'),
        'onboarding-step1-personal': resolve(__dirname, 'public/onboarding-step1-personal.html'),
        'onboarding-step2-licensure': resolve(__dirname, 'public/onboarding-step2-licensure.html'),
        'onboarding-step3-upload': resolve(__dirname, 'public/onboarding-step3-upload.html'),
        'onboarding-step4-specialty': resolve(__dirname, 'public/onboarding-step4-specialty.html'),
        'onboarding-step5-fees': resolve(__dirname, 'public/onboarding-step5-fees.html'),
        'onboarding-status-pending': resolve(__dirname, 'public/onboarding-status-pending.html'),
        'onboarding-status-approved': resolve(__dirname, 'public/onboarding-status-approved.html'),
        'onboarding-status-suspended': resolve(__dirname, 'public/onboarding-status-suspended.html'),
        'onboarding-status-action-required': resolve(__dirname, 'public/onboarding-status-action-required.html'),
      }
    }
  }
});

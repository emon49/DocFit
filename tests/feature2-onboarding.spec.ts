import { test, expect } from '@playwright/test';

test.describe('DocFit Feature 2: Doctor Onboarding and License Verification', () => {

  test.beforeEach(async ({ page, request }) => {
    // Stop pending page requests and reset database to initial seed before each test
    try {
      await page.goto('about:blank');
    } catch (e) {}
    await request.post('/api/test/reset');
  });

  test('F2-TC-01: Doctor completes full 5-step onboarding and submits -> Status is pending review', async ({ page, request }) => {
    // 1. Visit Step 1: Personal Details
    await page.goto('/onboarding-step1-personal.html');
    await expect(page.locator('h1')).toHaveText('Personal details');

    await page.fill('#full-name', 'Dr. Amara Osei-Bonsu');
    await page.fill('#dob', '1985-04-12');
    await page.selectOption('#gender', 'female');
    await page.fill('#nationality', 'Ghanaian');
    await page.fill('#phone', '+44 7700 904 312');
    await page.fill('#address1', '47 Elmwood Avenue');
    await page.fill('#city', 'Birmingham');
    await page.fill('#postcode', 'B15 2TT');
    await page.selectOption('#country', 'gb');
    await page.click('#continue-btn');

    // 2. Navigates to Step 2: Licensure
    await expect(page).toHaveURL(/onboarding-step2-licensure\.html/);
    await expect(page.locator('h1')).toHaveText('Licensure');
    await page.fill('#license-number', 'GMC-7842913');
    await page.fill('#issuing-authority', 'General Medical Council (GMC)');
    await page.selectOption('#country-of-licensure', 'gb');
    await page.fill('#issue-date', '2012-09-01');
    await page.fill('#expiry-date', '2027-08-31');
    await page.selectOption('#license-type', 'full');
    await page.fill('#primary-specialty', 'Cardiology');
    await page.click('#continue-btn');

    // 3. Navigates to Step 3: Documents
    await expect(page).toHaveURL(/onboarding-step3-upload\.html/);
    await expect(page.locator('h1')).toHaveText('Documents');
    await expect(page.locator('#license-doc-name')).toHaveText('GMC_Certificate_Osei-Bonsu.pdf');
    await page.click('#continue-btn');

    // 4. Navigates to Step 4: Specialties
    await expect(page).toHaveURL(/onboarding-step4-specialty\.html/);
    await expect(page.locator('h1')).toHaveText('Select your specialties');
    await expect(page.locator('#selected-count-text')).toContainText('selected');
    await page.click('#continue-btn');

    // 5. Navigates to Step 5: Fees & Submit
    await expect(page).toHaveURL(/onboarding-step5-fees\.html/);
    await expect(page.locator('#summary-license-num')).toHaveText('GMC-7842913');
    await expect(page.locator('#summary-council')).toHaveText('General Medical Council (GMC)');

    // 6. Submit application
    await page.click('#submit-btn');

    // 7. Navigates to Onboarding Status Pending screen
    await expect(page).toHaveURL(/onboarding-status-pending\.html/);
    await expect(page.locator('h1')).toHaveText('Application under review');
    await expect(page.locator('body')).toContainText('License verification in progress');
  });

  test('F2-TC-02 (Validation): Submitting an expired license date triggers error banner and blocks progress', async ({ page }) => {
    await page.goto('/onboarding-step2-licensure.html');

    // Enter past expiration date (e.g. 2023-06-30)
    await page.fill('#expiry-date', '2023-06-30');

    // Verify error banner matches design onboarding-step2-licensure-error.html
    const errorBanner = page.locator('#expired-error-container');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText('License expired on 30 Jun 2023. An active, unexpired license is required to register.');

    // Continue button must be disabled
    const continueBtn = page.locator('#continue-btn');
    await expect(continueBtn).toBeDisabled();

    // Verify standalone static error screen renders faithfully
    await page.goto('/onboarding-step2-licensure-error.html');
    await expect(page.locator('#error-msg-banner')).toContainText('License expired on 30 Jun 2023. An active, unexpired license is required to register.');
    await expect(page.locator('#continue-btn')).toBeDisabled();
  });

  test('F2-TC-03 (Validation): Document upload with unsupported format displays clear rejection error and allows retry', async ({ page, request }) => {
    // 1. Check API validation for rejected file formats
    const apiRes = await request.post('/api/doctor/onboarding/upload', {
      data: {
        filename: 'setup_wizard.pdf',
        category: 'id'
      }
    });
    expect(apiRes.status()).toBe(400);
    const apiData = await apiRes.json();
    expect(apiData.message).toContain('File rejected — the content does not match a supported format');

    // 2. Check UI error screen reproduction
    await page.goto('/onboarding-step3-upload-error.html');
    await expect(page.locator('#error-file-title')).toHaveText('setup_wizard.pdf');
    await expect(page.locator('#error-file-description')).toContainText('File rejected — the content does not match a supported format');
    await expect(page.locator('text=Try again')).toBeVisible();
  });

  test('F2-TC-04: Admin reviews doctor in queue, ticks registry checklist, and approves application -> Doctor profile active', async ({ page, request }) => {
    // 1. Visit Admin Queue
    await page.goto('/admin-queue.html');
    await expect(page.locator('h1')).toHaveText('Doctor Verification Queue');
    await expect(page.locator('#queue-table')).toContainText('Dr. Amara Osei-Bonsu');

    // 2. Navigate to Review Detail for Dr. Amara Osei-Bonsu
    await page.goto('/admin-review-detail.html?id=doc_amara_001');
    await expect(page.locator('#doctor-title-name')).toHaveText('Dr. Amara Osei-Bonsu');
    await expect(page.locator('#info-license-num')).toHaveText('GMC-7842913');

    // 3. Toggle remaining checklist items in Registry Checklist
    await page.click('#check-icon-license_type_verified');
    await page.click('#check-icon-documents_checked');
    await page.click('#check-icon-id_validated');

    // 4. Click Approve application -> Go to approval confirmation
    await page.click('#btn-approve');
    await expect(page).toHaveURL(/admin-approve-confirm\.html\?id=doc_amara_001/);
    await expect(page.locator('h3:has-text("Approve this application?")')).toBeVisible();

    // 5. Confirm approval
    await page.click('#confirm-approval-btn');
    await expect(page).toHaveURL(/admin-queue\.html/);

    // 6. Verify status updated to approved in API
    const docRes = await request.get('/api/admin/doctors/doc_amara_001');
    expect(docRes.status()).toBe(200);
    const { doctor } = await docRes.json();
    expect(doctor.status).toBe('approved');
    expect(doctor.approved_at).toBeDefined();

    // 7. Verify doctor sees Application Approved screen
    await page.goto('/onboarding-status-approved.html');
    await expect(page.locator('h1')).toHaveText('Application approved!');
    await expect(page.locator('#approved-status-badge')).toHaveText('Active');
  });

  test('F2-TC-05: Admin requests additional information with reason -> Doctor status transitions to action_required', async ({ page, request }) => {
    // 1. Navigate to Admin Request Info screen for doctor
    await page.goto('/admin-request-info.html?id=doc_priya_003');
    await expect(page.locator('h3:has-text("Request additional information")')).toBeVisible();

    // 2. Fill message and send request
    const message = 'Please upload a clearer scan of your GMC registration certificate.';
    await page.fill('#request-message', message);
    await page.click('#send-request-btn');
    await expect(page).toHaveURL(/admin-queue\.html/);

    // 3. Verify doctor record in API updated to action_required
    const docRes = await request.get('/api/admin/doctors/doc_priya_003');
    const { doctor } = await docRes.json();
    expect(doctor.status).toBe('action_required');
    expect(doctor.action_required_message).toBe(message);

    // 4. Verify doctor sees Action Required screen
    await page.goto('/onboarding-status-action-required.html');
    await expect(page.locator('h1')).toHaveText('Action required');
    await expect(page.locator('#upload-updated-btn')).toBeVisible();
  });

  test('F2-TC-06: Admin rejects application with reason -> Doctor status transitions to rejected with re-application option', async ({ page, request }) => {
    // 1. Navigate to Admin Reject screen
    await page.goto('/admin-reject.html?id=doc_rajesh_002');
    await expect(page.locator('h3:has-text("Reject this application?")')).toBeVisible();

    // 2. Select rejection reason and confirm
    await page.selectOption('#reject-reason', 'License could not be verified with issuing council');
    await page.click('#confirm-reject-btn');
    await expect(page).toHaveURL(/admin-queue\.html/);

    // 3. Verify doctor status in API is rejected
    const docRes = await request.get('/api/admin/doctors/doc_rajesh_002');
    const { doctor } = await docRes.json();
    expect(doctor.status).toBe('rejected');
    expect(doctor.rejection_reason).toBe('License could not be verified with issuing council');
    expect(doctor.allow_reapply).toBe(true);
  });

  test('F2-TC-07: License expiry tracking -> Doctor with expired license is suspended, suspension notice and affected bookings displayed', async ({ page, request }) => {
    // Doctor Dr. Maya Patel is seeded with expired license (expired 2026-09-30)
    // 1. Run expiration check
    const expRes = await request.post('/api/admin/check-expirations');
    expect(expRes.status()).toBe(200);

    // 2. Verify Dr. Maya Patel status is suspended in database
    const docRes = await request.get('/api/admin/doctors/doc_maya_004');
    expect(docRes.status()).toBe(200);
    const { doctor } = await docRes.json();
    expect(doctor.status).toBe('suspended');
    expect(doctor.license_number).toBe('MCI-442817');

    // 3. View Account Suspended screen
    await page.goto('/onboarding-status-suspended.html');
    await expect(page.locator('h1')).toHaveText('Account suspended');
    await expect(page.locator('#suspension-message')).toContainText('MCI-442817');
    await expect(page.locator('#affected-bookings-msg')).toContainText('Affected bookings: 4 appointments');
    await expect(page.locator('#renew-license-btn')).toBeVisible();
  });

});

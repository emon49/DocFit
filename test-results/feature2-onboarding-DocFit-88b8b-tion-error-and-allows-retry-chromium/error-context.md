# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: feature2-onboarding.spec.ts >> DocFit Feature 2: Doctor Onboarding and License Verification >> F2-TC-03 (Validation): Document upload with unsupported format displays clear rejection error and allows retry
- Location: tests/feature2-onboarding.spec.ts:88:3

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator: locator('#error-file-title')
Expected: "setup_wizard.pdf"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveText" locator('#error-file-title') with timeout 5000ms
  - waiting for locator('#error-file-title')

```

```yaml
- text: "Error: ENOENT: no such file or directory, stat '/app/applet/dist/public/onboarding-step3-upload-error.html'"
```

# Test source

```ts
  2   | 
  3   | test.describe('DocFit Feature 2: Doctor Onboarding and License Verification', () => {
  4   | 
  5   |   test.beforeEach(async ({ page, request }) => {
  6   |     // Stop pending page requests and reset database to initial seed before each test
  7   |     try {
  8   |       await page.goto('about:blank');
  9   |     } catch (e) {}
  10  |     await request.post('/api/test/reset');
  11  |   });
  12  | 
  13  |   test('F2-TC-01: Doctor completes full 5-step onboarding and submits -> Status is pending review', async ({ page, request }) => {
  14  |     // 1. Visit Step 1: Personal Details
  15  |     await page.goto('/onboarding-step1-personal.html');
  16  |     await expect(page.locator('h1')).toHaveText('Personal details');
  17  | 
  18  |     await page.fill('#full-name', 'Dr. Amara Osei-Bonsu');
  19  |     await page.fill('#dob', '1985-04-12');
  20  |     await page.selectOption('#gender', 'female');
  21  |     await page.fill('#nationality', 'Ghanaian');
  22  |     await page.fill('#phone', '+44 7700 904 312');
  23  |     await page.fill('#address1', '47 Elmwood Avenue');
  24  |     await page.fill('#city', 'Birmingham');
  25  |     await page.fill('#postcode', 'B15 2TT');
  26  |     await page.selectOption('#country', 'gb');
  27  |     await page.click('#continue-btn');
  28  | 
  29  |     // 2. Navigates to Step 2: Licensure
  30  |     await expect(page).toHaveURL(/onboarding-step2-licensure\.html/);
  31  |     await expect(page.locator('h1')).toHaveText('Licensure');
  32  |     await page.fill('#license-number', 'GMC-7842913');
  33  |     await page.fill('#issuing-authority', 'General Medical Council (GMC)');
  34  |     await page.selectOption('#country-of-licensure', 'gb');
  35  |     await page.fill('#issue-date', '2012-09-01');
  36  |     await page.fill('#expiry-date', '2027-08-31');
  37  |     await page.selectOption('#license-type', 'full');
  38  |     await page.fill('#primary-specialty', 'Cardiology');
  39  |     await page.click('#continue-btn');
  40  | 
  41  |     // 3. Navigates to Step 3: Documents
  42  |     await expect(page).toHaveURL(/onboarding-step3-upload\.html/);
  43  |     await expect(page.locator('h1')).toHaveText('Documents');
  44  |     await expect(page.locator('#license-doc-name')).toHaveText('GMC_Certificate_Osei-Bonsu.pdf');
  45  |     await page.click('#continue-btn');
  46  | 
  47  |     // 4. Navigates to Step 4: Specialties
  48  |     await expect(page).toHaveURL(/onboarding-step4-specialty\.html/);
  49  |     await expect(page.locator('h1')).toHaveText('Select your specialties');
  50  |     await expect(page.locator('#selected-count-text')).toContainText('selected');
  51  |     await page.click('#continue-btn');
  52  | 
  53  |     // 5. Navigates to Step 5: Fees & Submit
  54  |     await expect(page).toHaveURL(/onboarding-step5-fees\.html/);
  55  |     await expect(page.locator('#summary-license-num')).toHaveText('GMC-7842913');
  56  |     await expect(page.locator('#summary-council')).toHaveText('General Medical Council (GMC)');
  57  | 
  58  |     // 6. Submit application
  59  |     await page.click('#submit-btn');
  60  | 
  61  |     // 7. Navigates to Onboarding Status Pending screen
  62  |     await expect(page).toHaveURL(/onboarding-status-pending\.html/);
  63  |     await expect(page.locator('h1')).toHaveText('Application under review');
  64  |     await expect(page.locator('body')).toContainText('License verification in progress');
  65  |   });
  66  | 
  67  |   test('F2-TC-02 (Validation): Submitting an expired license date triggers error banner and blocks progress', async ({ page }) => {
  68  |     await page.goto('/onboarding-step2-licensure.html');
  69  | 
  70  |     // Enter past expiration date (e.g. 2023-06-30)
  71  |     await page.fill('#expiry-date', '2023-06-30');
  72  | 
  73  |     // Verify error banner matches design onboarding-step2-licensure-error.html
  74  |     const errorBanner = page.locator('#expired-error-container');
  75  |     await expect(errorBanner).toBeVisible();
  76  |     await expect(errorBanner).toContainText('License expired on 30 Jun 2023. An active, unexpired license is required to register.');
  77  | 
  78  |     // Continue button must be disabled
  79  |     const continueBtn = page.locator('#continue-btn');
  80  |     await expect(continueBtn).toBeDisabled();
  81  | 
  82  |     // Verify standalone static error screen renders faithfully
  83  |     await page.goto('/onboarding-step2-licensure-error.html');
  84  |     await expect(page.locator('#error-msg-banner')).toContainText('License expired on 30 Jun 2023. An active, unexpired license is required to register.');
  85  |     await expect(page.locator('#continue-btn')).toBeDisabled();
  86  |   });
  87  | 
  88  |   test('F2-TC-03 (Validation): Document upload with unsupported format displays clear rejection error and allows retry', async ({ page, request }) => {
  89  |     // 1. Check API validation for rejected file formats
  90  |     const apiRes = await request.post('/api/doctor/onboarding/upload', {
  91  |       data: {
  92  |         filename: 'setup_wizard.pdf',
  93  |         category: 'id'
  94  |       }
  95  |     });
  96  |     expect(apiRes.status()).toBe(400);
  97  |     const apiData = await apiRes.json();
  98  |     expect(apiData.message).toContain('File rejected — the content does not match a supported format');
  99  | 
  100 |     // 2. Check UI error screen reproduction
  101 |     await page.goto('/onboarding-step3-upload-error.html');
> 102 |     await expect(page.locator('#error-file-title')).toHaveText('setup_wizard.pdf');
      |                                                     ^ Error: expect(locator).toHaveText(expected) failed
  103 |     await expect(page.locator('#error-file-description')).toContainText('File rejected — the content does not match a supported format');
  104 |     await expect(page.locator('text=Try again')).toBeVisible();
  105 |   });
  106 | 
  107 |   test('F2-TC-04: Admin reviews doctor in queue, ticks registry checklist, and approves application -> Doctor profile active', async ({ page, request }) => {
  108 |     // 1. Visit Admin Queue
  109 |     await page.goto('/admin-queue.html');
  110 |     await expect(page.locator('h1')).toHaveText('Doctor Verification Queue');
  111 |     await expect(page.locator('#queue-table')).toContainText('Dr. Amara Osei-Bonsu');
  112 | 
  113 |     // 2. Navigate to Review Detail for Dr. Amara Osei-Bonsu
  114 |     await page.goto('/admin-review-detail.html?id=doc_amara_001');
  115 |     await expect(page.locator('#doctor-title-name')).toHaveText('Dr. Amara Osei-Bonsu');
  116 |     await expect(page.locator('#info-license-num')).toHaveText('GMC-7842913');
  117 | 
  118 |     // 3. Toggle remaining checklist items in Registry Checklist
  119 |     await page.click('#check-icon-license_type_verified');
  120 |     await page.click('#check-icon-documents_checked');
  121 |     await page.click('#check-icon-id_validated');
  122 | 
  123 |     // 4. Click Approve application -> Go to approval confirmation
  124 |     await page.click('#btn-approve');
  125 |     await expect(page).toHaveURL(/admin-approve-confirm\.html\?id=doc_amara_001/);
  126 |     await expect(page.locator('h3:has-text("Approve this application?")')).toBeVisible();
  127 | 
  128 |     // 5. Confirm approval
  129 |     await page.click('#confirm-approval-btn');
  130 |     await expect(page).toHaveURL(/admin-queue\.html/);
  131 | 
  132 |     // 6. Verify status updated to approved in API
  133 |     const docRes = await request.get('/api/admin/doctors/doc_amara_001');
  134 |     expect(docRes.status()).toBe(200);
  135 |     const { doctor } = await docRes.json();
  136 |     expect(doctor.status).toBe('approved');
  137 |     expect(doctor.approved_at).toBeDefined();
  138 | 
  139 |     // 7. Verify doctor sees Application Approved screen
  140 |     await page.goto('/onboarding-status-approved.html');
  141 |     await expect(page.locator('h1')).toHaveText('Application approved!');
  142 |     await expect(page.locator('#approved-status-badge')).toHaveText('Active');
  143 |   });
  144 | 
  145 |   test('F2-TC-05: Admin requests additional information with reason -> Doctor status transitions to action_required', async ({ page, request }) => {
  146 |     // 1. Navigate to Admin Request Info screen for doctor
  147 |     await page.goto('/admin-request-info.html?id=doc_priya_003');
  148 |     await expect(page.locator('h3:has-text("Request additional information")')).toBeVisible();
  149 | 
  150 |     // 2. Fill message and send request
  151 |     const message = 'Please upload a clearer scan of your GMC registration certificate.';
  152 |     await page.fill('#request-message', message);
  153 |     await page.click('#send-request-btn');
  154 |     await expect(page).toHaveURL(/admin-queue\.html/);
  155 | 
  156 |     // 3. Verify doctor record in API updated to action_required
  157 |     const docRes = await request.get('/api/admin/doctors/doc_priya_003');
  158 |     const { doctor } = await docRes.json();
  159 |     expect(doctor.status).toBe('action_required');
  160 |     expect(doctor.action_required_message).toBe(message);
  161 | 
  162 |     // 4. Verify doctor sees Action Required screen
  163 |     await page.goto('/onboarding-status-action-required.html');
  164 |     await expect(page.locator('h1')).toHaveText('Action required');
  165 |     await expect(page.locator('#upload-updated-btn')).toBeVisible();
  166 |   });
  167 | 
  168 |   test('F2-TC-06: Admin rejects application with reason -> Doctor status transitions to rejected with re-application option', async ({ page, request }) => {
  169 |     // 1. Navigate to Admin Reject screen
  170 |     await page.goto('/admin-reject.html?id=doc_rajesh_002');
  171 |     await expect(page.locator('h3:has-text("Reject this application?")')).toBeVisible();
  172 | 
  173 |     // 2. Select rejection reason and confirm
  174 |     await page.selectOption('#reject-reason', 'License could not be verified with issuing council');
  175 |     await page.click('#confirm-reject-btn');
  176 |     await expect(page).toHaveURL(/admin-queue\.html/);
  177 | 
  178 |     // 3. Verify doctor status in API is rejected
  179 |     const docRes = await request.get('/api/admin/doctors/doc_rajesh_002');
  180 |     const { doctor } = await docRes.json();
  181 |     expect(doctor.status).toBe('rejected');
  182 |     expect(doctor.rejection_reason).toBe('License could not be verified with issuing council');
  183 |     expect(doctor.allow_reapply).toBe(true);
  184 |   });
  185 | 
  186 |   test('F2-TC-07: License expiry tracking -> Doctor with expired license is suspended, suspension notice and affected bookings displayed', async ({ page, request }) => {
  187 |     // Doctor Dr. Maya Patel is seeded with expired license (expired 2026-09-30)
  188 |     // 1. Run expiration check
  189 |     const expRes = await request.post('/api/admin/check-expirations');
  190 |     expect(expRes.status()).toBe(200);
  191 | 
  192 |     // 2. Verify Dr. Maya Patel status is suspended in database
  193 |     const docRes = await request.get('/api/admin/doctors/doc_maya_004');
  194 |     expect(docRes.status()).toBe(200);
  195 |     const { doctor } = await docRes.json();
  196 |     expect(doctor.status).toBe('suspended');
  197 |     expect(doctor.license_number).toBe('MCI-442817');
  198 | 
  199 |     // 3. View Account Suspended screen
  200 |     await page.goto('/onboarding-status-suspended.html');
  201 |     await expect(page.locator('h1')).toHaveText('Account suspended');
  202 |     await expect(page.locator('#suspension-message')).toContainText('MCI-442817');
```
import { test, expect } from '@playwright/test';

test.describe('DocFit Landing Page & Navigation Wiring', () => {

  test('Landing page renders hero, stats, steps, features, and doctor band', async ({ page }) => {
    await page.goto('/');

    // Check title and hero
    await expect(page).toHaveTitle(/DocFit · Online Healthcare Consultations/);
    await expect(page.locator('.hero-headline')).toContainText('A doctor,');
    await expect(page.locator('.hero-headline em')).toHaveText('whenever');

    // Check stats strip
    await expect(page.locator('.stats')).toBeVisible();
    await expect(page.locator('.stats')).toContainText('4,200+');
    await expect(page.locator('.stats')).toContainText('38K+');

    // Check steps and features
    await expect(page.locator('#how-it-works')).toBeVisible();
    await expect(page.locator('#features')).toBeVisible();
    await expect(page.locator('#for-doctors')).toBeVisible();
  });

  test('Navigation links route to registration and login pages', async ({ page }) => {
    await page.goto('/');

    // 1. Sign in button navigates to auth-signin.html
    await page.click('#nav-signin-btn');
    await expect(page).toHaveURL(/auth-signin\.html/);

    // 2. Return to home and click "Get started" button
    await page.goto('/');
    await page.click('#nav-signup-btn');
    await expect(page).toHaveURL(/auth-signup\.html/);

    // 3. Return to home and click "Book a consultation" hero button
    await page.goto('/');
    await page.click('#hero-book-btn');
    await expect(page).toHaveURL(/auth-signup\.html/);

    // 4. Return to home and click "Apply as a doctor"
    await page.goto('/');
    await page.click('#doctor-band-apply-btn');
    await expect(page).toHaveURL(/auth-signup-doctor\.html/);
  });

  test('Session state awareness in navigation bar', async ({ page }) => {
    // Navigate and set mock logged in token in localStorage
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('docfit_token', 'mock_patient_token_123');
    });

    // Reload page to reflect session
    await page.reload();

    // Verify "My Dashboard" button is shown instead of "Sign in"
    const dashboardBtn = page.locator('text=My Dashboard');
    await expect(dashboardBtn).toBeVisible();

    await dashboardBtn.click();
    await expect(page).toHaveURL(/patient-dashboard\.html/);
  });

});

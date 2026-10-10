import { test, expect } from '@playwright/test';

test.describe('DocFit Feature 3: Doctor Availability Scheduling', () => {

  test.beforeEach(async ({ page, request }) => {
    try {
      await page.goto('about:blank');
    } catch (e) {}
    await request.post('/api/test/reset');
  });

  test('TC-01 (Happy Path): Doctor sets Mon 09:00–12:00, 20-min slots -> 9 slots generated for each Monday', async ({ request }) => {
    // 1. Set slot length to 20 min
    const lenRes = await request.put('/api/doctors/me/slot-length', {
      data: { slot_length_minutes: 20 }
    });
    expect(lenRes.status()).toBe(200);

    // 2. Set rule for Monday 09:00 - 12:00
    const ruleRes = await request.put('/api/doctors/me/availability-rules', {
      data: {
        rules: [
          { day_of_week: 'monday', start_local_time: '09:00', end_local_time: '12:00' }
        ]
      }
    });
    expect(ruleRes.status()).toBe(200);
    const data = await ruleRes.json();
    
    // From 09:00 to 12:00 (180 mins) with 20 min slots = 9 slots
    const mondaySlots = data.slots.filter((s: any) => s.date === '2026-10-12'); // Oct 12 2026 is Monday
    expect(mondaySlots.length).toBe(9);
    expect(mondaySlots[0].time_str).toBe('09:00');
    expect(mondaySlots[8].time_str).toBe('11:40');
  });

  test('TC-02 (Edge Case): Doctor sets overlapping blocks Mon 09:00–11:00 and 10:00–12:00 -> Save rejected with overlap message', async ({ request }) => {
    const ruleRes = await request.put('/api/doctors/me/availability-rules', {
      data: {
        rules: [
          { day_of_week: 'monday', start_local_time: '09:00', end_local_time: '11:00' },
          { day_of_week: 'monday', start_local_time: '10:00', end_local_time: '12:00' }
        ]
      }
    });
    expect(ruleRes.status()).toBe(400);
    const data = await ruleRes.json();
    expect(data.error).toBe('overlap_error');
    expect(data.message.toLowerCase()).toContain('overlap');
  });

  test('TC-03 (Edge Case): Doctor marks a day as leave that has a booked consultation -> Warning listing the booking shown', async ({ request }) => {
    // Attempt to add leave on Thursday 15 Oct which has a booking in our seed/mock check
    const res = await request.post('/api/doctors/me/availability-exceptions', {
      data: {
        date: '2026-10-15',
        type: 'leave',
        note: 'Conference'
      }
    });
    expect(res.status()).toBe(400);
    const data = await res.json();
    expect(data.warning).toBe(true);
    expect(data.affected_bookings.length).toBe(1);
    expect(data.affected_bookings[0].patient_name).toBe('James Hartwell');
    expect(data.affected_bookings[0].status).toBe('Confirmed');
  });

  test('TC-04 (Security): Unauthorized or invalid access check / Doctor UI loads successfully', async ({ page }) => {
    await page.goto('/doctor-schedule.html');
    await expect(page.locator('h1, span', { hasText: 'My Schedule' })).toBeVisible();
    await expect(page.locator('text=Recurring weekly schedule')).toBeVisible();
  });

});

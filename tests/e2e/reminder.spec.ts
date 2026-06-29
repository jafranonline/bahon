import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  // Add a vehicle first (required for reminders to be associated)
  await page.goto('/')
  await page.getByRole('button', { name: /add vehicle/i }).first().click()
  await page.locator('#vehicle-name').fill('Reminder Car')
  await page.locator('#vehicle-brand').fill('Bajaj')
  await page.locator('#vehicle-model').fill('Pulsar')
  await page.locator('#vehicle-year').fill('2023')
  await page.locator('#vehicle-odo').fill('42000')
  await page.getByRole('button', { name: /add vehicle/i }).click()
  await expect(page).toHaveURL('/')
})

test('add a one-time reminder and see it in the list', async ({ page }) => {
  await page.goto('/reminders')

  // Fill in the reminder form
  await page.locator('#rem-title').fill('Annual insurance renewal')
  await page.locator('#rem-due-date').fill('2027-01-01')

  // Save
  await page.getByRole('button', { name: /save reminder/i }).click()

  // Reminder should appear in the list
  await expect(page.getByText('Annual insurance renewal')).toBeVisible()
})

test('dismiss a one-time reminder and it disappears from active list', async ({ page }) => {
  await page.goto('/reminders')

  // Add a past-due reminder
  await page.locator('#rem-title').fill('Past due service')
  await page.locator('#rem-due-date').fill('2025-01-01')
  await page.getByRole('button', { name: /save reminder/i }).click()

  // Dismiss it
  await page.getByRole('button', { name: /dismiss reminder/i }).first().click()

  // It should be removed from the active list
  await expect(page.getByText('Past due service')).not.toBeVisible()
})

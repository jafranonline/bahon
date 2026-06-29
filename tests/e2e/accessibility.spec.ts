import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    // Set up a vehicle so all screens are populated
    await page.goto('/')
    await page.getByRole('button', { name: /add vehicle/i }).first().click()
    await page.locator('#vehicle-name').fill('Axe Test Car')
    await page.locator('#vehicle-brand').fill('Toyota')
    await page.locator('#vehicle-model').fill('Yaris')
    await page.locator('#vehicle-year').fill('2023')
    await page.locator('#vehicle-odo').fill('10000')
    await page.getByRole('button', { name: /add vehicle/i }).click()
    await expect(page).toHaveURL('/')
  })

  test('Home screen has 0 axe violations', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .disableRules(['color-contrast']) // tested separately via design tokens
      .analyze()
    expect(results.violations).toEqual([])
  })

  test('Log Fuel screen has 0 axe violations', async ({ page }) => {
    await page.goto('/log/fuel')
    const results = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze()
    expect(results.violations).toEqual([])
  })

  test('Reminders screen has 0 axe violations', async ({ page }) => {
    await page.goto('/reminders')
    const results = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze()
    expect(results.violations).toEqual([])
  })

  test('Stats screen has 0 axe violations', async ({ page }) => {
    await page.goto('/stats')
    const results = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze()
    expect(results.violations).toEqual([])
  })
})

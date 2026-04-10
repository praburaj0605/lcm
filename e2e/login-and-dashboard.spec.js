// @ts-check
import { expect, test } from '@playwright/test'

test.describe('acceptance: auth shell', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Logistics CRM' })).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
  })

  test('demo user can sign in and reach dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('admin@demo.com')
    await page.getByLabel('Password').fill('demo')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('unknown email shows error', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('nope@example.com')
    await page.getByLabel('Password').fill('x')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText(/No user with that email/i)).toBeVisible()
  })
})

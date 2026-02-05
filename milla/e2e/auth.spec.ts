import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
    test('should display landing page', async ({ page }) => {
        await page.goto('/');

        // Check for main elements
        await expect(page.locator('text=Milla')).toBeVisible();
        await expect(page.getByRole('link', { name: /entrar|login/i })).toBeVisible();
        await expect(page.getByRole('link', { name: /começar|signup/i })).toBeVisible();
    });

    test('should navigate to login page', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('link', { name: /entrar|login/i }).click();

        await expect(page).toHaveURL('/login');
        await expect(page.getByPlaceholder(/email/i)).toBeVisible();
        await expect(page.getByPlaceholder(/senha/i)).toBeVisible();
    });

    test('should navigate to signup page', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('link', { name: /começar|signup/i }).click();

        await expect(page).toHaveURL('/signup');
    });

    test('should show error on invalid login', async ({ page }) => {
        await page.goto('/login');

        await page.getByPlaceholder(/email/i).fill('invalid@test.com');
        await page.getByPlaceholder(/senha/i).fill('wrongpassword');
        await page.getByRole('button', { name: /entrar/i }).click();

        // Should show error message
        await expect(page.locator('text=/erro|inválido|incorreto/i')).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Protected Routes', () => {
    test('should redirect unauthenticated user from /mapa to login', async ({ page }) => {
        await page.goto('/mapa');

        // Should redirect to login
        await expect(page).toHaveURL(/\/login/);
    });

    test('should redirect unauthenticated user from /perfil to login', async ({ page }) => {
        await page.goto('/perfil');

        // Should redirect to login
        await expect(page).toHaveURL(/\/login/);
    });
});

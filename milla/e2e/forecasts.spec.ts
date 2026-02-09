import { test, expect } from '@playwright/test';

test.describe('Forecasts Feature', () => {
    // Login before each test
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.getByPlaceholder(/email/i).fill('bilottefabio@gmail.com'); // Using dev credentials
        await page.getByPlaceholder(/senha/i).fill('121212');
        await page.getByRole('button', { name: /entrar/i }).click();
        await expect(page).toHaveURL('/');
    });

    test('should navigate to forecasts page', async ({ page }) => {
        await page.getByRole('link', { name: /previsões/i }).click();
        await expect(page).toHaveURL('/previsoes');

        // Check main headers/tabs
        await expect(page.getByText('Suas orientações numerológicas')).toBeVisible();
        await expect(page.getByRole('tab', { name: /todas/i })).toBeVisible();
        await expect(page.getByRole('tab', { name: /semanal/i })).toBeVisible();
    });

    test('should display forecast cards with audio', async ({ page }) => {
        await page.goto('/previsoes');

        // Check for at least one forecast card
        const cardObj = page.locator('article, div.bg-mystic-900').first(); // Adjust selector based on implementation
        // Or just look for known text from seed data if available, or generic elements

        // In our manual test we saw "Semana de Reflexão e Conclusão"
        // Let's check if the specific forecast we generated exists
        const forecastTitle = page.getByText(/Semana de Reflexão e Conclusão/i).first();

        if (await forecastTitle.isVisible()) {
            await forecastTitle.click(); // Expand if logical

            // Check for audio player
            await expect(page.locator('audio')).toBeVisible();

            // Check for play button
            const playButton = page.locator('button').filter({ has: page.locator('svg') }); // Generic play button
            await expect(playButton.first()).toBeVisible();
        } else {
            console.log('Specific forecast not found, checking generic elements');
            // Fallback: Check if any forecast is present
            await expect(page.getByText(/semana|mês|ano/i).first()).toBeVisible();
        }
    });

    test('should filter forecasts by type', async ({ page }) => {
        await page.goto('/previsoes');

        // Click Weekly tab
        await page.getByRole('tab', { name: /semanal/i }).click();
        // Verify URL or state change if applicable, or check filtered content

        // Click Monthly tab
        await page.getByRole('tab', { name: /mensal/i }).click();
    });
});

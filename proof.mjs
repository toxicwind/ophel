import { chromium, firefox } from 'playwright';

(async () => {
  const browser = await firefox.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('https://hyperbrut.com', { timeout: 10000 }).catch(()=>console.log('nav error'));
  console.log('Firefox controlled locally via Playwright!');
  await browser.close();
})();

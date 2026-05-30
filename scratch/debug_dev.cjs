const puppeteer = require('puppeteer');
const { exec } = require('child_process');

console.log('Starting Vite dev server...');
const devProcess = exec('npm run dev', { cwd: 'c:\\Users\\Jose Mario\\OneDrive\\Escritorio\\Nuevo proyecto Saas' });

devProcess.stdout.on('data', (data) => {
  console.log(`[Dev Server]: ${data.trim()}`);
});

devProcess.stderr.on('data', (data) => {
  console.error(`[Dev Server Error]: ${data.trim()}`);
});

setTimeout(async () => {
  console.log('Launching browser via Puppeteer...');
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    page.on('console', (msg) => {
      console.log(`[BROWSER CONSOLE] [${msg.type()}]: ${msg.text()}`);
    });

    page.on('pageerror', (err) => {
      console.error(`[BROWSER RUNTIME EXCEPTION]:`, err.message, err.stack);
    });

    console.log('Navigating to http://localhost:5173/ ...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0', timeout: 15000 });
    console.log('Navigation finished.');
  } catch (error) {
    console.error('Error during browser navigation:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
    console.log('Killing Dev server...');
    devProcess.kill();
    process.exit(0);
  }
}, 5000);

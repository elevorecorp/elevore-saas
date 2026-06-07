const puppeteer = require('puppeteer');
const { exec } = require('child_process');

console.log('Starting Vite preview server for testing...');
const previewProcess = exec('npm.cmd run preview', { cwd: 'c:\\Users\\Jose Mario\\OneDrive\\Escritorio\\Nuevo proyecto Saas' });

previewProcess.stdout.on('data', (data) => {
  console.log(`[Preview Server]: ${data.trim()}`);
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
    await page.setViewport({ width: 1280, height: 1200 }); // High viewport to see everything

    // Enable request interception to mock Supabase calls
    await page.setRequestInterception(true);
    
    let lastUpdatedPayload = null;

    page.on('request', (request) => {
      const url = request.url();
      const method = request.method();
      
      if (method === 'OPTIONS') {
        const reqHeaders = request.headers();
        const allowedHeaders = reqHeaders['access-control-request-headers'] || 'authorization, apikey, content-type, x-client-info';
        request.respond({
          status: 204,
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'access-control-allow-headers': allowedHeaders,
            'access-control-max-age': '86400'
          }
        });
        return;
      }

      if (url.includes('/rest/v1/elevore_missions')) {
        if (method === 'PATCH' || method === 'PUT') {
          console.log('[Puppeteer Intercept]: Intercepted PATCH/PUT to elevore_missions (payment complete)');
          const body = JSON.parse(request.postData());
          lastUpdatedPayload = body;
          request.respond({
            status: 200,
            headers: {
              'access-control-allow-origin': '*',
              'content-type': 'application/json'
            },
            body: JSON.stringify(body)
          });
        } else {
          console.log('[Puppeteer Intercept]: Mocking elevore_missions query...');
          const headers = request.headers();
          const accept = headers['accept'] || '';
          
          const mockJob = {
            id: 'job-1',
            client_name: 'Jose Test Checkout',
            client_phone: '123456789',
            address: '100 E Pine St, Orlando, FL 32801',
            service_type: 'Limpieza Regular',
            status: 'scheduled',
            scheduled_date: new Date().toISOString().split('T')[0],
            team_assigned: 'Team Alpha',
            tenant_id: 'tenant-1',
            total_price: 250,
            deposit_paid: 0,
            specs: { lat: 28.5415, lng: -81.3788 }
          };

          const responseBody = accept.includes('application/vnd.pgrst.object+json')
            ? JSON.stringify(mockJob)
            : JSON.stringify([mockJob]);

          request.respond({
            status: 200,
            headers: {
              'access-control-allow-origin': '*',
              'content-type': 'application/json'
            },
            body: responseBody
          });
        }
      } else if (url.includes('/rest/v1/clients')) {
        console.log('[Puppeteer Intercept]: Mocking clients query...');
        request.respond({
          status: 200,
          headers: {
            'access-control-allow-origin': '*',
            'content-type': 'application/json'
          },
          body: JSON.stringify([
            {
              id: 'client-1',
              name: 'Jose Test Checkout',
              membership: 'premium',
              specs: { preferences: { pets: 'Dog', entryCode: '1234' } }
            }
          ])
        });
      } else if (url.includes('/rest/v1/tenant_settings')) {
        console.log('[Puppeteer Intercept]: Mocking tenant_settings query...');
        request.respond({
          status: 200,
          headers: {
            'access-control-allow-origin': '*',
            'content-type': 'application/json'
          },
          body: JSON.stringify([
            {
              id: 'setting-1',
              tenant_id: 'tenant-1',
              currency: 'USD',
              business_full_name: 'ELEVORE PREMIUM SERVICES'
            }
          ])
        });
      } else if (url.includes('/rest/v1/staff_profiles')) {
        console.log('[Puppeteer Intercept]: Mocking staff_profiles query...');
        request.respond({
          status: 200,
          headers: {
            'access-control-allow-origin': '*',
            'content-type': 'application/json'
          },
          body: JSON.stringify([
            {
              id: 'staff-1',
              tenant_id: 'tenant-1',
              name: 'Team Alpha',
              role: 'staff',
              wallet_balance: 100,
              total_earned: 500
            }
          ])
        });
      } else {
        request.continue();
      }
    });

    page.on('console', (msg) => {
      console.log(`[BROWSER CONSOLE] [${msg.type()}]: ${msg.text()}`);
    });

    page.on('pageerror', (err) => {
      console.error(`[BROWSER RUNTIME ERROR]:`, err.stack);
    });

    console.log('Navigating to http://localhost:4173/?mision=job-1 ...');
    await page.goto('http://localhost:4173/?mision=job-1', { waitUntil: 'networkidle0', timeout: 15000 });

    // Wait for the portal to load
    console.log('Waiting for portal layout to render...');
    try {
      await page.waitForSelector('input[placeholder="4000 1234 5678 9010"]', { timeout: 10000 });
    } catch (err) {
      await page.screenshot({ path: 'scratch/portal_checkout_timeout.png' });
      const html = await page.content();
      console.log('Timeout HTML Dump:', html.substring(0, 1000));
      throw err;
    }
    
    // Scroll to the card section to view it clearly
    await page.evaluate(() => {
      const cardEl = document.querySelector('.card-3d');
      if (cardEl) cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await new Promise(r => setTimeout(r, 800));

    // Take initial screenshot of checkout area (empty card)
    await page.screenshot({ path: 'scratch/portal_checkout_empty.png' });
    console.log('Saved empty checkout screenshot.');

    // Click 15% tip button
    console.log('Selecting 15% tip option...');
    const tipBtns = await page.$$('button');
    for (const btn of tipBtns) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('15%')) {
        console.log(`Found tip button: "${text.trim()}". Clicking...`);
        await btn.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 300));

    // Fill in card information
    console.log('Typing card number...');
    await page.type('input[placeholder="4000 1234 5678 9010"]', '4242424242424242');
    await new Promise(r => setTimeout(r, 200));

    console.log('Typing expiry date...');
    await page.type('input[placeholder="MM/YY"]', '1229');
    await new Promise(r => setTimeout(r, 200));

    console.log('Typing CVC...');
    await page.type('input[placeholder="123"]', '999');
    await new Promise(r => setTimeout(r, 200));

    console.log('Typing cardholder name...');
    await page.type('input[placeholder="Nombre del Titular"]', 'JOSE MARIO');
    await new Promise(r => setTimeout(r, 500));

    // Scroll to card mockup
    await page.evaluate(() => {
      const cardEl = document.querySelector('.card-3d');
      if (cardEl) cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await new Promise(r => setTimeout(r, 500));

    // Take screenshot of filled virtual credit card
    await page.screenshot({ path: 'scratch/portal_checkout_filled.png' });
    console.log('Saved filled checkout screenshot.');

    // Submit checkout form
    console.log('Submitting card checkout form...');
    const payButton = await page.$('form button[type="submit"]');
    if (payButton) {
      console.log('Found Pay Button. Clicking...');
      await payButton.click();
    } else {
      throw new Error('Pay button not found!');
    }

    // Wait for the payment overlay and success transition
    console.log('Waiting for payment flow to process and complete...');
    await new Promise(r => setTimeout(r, 6500)); // The simulator takes about 5 seconds to run through connecting/verifying/authorizing/routing/success

    // Take post-payment screenshot
    await page.screenshot({ path: 'scratch/portal_checkout_success.png' });
    console.log('Saved success checkout screenshot.');

    console.log('Success! Last updated mission payload:', JSON.stringify(lastUpdatedPayload, null, 2));

  } catch (error) {
    console.error('Error during browser test:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
    console.log('Killing Preview server...');
    previewProcess.kill();
    process.exit(0);
  }
}, 5000);

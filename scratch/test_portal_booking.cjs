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
    await page.setViewport({ width: 1280, height: 950 });

    // Enable request interception to mock Supabase calls
    await page.setRequestInterception(true);
    
    let lastInsertedPayload = null;

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
            'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'access-control-allow-headers': allowedHeaders,
            'access-control-max-age': '86400'
          }
        });
        return;
      }

      if (url.includes('/rest/v1/elevore_missions')) {
        if (method === 'POST') {
          console.log('[Puppeteer Intercept]: Intercepted POST to elevore_missions (booking creation)');
          const body = JSON.parse(request.postData());
          lastInsertedPayload = Array.isArray(body) ? body[0] : body;
          request.respond({
            status: 201,
            headers: {
              'access-control-allow-origin': '*',
              'content-type': 'application/json'
            },
            body: JSON.stringify(body)
          });
        } else {
          console.log('[Puppeteer Intercept]: Mocking elevore_missions query...');
          request.respond({
            status: 200,
            headers: {
              'access-control-allow-origin': '*',
              'content-type': 'application/json'
            },
            body: JSON.stringify([
              {
                id: 'job-1',
                client_name: 'Jose Test 1',
                client_phone: '123456',
                address: '100 E Pine St, Orlando, FL 32801',
                service_type: 'Regular Cleaning',
                status: 'scheduled',
                scheduled_date: new Date().toISOString().split('T')[0],
                team_assigned: 'Team Alpha',
                tenant_id: 'tenant-1',
                specs: { lat: 28.5415, lng: -81.3788 }
              }
            ])
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
              name: 'Jose Test 1',
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
              currency: 'USD'
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
              role: 'staff'
            },
            {
              id: 'staff-2',
              tenant_id: 'tenant-1',
              role: 'staff'
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
    await page.waitForSelector('button', { timeout: 10000 });
    
    // Take pre-click screenshot
    await page.screenshot({ path: 'scratch/portal_loaded.png' });
    console.log('Saved loaded screenshot.');

    // Click the "Quick Booking" / "Reservar" tab
    console.log('Searching for Booking Tab...');
    const buttons = await page.$$('button');
    let foundTab = false;
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Book Service') || text.includes('Reservar') || text.includes('Nuevo Servicio')) {
        console.log(`Found tab button: "${text.trim()}". Clicking...`);
        await btn.click();
        foundTab = true;
        break;
      }
    }

    if (!foundTab) {
      throw new Error('Booking Tab button not found!');
    }

    // Wait for the booking form to transition in
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'scratch/portal_booking_tab.png' });
    console.log('Saved booking tab screenshot.');

    // Interact with the TimeSlotPicker
    console.log('Finding TimeSlotPicker buttons...');
    const timeSlotBtns = await page.$$('button');
    let selectedSlot = false;
    for (const btn of timeSlotBtns) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('10:00 AM') || text.includes('12:00 PM')) {
        console.log(`Clicking slot: "${text.trim()}"`);
        await btn.click();
        selectedSlot = true;
        break;
      }
    }

    if (!selectedSlot) {
      console.warn('Could not select a time slot button. Will proceed with defaults.');
    }

    // Capture screenshot before submit
    await page.screenshot({ path: 'scratch/portal_booking_filled.png' });

    // Find and click the Book / Agendar button
    console.log('Submitting the booking form...');
    const formButtons = await page.$$('button');
    let submitted = false;
    for (const btn of formButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Request Service') || text.includes('Solicitar Servicio') || text.includes('Confirm Booking') || text.includes('Agendar Servicio')) {
        console.log(`Clicking confirm button: "${text.trim()}"`);
        await btn.click();
        submitted = true;
        break;
      }
    }

    if (!submitted) {
      throw new Error('Could not find confirm booking button!');
    }

    // Wait for the Supabase request callback to be intercepted
    await new Promise(r => setTimeout(r, 2000));

    console.log('Success! Last inserted payload:', JSON.stringify(lastInsertedPayload, null, 2));
    
    if (lastInsertedPayload && lastInsertedPayload.specs && lastInsertedPayload.specs.booking_time) {
      console.log('Test Passed! booking_time is successfully integrated in the mission specs.');
    } else {
      console.error('Test Failed! booking_time was not found or not structured correctly in the payload.');
    }

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

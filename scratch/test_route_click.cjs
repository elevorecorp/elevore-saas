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

    // Enable request interception to mock Supabase jobs query
    await page.setRequestInterception(true);
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
              address: '100 E Pine St, Orlando, FL 32801',
              service_type: 'Regular Cleaning',
              status: 'scheduled',
              scheduled_date: new Date().toISOString().split('T')[0],
              team_assigned: 'Team Alpha',
              specs: { lat: 28.5415, lng: -81.3788 }
            },
            {
              id: 'job-2',
              client_name: 'Jose Test 2',
              address: '400 W Church St, Orlando, FL 32801',
              service_type: 'Deep Cleaning',
              status: 'scheduled',
              scheduled_date: new Date().toISOString().split('T')[0],
              team_assigned: 'Team Alpha',
              specs: null // Test geocoding/fallback logic
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
              id: '2',
              name: 'Team Alpha',
              role: 'staff',
              passcode: '1122',
              staff_email: 'team_alpha@company.com',
              tenant_id: 'tenant-1',
              wallet_balance: 240,
              total_earned: 1450
            }
          ])
        });
      } else if (url.includes('nominatim.openstreetmap.org/search')) {
        console.log('[Puppeteer Intercept]: Mocking Nominatim Geocoding...');
        request.respond({
          status: 200,
          headers: {
            'access-control-allow-origin': '*',
            'content-type': 'application/json'
          },
          body: JSON.stringify([{ lat: '28.5383', lon: '-81.3792' }])
        });
      } else if (url.includes('router.project-osrm.org/table/v1/driving')) {
        console.log('[Puppeteer Intercept]: Mocking OSRM Table...');
        request.respond({
          status: 200,
          headers: {
            'access-control-allow-origin': '*',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            distances: [
              [0, 5000],
              [5000, 0]
            ]
          })
        });
      } else if (url.includes('router.project-osrm.org/route/v1/driving')) {
        console.log('[Puppeteer Intercept]: Mocking OSRM Route...');
        request.respond({
          status: 200,
          headers: {
            'access-control-allow-origin': '*',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            routes: [
              {
                geometry: {
                  coordinates: [
                    [-81.3788, 28.5415],
                    [-81.3792, 28.5383]
                  ]
                }
              }
            ]
          })
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

    console.log('Navigating to http://localhost:4173/?view=auth ...');
    await page.goto('http://localhost:4173/?view=auth', { waitUntil: 'networkidle0', timeout: 15000 });

    // Click "Staff" tab button
    console.log('Selecting Staff Tab...');
    const tabs = await page.$$('button');
    for (const tab of tabs) {
      const text = await page.evaluate(el => el.textContent, tab);
      if (text.trim() === 'Staff') {
        await tab.click();
        break;
      }
    }

    // Wait for the PIN inputs to appear in DOM
    console.log('Waiting for inputs to mount...');
    await page.waitForSelector('input[type="password"]', { timeout: 5000 });

    // Fill in Staff Email and Access PIN
    console.log('Filling in login credentials...');
    const inputs = await page.$$('input');
    console.log(`Found ${inputs.length} inputs on screen.`);
    
    // Inputs: 0: Staff Email, 1: Access PIN
    await inputs[0].type('team_alpha@company.com');
    await inputs[1].type('1122');

    // Click submit button
    console.log('Submitting login form...');
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Access Field App')) {
        await btn.click();
        break;
      }
    }

    // Wait for login redirection
    console.log('Waiting for staff view redirection...');
    await new Promise(r => setTimeout(r, 4000));

    // Take screenshot of staff home
    await page.screenshot({ path: 'scratch/staff_home_pre_click.png' });

    // Click "Optimizar Ruta GPS (Leaflet)" button
    console.log('Searching for Optimizar Ruta GPS button...');
    const pageButtons = await page.$$('button');
    let clicked = false;
    for (const btn of pageButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Optimizar Ruta')) {
        console.log('Found button: Clicking...');
        await btn.click();
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      console.log('Button "Optimizar Ruta" not found. Check if Team Alpha has any jobs scheduled for today.');
    } else {
      // Wait for any crash or rendering
      await new Promise(r => setTimeout(r, 10000));
      await page.screenshot({ path: 'scratch/staff_after_click.png' });
      console.log('Screenshot after click saved.');
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

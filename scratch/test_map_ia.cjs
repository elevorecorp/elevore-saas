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
    await page.setViewport({ width: 1280, height: 1000 });

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
        if (method === 'PATCH' || method === 'POST') {
          request.respond({
            status: 200,
            headers: { 'access-control-allow-origin': '*' },
            body: JSON.stringify({ status: 'ok' })
          });
          return;
        }
        
        request.respond({
          status: 200,
          headers: {
            'access-control-allow-origin': '*',
            'content-type': 'application/json'
          },
          body: JSON.stringify([
            {
              id: 'job-1',
              client_name: 'Jose Mario',
              client_phone: '+1 407-555-0199',
              address: '100 E Pine St, Orlando, FL 32801',
              service_type: 'Limpieza Regular',
              status: 'lead',
              scheduled_date: new Date().toISOString().split('T')[0] + 'T09:00:00Z',
              team_assigned: '',
              client_rating: 3,
              specs: { clientNote: 'Necesita cuidado extra.', materialCost: 20 }
            },
            {
              id: 'job-2',
              client_name: 'Maria Delgado',
              client_phone: '+1 407-555-0188',
              address: '400 W Church St, Orlando, FL 32801',
              service_type: 'Limpieza Profunda',
              status: 'scheduled',
              scheduled_date: new Date().toISOString().split('T')[0] + 'T12:00:00Z',
              team_assigned: 'Team Alpha',
              client_rating: 5,
              specs: { materialCost: 30 }
            }
          ])
        });
      } else if (url.includes('/rest/v1/staff_profiles')) {
        request.respond({
          status: 200,
          headers: {
            'access-control-allow-origin': '*',
            'content-type': 'application/json'
          },
          body: JSON.stringify([
            { id: '1', name: 'Team Alpha', role: 'staff', tenant_id: 't1' },
            { id: '2', name: 'Team Beta', role: 'staff', tenant_id: 't1' }
          ])
        });
      } else {
        request.continue();
      }
    });

    console.log('Navigating to http://localhost:4173/?view=operations ...');
    await page.goto('http://localhost:4173/?view=operations', { waitUntil: 'networkidle2', timeout: 15000 });

    // Wait for the operations tabs to load
    await new Promise(r => setTimeout(r, 2000));

    // Find and click the "🗺️ IA Dispatcher" sub-tab button
    console.log('Selecting IA Dispatcher tab...');
    const buttons = await page.$$('button');
    let clickedMap = false;
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('IA Dispatcher')) {
        await btn.click();
        clickedMap = true;
        break;
      }
    }

    if (clickedMap) {
      console.log('Map tab clicked. Waiting for rendering...');
      await new Promise(r => setTimeout(r, 1500));

      // Capture initial state screenshot (unassigned warning visible)
      await page.screenshot({ path: 'scratch/operations_ia_map_pre.png' });
      console.log('Saved scratch/operations_ia_map_pre.png');

      // Click autopilot dispatch macro in console
      console.log('Triggering Autopilot Dispatch command...');
      const apBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.find(b => b.textContent.includes('/autopilot-dispatch'));
      });
      if (apBtn && apBtn.asElement()) {
        await apBtn.asElement().click();
      }

      // Wait for AI logs and DB updates to finish
      await new Promise(r => setTimeout(r, 3000));

      // Capture screenshot showing terminal logs and matched scores
      await page.screenshot({ path: 'scratch/operations_ia_map_post.png' });
      console.log('Saved scratch/operations_ia_map_post.png');
    } else {
      console.error('Could not find IA Dispatcher tab button!');
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

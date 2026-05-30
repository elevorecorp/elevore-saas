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
    await page.setViewport({ width: 1280, height: 900 });

    // Enable request interception to mock Supabase calls
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
        console.log('[Puppeteer Intercept]: Mocking elevore_missions...');
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
            }
          ])
        });
      } else if (url.includes('/rest/v1/staff_profiles')) {
        console.log('[Puppeteer Intercept]: Mocking staff_profiles...');
        request.respond({
          status: 200,
          headers: {
            'access-control-allow-origin': '*',
            'content-type': 'application/json'
          },
          body: JSON.stringify([
            {
              id: 1,
              name: 'Jose Mario',
              role: 'admin',
              passcode: '2026',
              staff_email: 'jose_mario@company.com'
            },
            {
              id: 2,
              name: 'Team Alpha',
              role: 'staff',
              passcode: '1122',
              staff_email: 'team_alpha@company.com'
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

    console.log('Navigating to http://localhost:4173/?view=operations ...');
    await page.goto('http://localhost:4173/?view=operations', { waitUntil: 'networkidle0', timeout: 15000 });

    await new Promise(r => setTimeout(r, 4000));
    await page.screenshot({ path: 'scratch/ops_dashboard_loaded.png' });

    // Search for "🎙️ Reuniones IA" sub-tab in operations tab switcher
    console.log('Searching for "🎙️ Reuniones IA" sub-tab button...');
    const subTabButtons = await page.$$('button');
    let foundMeetings = false;
    for (const btn of subTabButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Reuniones IA')) {
        console.log('Found "🎙️ Reuniones IA" button! Clicking...');
        await btn.click();
        foundMeetings = true;
        break;
      }
    }

    if (!foundMeetings) {
      console.error('Sub-tab button "🎙️ Reuniones IA" was NOT found! Check if ENABLE_AI is set correctly.');
      await page.screenshot({ path: 'scratch/meetings_subtab_not_found.png' });
      return;
    }

    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'scratch/meetings_tab_loaded.png' });
    console.log('Meetings tab loaded. Screen captured.');

    // Find the "Iniciar Reunión de Coordinación" button
    console.log('Searching for "Iniciar Reunión de Coordinación" button...');
    const pageButtons = await page.$$('button');
    let startedMeeting = false;
    for (const btn of pageButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Iniciar Reunión')) {
        console.log('Found "Iniciar Reunión" button! Clicking...');
        await btn.click();
        startedMeeting = true;
        break;
      }
    }

    if (!startedMeeting) {
      console.error('Button "Iniciar Reunión" not found.');
      return;
    }

    // Wait for mock speech transcription lines to populate
    console.log('Waiting for live transcription simulation...');
    await new Promise(r => setTimeout(r, 6000));
    await page.screenshot({ path: 'scratch/meetings_live_transcription.png' });

    // Click "Finalizar y Resumir con IA"
    console.log('Searching for "Finalizar y Resumir con IA" button...');
    const actionButtons = await page.$$('button');
    let finishedMeeting = false;
    for (const btn of actionButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Finalizar y Resumir')) {
        console.log('Found "Finalizar y Resumir" button! Clicking...');
        await btn.click();
        finishedMeeting = true;
        break;
      }
    }

    if (!finishedMeeting) {
      console.error('Button "Finalizar y Resumir" not found.');
      return;
    }

    // Wait for Ollama local or heuristic summary output
    console.log('Waiting for AI summary generation...');
    await new Promise(r => setTimeout(r, 5000));
    await page.screenshot({ path: 'scratch/meetings_final_summary.png' });
    console.log('Final summary view screen captured to scratch/meetings_final_summary.png.');

  } catch (error) {
    console.error('Error during AI meetings test:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
    console.log('Killing Preview server...');
    previewProcess.kill();
    process.exit(0);
  }
}, 5000);

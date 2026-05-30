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
              status: 'completed',
              scheduled_date: '2026-05-28',
              team_assigned: 'Team Alpha',
              client_rating: 5,
              check_in_time: '2026-05-28T09:00:00Z',
              check_out_time: '2026-05-28T11:30:00Z',
              specs: { clientNote: '¡Excelente trabajo del equipo! Todo quedó reluciente.', materialCost: 20 }
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
            { id: '1', name: 'Team Alpha', role: 'staff', tenant_id: 't1' }
          ])
        });
      } else {
        request.continue();
      }
    });

    console.log('Navigating to http://localhost:4173/?view=intel ...');
    await page.goto('http://localhost:4173/?view=intel', { waitUntil: 'networkidle2', timeout: 15000 });

    // Wait for the tabs to load
    await new Promise(r => setTimeout(r, 2000));

    // Find and click the "AI CFO y Flujo de Caja" sub-tab button
    console.log('Selecting AI CFO y Flujo de Caja tab...');
    const buttons = await page.$$('button');
    let clickedCfo = false;
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('AI CFO y Flujo de Caja')) {
        await btn.click();
        clickedCfo = true;
        break;
      }
    }

    if (clickedCfo) {
      console.log('CFO tab clicked. Waiting for rendering...');
      await new Promise(r => setTimeout(r, 1500));

      // Click playbook button 1 (GPS optimization)
      console.log('Activating GPS Optimization Playbook...');
      const gpsBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.find(b => b.textContent.includes('Inteligencia de Rutas GPS'));
      });
      if (gpsBtn && gpsBtn.asElement()) {
        await gpsBtn.asElement().click();
      }

      // Click playbook button 2 (Dynamic pricing)
      console.log('Activating Dynamic Pricing Playbook...');
      const priceBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.find(b => b.textContent.includes('Precios Dinámicos'));
      });
      if (priceBtn && priceBtn.asElement()) {
        await priceBtn.asElement().click();
      }

      // Run Monte Carlo stress test simulation
      console.log('Triggering Monte Carlo Simulation...');
      const mcBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.find(b => b.textContent.includes('Simular 1,000 Escenarios de Estrés'));
      });
      if (mcBtn && mcBtn.asElement()) {
        await mcBtn.asElement().click();
      }

      // Wait for the Monte Carlo timer/loading sequence to complete
      await new Promise(r => setTimeout(r, 1800));

      // Capture screenshot
      await page.screenshot({ path: 'scratch/bi_cfo.png' });
      console.log('Saved scratch/bi_cfo.png');
    } else {
      console.error('Could not find AI CFO y Flujo de Caja tab button!');
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

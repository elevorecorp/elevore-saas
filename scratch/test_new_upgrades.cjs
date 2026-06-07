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
    await page.setViewport({ width: 1280, height: 1200 });

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
          console.log('[Puppeteer Intercept]: Intercepted PATCH/PUT to elevore_missions');
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
            client_name: 'Jose Test Upgrades',
            client_phone: '123456789',
            address: '100 E Pine St, Orlando, FL 32801',
            service_type: 'Limpieza Regular',
            status: 'scheduled',
            scheduled_date: new Date().toISOString().split('T')[0],
            team_assigned: 'Team Alpha',
            tenant_id: 'tenant-1',
            total_price: 250,
            deposit_paid: 0,
            specs: { 
              lat: 28.5415, 
              lng: -81.3788,
              chat_messages: [
                { id: '1', sender: 'staff', text: 'Hola Jose! Estamos listos para comenzar.', time: new Date().toISOString() }
              ]
            }
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
        request.respond({
          status: 200,
          headers: {
            'access-control-allow-origin': '*',
            'content-type': 'application/json'
          },
          body: JSON.stringify([
            {
              id: 'client-1',
              name: 'Jose Test Upgrades',
              membership: 'premium',
              specs: { preferences: { pets: 'Dog', entryCode: '1234' } }
            }
          ])
        });
      } else if (url.includes('/rest/v1/tenant_settings')) {
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

    console.log('Navigating to client portal...');
    await page.goto('http://localhost:4173/?mision=job-1', { waitUntil: 'networkidle0', timeout: 15000 });

    // Wait for the portal layout to render
    await page.waitForSelector('button', { timeout: 10000 });
    console.log('Portal loaded.');

    // 1. OPEN CHAT DRAWER
    console.log('Locating Live Chat button...');
    const buttons = await page.$$('button');
    let chatBtn = null;
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Chat en Vivo con Técnico') || text.includes('Live Chat')) {
        chatBtn = btn;
        break;
      }
    }

    if (chatBtn) {
      console.log('Clicking Live Chat button...');
      await chatBtn.click();
      await new Promise(r => setTimeout(r, 800)); // wait for drawer animation
      await page.screenshot({ path: 'scratch/portal_chat_open.png' });
      console.log('Chat drawer open screenshot saved.');

      // Type a message
      console.log('Typing message in chat...');
      await page.type('input[name="chatInput"]', 'Hola! Necesito que presten especial atencion al balcon por favor.');
      await new Promise(r => setTimeout(r, 200));

      // Submit form
      const sendBtn = await page.$('form button[type="submit"]');
      if (sendBtn) {
        console.log('Clicking Send Button...');
        await sendBtn.click();
        await new Promise(r => setTimeout(r, 1000));
        console.log('Chat message submitted.');
      }
      
      await page.screenshot({ path: 'scratch/portal_chat_sent.png' });
    } else {
      throw new Error('Chat button not found!');
    }

    // 2. OPEN CALENDAR MODAL
    console.log('Navigating to Booking Tab...');
    let bookingTab = null;
    const tabBtns = await page.$$('button');
    for (const btn of tabBtns) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Reservas') || text.includes('Booking') || text.includes('Book Service') || text.includes('Agendar')) {
        bookingTab = btn;
        break;
      }
    }

    if (bookingTab) {
      console.log('Clicking Booking Tab...');
      await bookingTab.click();
      await new Promise(r => setTimeout(r, 1000));

      // Click Calendario button
      console.log('Locating Calendario button...');
      const calBtns = await page.$$('button');
      let calendarBtn = null;
      for (const btn of calBtns) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text.includes('Calendario') || text.includes('Calendar')) {
          calendarBtn = btn;
          break;
        }
      }

      if (calendarBtn) {
        console.log('Clicking Calendario button...');
        await calendarBtn.click();
        await new Promise(r => setTimeout(r, 800)); // wait for modal animation
        await page.screenshot({ path: 'scratch/portal_calendar_modal.png' });
        console.log('Calendar modal screenshot saved.');

        // Close calendar modal
        const closeBtns = await page.$$('button');
        for (const btn of closeBtns) {
          const text = await page.evaluate(el => el.textContent, btn);
          if (text.includes('Cerrar') || text.includes('Close')) {
            console.log('Clicking Close Calendar Modal...');
            await btn.click();
            break;
          }
        }
        await new Promise(r => setTimeout(r, 500));
      } else {
        console.warn('Calendar button not found in TimeSlotPicker!');
      }
    } else {
      console.warn('Booking Tab button not found!');
    }

    console.log('E2E Upgrades Test Complete. Last updated payload:', JSON.stringify(lastUpdatedPayload, null, 2));

  } catch (error) {
    console.error('Error during upgrades browser test:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
    console.log('Killing Preview server...');
    previewProcess.kill();
    process.exit(0);
  }
}, 5000);

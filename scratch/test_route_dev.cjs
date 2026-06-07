const puppeteer = require('puppeteer');

setTimeout(async () => {
  console.log('Launching browser via Puppeteer to test dev server...');
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
            'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
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
      } else if (url.includes('/auth/v1/token')) {
        request.respond({
          status: 200,
          headers: {
            'access-control-allow-origin': '*',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            access_token: 'mocked_access_token',
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'mocked_refresh_token',
            user: {
              id: '2',
              email: 'team_alpha@company.com',
              user_metadata: {
                name: 'Team Alpha',
                role: 'staff',
                tenant_id: 'tenant-1'
              }
            }
          })
        });
      } else if (url.includes('/rest/v1/tenants')) {
        request.respond({
          status: 200,
          headers: {
            'access-control-allow-origin': '*',
            'content-type': 'application/json'
          },
          body: JSON.stringify([
            {
              id: 'tenant-1',
              business_name: 'Elevore Empire',
              stripe_subscription_status: 'trialing'
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
              id: '2',
              user_id: '2',
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
      } else if (url.includes('/rest/v1/clients')) {
        request.respond({
          status: 200,
          headers: {
            'access-control-allow-origin': '*',
            'content-type': 'application/json'
          },
          body: JSON.stringify([])
        });
      } else if (url.includes('/rest/v1/tenant_settings')) {
        request.respond({
          status: 200,
          headers: {
            'access-control-allow-origin': '*',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            id: 'settings-1',
            tenant_id: 'tenant-1',
            business_full_name: 'Elevore Empire',
            google_review_link: 'https://g.page/r/review'
          })
        });
      } else if (url.includes('/rest/v1/staff_payouts')) {
        request.respond({
          status: 200,
          headers: {
            'access-control-allow-origin': '*',
            'content-type': 'application/json'
          },
          body: JSON.stringify([])
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

    console.log('Navigating to http://localhost:5173/?view=auth ...');
    await page.goto('http://localhost:5173/?view=auth', { waitUntil: 'networkidle2', timeout: 15000 });

    console.log('Waiting 5 seconds to observe console logs...');
    await new Promise(r => setTimeout(r, 5000));

  } catch (error) {
    console.error('Error during browser test:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
    process.exit(0);
  }
}, 1000);

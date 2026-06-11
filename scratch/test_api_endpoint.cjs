const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function main() {
  try {
    console.log("=== TESTING LIVE API ENDPOINT ===");
    const response = await fetch("https://elevore-saas.vercel.app/api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        to: "josemarioal14@gmail.com",
        subject: "Direct Test from API Endpoint script",
        tenant_id: "4ec723ab-4612-4c23-a550-f220939ff1c4",
        html: "<p>Hello, this is a test of the live api endpoint using your configured Gmail SMTP settings.</p>"
      })
    });

    console.log("HTTP Status:", response.status);
    const text = await response.text();
    console.log("Response Body:", text);
  } catch (err) {
    console.error("Error:", err);
  }
}

main();

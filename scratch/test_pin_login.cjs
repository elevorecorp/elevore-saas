const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://ceijlgurveaalvjmptns.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlaWpsZ3VydmVhYWx2am1wdG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MTYwMzEsImV4cCI6MjA5MjM5MjAzMX0.XaPMpXxwMKRM09YN9kroF-gnISM2gBn29wi2R2UdOIc";

const sb = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const pin = '1111';
  const email = 'jei@gmail.com';
  console.log(`Simulating PIN login check for PIN: ${pin}, Email: ${email}`);

  const { data, error } = await sb
    .from('staff_profiles')
    .select('*')
    .eq('passcode', pin);

  if (error) {
    console.error("Query Error:", error);
    return;
  }

  console.log("Query returned records count:", data.length);
  console.log("Records returned:", data);

  const matched = data.find(s => {
    const storedEmail = s.staff_email || s.name || '';
    return storedEmail.toLowerCase().includes(email.trim().toLowerCase());
  });

  if (matched) {
    console.log("Success! Matched employee:", matched);
  } else {
    console.log("Match failed. No employee matched the email.");
  }
}

main();

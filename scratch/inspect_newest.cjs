const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://ceijlgurveaalvjmptns.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlaWpsZ3VydmVhYWx2am1wdG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MTYwMzEsImV4cCI6MjA5MjM5MjAzMX0.XaPMpXxwMKRM09YN9kroF-gnISM2gBn29wi2R2UdOIc";

const sb = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log("Fetching newest staff_profiles records...");
  const { data, error } = await sb.from('staff_profiles').select('*').order('created_at', { ascending: false }).limit(5);
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success:", data);
  }
}

main();

import { Inngest } from "inngest";

// Create a client to send and receive events
// If no signing key is found, force development mode to prevent server crashes on Vercel
const hasSigningKey = !!process.env.INNGEST_SIGNING_KEY;
export const inngest = new Inngest({ 
  id: "elevore-saas",
  isDev: !hasSigningKey
});

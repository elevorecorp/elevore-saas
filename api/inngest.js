import { serve } from "inngest/next";
import { inngest } from "../src/inngest/client.js";
import { 
  helloWorld, 
  dailySyncExample,
  googleReviewBooster,
  quoteChase,
  winBackCampaign,
  onMyWayAlert,
  weeklyPayrollReport
} from "../src/inngest/functions.js";

// Export the serve handler for Vercel serverless functions
export default serve({
  client: inngest,
  functions: [
    helloWorld,
    dailySyncExample,
    googleReviewBooster,
    quoteChase,
    winBackCampaign,
    onMyWayAlert,
    weeklyPayrollReport
  ],
});

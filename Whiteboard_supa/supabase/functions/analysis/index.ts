// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Hono } from "npm:hono";
import { WhiteboardAnalyzer } from "../_shared/analysis/WhiteboardAnalyzer.ts";

// Set the base path
const functionName = "analysis";

// Create a new Hono app
const app = new Hono().basePath(`/${functionName}`);

// Runs any pending or stuck jobs and clears complete jobs
app.post("/board-history/:id", async (c) => {
  try {
    // Get the measure result id
    const boardHistoryId = c.req.param("id");

    // Validate the board history id
    if (!boardHistoryId) {
      return c.text("id is required", 400);
    }

    // Create the whiteboard analyzer
    const whiteboardAnalyzer = new WhiteboardAnalyzer();

    // Start the explanation and get the output as an async iterable
    await whiteboardAnalyzer.analyzeBoardHistory(
      boardHistoryId,
    );

    // Error handling
  } catch (error) {
    console.error(error);
    return c.text("error", 500);
  }
});

// Integrate with Deno's server (for Edge Function)
Deno.serve(app.fetch); // app.fetch gives a fetch(Request) -> Response handler

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/analysis' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/

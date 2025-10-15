import { BoardHistory } from "../data/entities.ts";
import { Database } from "../data/types.ts";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.53.0";

/**
 * A class that analyzes conversation data and provides explanations for measure results.
 */
export class WhiteboardAnalyzer {
    private supabase: SupabaseClient<Database>;
    // #region [Constructors]
    /**
     * Creates a new ConversationAnalysis.
     * @param supabase - The Supabase client to use.
     */
    constructor() {
        const url = Deno.env.get("SUPABASE_URL");
        const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (!url || !key) {
            throw new Error(
                "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set",
            );
        }
        this.supabase = createClient<Database>(url, key);
    }
    // #endregion [Constructors]

    // #region [Public Methods]

    /**
     * Analyzes a single board history.
     * @param boardHistory - The board history to evaluate.
     */
    async analyzeBoardHistory(
        boardHistoryId: string,
    ): Promise<void> {

        console.log("Analyzing board history", boardHistoryId);

        // Get the board history
        const loadResult = await this.supabase
            .from("boardhistory")
            .select("*")
            .eq("id", boardHistoryId)
            .single();

        if (loadResult.error) {
            throw new Error("Failed to get board history");
        }

        // TODO: Implement the analysis

        const boardHistory = loadResult.data;

        boardHistory.text = "server processed " + new Date().toISOString();

        // Insert or update the board history
        const updateResult = await this.supabase
            .from("boardhistory")
            .upsert(boardHistory);

        if (updateResult.error) {
            throw new Error("Failed to upsert board history");
        }
    }
    // #endregion [Public Methods]
}

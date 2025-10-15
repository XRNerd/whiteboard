import NativeLogger from "SpectaclesInteractionKit.lspkg/Utils/NativeLogger";
import { Database } from "../../../../DatabaseTypes";
import { SupabaseClient, createClient } from "SupabaseClient.lspkg/supabase-snapcloud";
import { SnapCloudRequirements } from "Examples/SnapCloudRequirements";

/**
 * Manages all aspects of the RAM including solving, visualizing, selection, etc.
 */
@component
export  class BaseSupaBaseConnectingController extends BaseScriptComponent {

    /* #region [Private Variables] */
    protected client: SupabaseClient<Database>;
    protected readonly log = new NativeLogger(this.getTypeName()); 
    protected uid: string;
    /* #endregion [Private Variables] */

    /* #region [Inspector Inputs] */
    @ui.group_start('Services')
    @input
    @hint("Reference to SnapCloudRequirements for centralized Supabase configuration")
    protected snapCloudRequirements: SnapCloudRequirements;
    @ui.group_end

    /* #endregion [Inspector Inputs] */

    /* #region [Private Methods] */
    async initSupabase() {
        if (!this.snapCloudRequirements || !this.snapCloudRequirements.isConfigured()) {
            this.log.e("SnapCloudRequirements not configured");
            return;
        }

        const supabaseProject = this.snapCloudRequirements.getSupabaseProject();
        this.client = createClient<Database>(supabaseProject.url, supabaseProject.publicToken)
        this.log.i("Client is ready");
        if (this.client) {
            await this.signInUser();
            print("User is authenticated");
        }
    }

    async signInUser() {
        print("BEFORE Sign in user");
        const { data, error } = await this.client.auth.signInWithIdToken({} as any)
        print("Sign in user");
        if (error) {
            this.log.e("Sign in error: " + JSON.stringify(error));
        } else {
            const { user, session } = data
            print(`User: ${JSON.stringify(user)}`);
            print(`Session: ${JSON.stringify(session)}`);

            this.uid = JSON.stringify(user.id);
        }
    }

    onAwake() {
        this.createEvent("OnStartEvent").bind(this.onStart.bind(this));
    }

    /**
     * Start the acoustic reflection calculation when the scene begins
     */
    protected async onStart() {
        await this.initSupabase();
    }
    /* #endregion [Lifecycle Methods] */
}
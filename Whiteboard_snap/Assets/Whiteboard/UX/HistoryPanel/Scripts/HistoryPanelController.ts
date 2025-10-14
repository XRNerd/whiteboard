import NativeLogger from "SpectaclesInteractionKit.lspkg/Utils/NativeLogger";
import { Database } from "../../../../DatabaseTypes";
import { SupabaseClient, createClient } from "SupabaseClient.lspkg/supabase-snapcloud";
import { SnapCloudRequirements } from "Examples/SnapCloudRequirements";
const remoteMediaModule = require('LensStudio:RemoteMediaModule');
const internetModule = require('LensStudio:InternetModule');

/**
 * Manages all aspects of the RAM including solving, visualizing, selection, etc.
 */
@component
export class HistoryPanelController extends BaseScriptComponent {

    /* #region [Private Variables] */
    private client: SupabaseClient<Database>;
    private readonly log = new NativeLogger("HistoryPanelController");
    private uid: string;
    /* #endregion [Private Variables] */

    /* #region [Inspector Inputs] */
    @ui.group_start('Services')
    @input
    @hint("Reference to SnapCloudRequirements for centralized Supabase configuration")
    snapCloudRequirements: SnapCloudRequirements;
    @ui.group_end

    @ui.group_start('UI')
    @input
    @hint("Image to display snapshots")
    image: Image;

    @input
    @hint("Text to display OCR or summary")
    text: Text;
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
    /**
     * Load the data for the history panel
     * 
     * @returns Promise<void>
     */
    private async loadData(): Promise<void> {
        this.log.d("Loading Data from boardhistory table");

        // Just load the first record for now
        const dataResponse = await this.client.from("boardhistory").select("*").limit(1);
        const firstRecord = dataResponse.data[0];
        this.log.d("data loaded: " + JSON.stringify(firstRecord));

        // Set the text
        this.text.text = firstRecord.text;

        // Load the image
        this.log.d("loading image from: " + firstRecord.image_url);
        const fileResponse = await this.client.storage.from("boardsnapshots").download(firstRecord.image_url);

        if (fileResponse.error) {
            this.log.e("Error fetchig image: " + JSON.stringify(fileResponse.error));
            return;
        }
        else {
            let dynamicResource = internetModule.makeResourceFromBlob(fileResponse.data);
            remoteMediaModule.loadResourceAsImageTexture(
                dynamicResource,
                (texture) => {
                    print("Success");
                    this.image.mainPass.baseTex = texture;
                },
                (error) => { print("Failed due to error"); }
            );
        }


    }

    /**
     * Load image from JPEG byte array data
     * 
     * @param bytes - JPEG encoded byte array
     */
    private loadImageFromBytes(bytes: Uint8Array): void {
        try {
            // Convert Uint8Array to Base64 string using Lens Studio API
            const base64String = Base64.encode(bytes);

            // Decode Base64 string to texture using Lens Studio API
            Base64.decodeTextureAsync(
                base64String,
                (texture: Texture) => {
                    this.log.d("Image texture loaded successfully");
                    this.image.mainPass.baseTex = texture;
                },
                () => {
                    this.log.e("Failed to decode Base64 texture");
                }
            );
        } catch (error) {
            this.log.e("Error converting bytes to Base64: " + error);
        }
    }
    /* #endregion [Private Methods] */

    /* #region [Lifecycle Methods] */
    /**
     * Initialize the scene manager and bind to start event
     */
    onAwake() {
        this.createEvent("OnStartEvent").bind(this.onStart.bind(this));
    }

    /**
     * Start the acoustic reflection calculation when the scene begins
     */
    async onStart() {
        await this.initSupabase();
        await this.loadData();
    }
    /* #endregion [Lifecycle Methods] */
}
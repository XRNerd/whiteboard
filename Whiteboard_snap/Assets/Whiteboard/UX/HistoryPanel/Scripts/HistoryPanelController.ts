import NativeLogger from "SpectaclesInteractionKit.lspkg/Utils/NativeLogger";
import { Database } from "../../../../DatabaseTypes";
import { SupabaseClient, createClient } from "SupabaseClient.lspkg/supabase-snapcloud";
import { SnapCloudRequirements } from "Examples/SnapCloudRequirements";
const remoteMediaModule = require('LensStudio:RemoteMediaModule');
const internetModule = require('LensStudio:InternetModule');
import { RectangleButton } from "SpectaclesUIKit.lspkg/Scripts/Components/Button/RectangleButton";

/**
 * Manages all aspects of the RAM including solving, visualizing, selection, etc.
 */
@component
export class HistoryPanelController extends BaseScriptComponent {

    /* #region [Private Variables] */
    private client: SupabaseClient<Database>;
    private readonly log = new NativeLogger("HistoryPanelController");
    private uid: string;
    private allRecords: any[] = [];
    private currentIndex: number = 0;
    private totalRecords: number = 0;
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

    @input
    @hint("Previous Button")
    previousButton: RectangleButton;

    @input
    @hint("Next Button")
    nextButton: RectangleButton;
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
     * Load all data for the history panel and set up navigation
     * 
     * @returns Promise<void>
     */
    private async loadData(): Promise<void> {
        this.log.d("Loading all data from boardhistory table");

        // Load all records
        const dataResponse = await this.client.from("boardhistory").select("*").order("created_at", { ascending: false });
        
        if (dataResponse.error) {
            this.log.e("Error loading data: " + JSON.stringify(dataResponse.error));
            return;
        }

        this.allRecords = dataResponse.data;
        this.totalRecords = this.allRecords.length;
        this.currentIndex = 0;

        this.log.d(`Loaded ${this.totalRecords} records`);

        if (this.totalRecords > 0) {
            await this.loadRecordByIndex(0);
        }
    }

    /**
     * Load a specific record by index
     * 
     * @param index - The index of the record to load
     * @returns Promise<void>
     */
    private async loadRecordByIndex(index: number): Promise<void> {
        if (index < 0 || index >= this.totalRecords) {
            this.log.e(`Invalid index: ${index}. Total records: ${this.totalRecords}`);
            return;
        }

        const record = this.allRecords[index];
        this.log.d(`Loading record ${index + 1}/${this.totalRecords}: ${JSON.stringify(record)}`);

        // Set the text
        this.text.text = record.text;

        // Load the image
        this.log.d("loading image from: " + record.image_url);
        const fileResponse = await this.client.storage.from("boardsnapshots").download(record.image_url);

        if (fileResponse.error) {
            this.log.e("Error fetching image: " + JSON.stringify(fileResponse.error));
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
     * Navigate to the next record with wrapping
     */
    private async goToNext(): Promise<void> {
        if (this.totalRecords === 0) return;

        this.currentIndex = (this.currentIndex + 1) % this.totalRecords;
        await this.loadRecordByIndex(this.currentIndex);
        this.log.d(`Navigated to next record. Current index: ${this.currentIndex}`);
    }

    /**
     * Navigate to the previous record with wrapping
     */
    private async goToPrevious(): Promise<void> {
        if (this.totalRecords === 0) return;

        this.currentIndex = this.currentIndex === 0 ? this.totalRecords - 1 : this.currentIndex - 1;
        await this.loadRecordByIndex(this.currentIndex);
        this.log.d(`Navigated to previous record. Current index: ${this.currentIndex}`);
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
     * Set up button click handlers for navigation
     */
    private setupButtonHandlers(): void {
        if (this.previousButton) {
            this.previousButton.onTriggerUp.add(() => {
                this.log.d("Previous button clicked");
                this.goToPrevious();
            });
        }

        if (this.nextButton) {
            this.nextButton.onTriggerUp.add(() => {
                this.log.d("Next button clicked");
                this.goToNext();
            });
        }
    }

    /**
     * Start the acoustic reflection calculation when the scene begins
     */
    async onStart() {
        await this.initSupabase();
        await this.loadData();
        this.setupButtonHandlers();
    }
    /* #endregion [Lifecycle Methods] */
}
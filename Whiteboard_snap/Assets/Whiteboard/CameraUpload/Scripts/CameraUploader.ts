import { BaseSupaBaseConnectingController } from "Whiteboard/UX/HistoryPanel/Scripts/BaseSupaBaseConnectingController";
const remoteMediaModule = require('LensStudio:RemoteMediaModule') as RemoteMediaModule

@component
export class CameraUploader extends BaseSupaBaseConnectingController {
    @ui.group_start('Debug')
    @input text: Text;
    @input
    @hint("Image to display uploaded file")
    image: Image;
    @ui.group_end

    private cameraModule: CameraModule = require('LensStudio:CameraModule');
    private internetModule = require('LensStudio:InternetModule') as InternetModule;

    private cameraTexture: Texture;
    private cameraRequest: CameraModule.CameraRequest;
    private cameraTextureProvider: CameraTextureProvider;
    private registration: EventRegistration;

    onAwake() {
        this.createEvent("TapEvent").bind(() => {
            this.getCameraFrame();
        });
        super.onAwake();
    }

    private getCameraFrame(): void {
        this.cameraRequest = CameraModule.createCameraRequest();
        this.cameraRequest.cameraId = CameraModule.CameraId.Default_Color;

        this.cameraTexture = this.cameraModule.requestCamera(this.cameraRequest);
        this.cameraTextureProvider = this.cameraTexture
            .control as CameraTextureProvider;

        this.registration = this.cameraTextureProvider.onNewFrame.add(async(frame) => await this.processFrame());
    }

    private async processFrame() : Promise<void> {
        this.cameraTextureProvider.onNewFrame.remove(this.registration);
        let singleTexture = this.cameraTexture.copyFrame();
        var result = await this.addSnapshotTexture(singleTexture);
        this.DebugLog("Uploaded snapshot, result: " + result);
    }


    private async addSnapshotBase64(base64String: string): Promise<string> {
        const result = await this.client.functions.invoke("addsnapshot", {
            body: {
                data: base64String
            }
        });
        return result.data.path as string;
    }

    private async addSnapshotTexture(tex: Texture): Promise<string> {
        return new Promise((resolve, reject) => {
            const base64String = Base64.encodeTextureAsync(tex, (base64String) => {
                this.addSnapshotBase64(base64String).then(resolve).catch(reject);
            }, () => { print("Failed to encode texture due to error"); }, CompressionQuality.HighQuality, EncodingType.Jpg);
        });    
    }


 
    private DebugLog(message: string): void {
        this.text.text = message;
        print(message);
    }
}
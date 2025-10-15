import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";
import { CameraUploader } from "./CameraUploader";

@component
export class HandMenuButtonController extends BaseScriptComponent {
    @input cameraUploader: CameraUploader;
    @input photoButton: Interactable;

    onAwake() {
        const delayedEvent = this.createEvent("DelayedCallbackEvent");
        delayedEvent.bind(() => {
            this.initializeEvents();
        });
        delayedEvent.reset(1);
    }

    private initializeEvents(): void {
        if (this.photoButton) {
            this.photoButton.onTriggerEnd.add(() => this.onPhotoButtonPressed());
        } 
    }

    private onPhotoButtonPressed(): void {
        if (this.cameraUploader) {
        const delayedEvent = this.createEvent("DelayedCallbackEvent");
        delayedEvent.bind(() => {
            this.cameraUploader.getCameraFrame();
        });
        delayedEvent.reset(1);
            
        } else {
            print("CameraUploader reference is not set.");
        }
    }
}
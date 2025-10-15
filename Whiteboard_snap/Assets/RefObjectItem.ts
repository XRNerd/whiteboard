import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";
import { InteractorEvent } from "SpectaclesInteractionKit.lspkg/Core/Interactor/InteractorEvent";
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"
import { SIK } from "SpectaclesInteractionKit.lspkg/SIK";
//import { FreeDrawManager } from "./FreeDrawManager";

@component
export class RefObjectItem extends BaseScriptComponent {
    
    
    private interactable: Interactable | null = null
    private isGrabbed: boolean = false
    
    private onItemGrabbedEvent = new Event<InteractorEvent>()
    public readonly onItemGrabbed = this.onItemGrabbedEvent.publicApi()
    private onItemReleasedEvent = new Event<InteractorEvent>()
    public readonly onItemReleased = this.onItemReleasedEvent.publicApi()

    public isSpawned: boolean = false;

    onAwake() {
        this.interactable = this.getSceneObject().getComponent(
            Interactable.getTypeName(),
        )
        this.createEvent("OnStartEvent").bind(() => {
            if(!this.interactable) {
                throw new Error(
                    "FreeDrawItem requires an interactable component on the same scene object"
                )
            }
            this.interactable.onTriggerStart.add((interactorEvent: InteractorEvent) => {
                if(this.enabled)
                {
                    this.isGrabbed = true
                    this.onGrabStarted()
                    this.onItemGrabbedEvent.invoke(interactorEvent)
                }
            })
            this.interactable.onTriggerEnd.add((interactorEvent: InteractorEvent) => {
                if(this.enabled) {
                    this.isGrabbed = false
                    this.onGrabEnded()
                    this.onItemReleasedEvent.invoke(interactorEvent)
                }
            })
            // FreeDrawManager.addItem(this);
        })
    }
    public toggleInteraction(isEnabled: boolean){
        if(this != null && this.interactable != null)
            this.interactable.enabled = isEnabled;
    }
    onStart(): void {
        this.interactable = this.sceneObject.getComponent(
            Interactable.getTypeName()
        );
    }

    onGrabStarted(): void {
        
    }

    onGrabEnded(): void {
        // if(!FreeDrawManager.containsItem(this))
        //     FreeDrawManager.addItem(this);
        //print("Grab ended");
    }

    // onDestroy(): void {
    //     FreeDrawManager.removeItem(this);
    // }

    // Helper method to get current world position
    public getWorldPosition(): vec3 {
        return this.getSceneObject().getTransform().getWorldPosition();
    }

    // Getter for grabbed state
    public isBeingGrabbed(): boolean {
        return this.isGrabbed;
    }
}
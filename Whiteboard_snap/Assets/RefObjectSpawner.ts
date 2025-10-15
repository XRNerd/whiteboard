import { RefObjectItem } from "RefObjectItem";
import { RefObjectManager } from "RefObjectManager";
import { InteractorEvent } from "SpectaclesInteractionKit.lspkg/Core/Interactor/InteractorEvent";

@component
export class RefObjectSpawner extends BaseScriptComponent {
    @input prefab: ObjectPrefab;
    //@input remoteAssetHolderPrefab: ObjectPrefab; // The scene object to which the prefab will be attached
    @input spawnDistance: number = 5; // Distance threshold for respawning 
    //@input manager: RefObjectManager;


    public remotePrefab: RemoteReferenceAsset;
    public useRemotePrefab: boolean = false;
    public browser: any = null; // Should be FreeDrawObjectBrowser, but use any for now

    private spawnedItems: RefObjectItem[] = [];
    private downloadedPrefab: ObjectPrefab | null = null;
    private spawnedScale: vec3;

    onAwake() {
        this.createEvent('OnStartEvent').bind(() => {
            if (this.useRemotePrefab) {
                // print(`Downloading Remote Prefab`)
                this.downloadAsset();
            } else {
                // print('Spawning Initial Prefab')
                this.spawnInitialItem();
            }
        });
    }

    private spawnInitialItem(): void {
        // if (!this.prefab) {
        //     throw new Error("FreeDrawSpawner: prefab is not set!");
        // }
        this.spawnItem();
    }

    private spawnItem(): void {
        let spawnObject;
        let spawnedTransform;
        let remoteHolder;
        if (this.useRemotePrefab && this.downloadedPrefab) {
            // Spawn a remote holder object to attach the remote prefab too
            // This is needed becuase there are issues with adding components at runtime and remote assets dont support scripts, 
            // so we use a preconfigured prefab with the FreeDrawItem component already added to it
            // print("Spawning Remote Asset Holder for " + this.downloadedPrefab.name)
            // remoteHolder = this.remoteAssetHolderPrefab.instantiate(this.sceneObject);
            // Zero out the remote holder transform
            var remoteHolderTransform = remoteHolder.getTransform();
            remoteHolderTransform.setLocalPosition(new vec3(0, 0, 0));
            remoteHolderTransform.setLocalRotation(quat.quatIdentity());
            //Spawn the downloaded prefab and attach it to the remote holder
            // print("spawning downloaded remotePrefab" + this.downloadedPrefab.name)
            spawnObject = this.downloadedPrefab.instantiate(this.sceneObject);
            spawnedTransform = spawnObject.getTransform();
            let scale = spawnedTransform.getLocalScale();
            let scaleFactor = 0.0007;
            this.spawnedScale = scale.uniformScale(scaleFactor);
            //HACK: Need to shrink the remote spawned object by 999% cuz they spawn at 100x size even when the prefab is set to 1x
            spawnedTransform.setLocalScale(this.spawnedScale);
            //log the scale of the spawned object
            //print(`Spawned Object Scale: (${scale.x.toFixed(2)}, ${scale.y.toFixed(2)}, ${scale.z.toFixed(2)})`);

            // Attach the downloaded prefab to the remote holder
            spawnObject.setParent(remoteHolder);
            
            
        } else {
            // print("spawning local prefab")
            spawnObject = this.prefab.instantiate(this.sceneObject);
            
            spawnedTransform = spawnObject.getTransform();
            this.spawnedScale = spawnedTransform.getLocalScale(); 

            spawnedTransform.setLocalScale(this.spawnedScale.uniformScale(2));
            //Rotate the object 90 degrees on the Y-axis
            //spawnedTransform.setLocalRotation(quat.angleAxis(Math.PI / 2, vec3.up()));
            this.spawnedScale = spawnedTransform.getLocalScale(); 

        }



        //var spawnedTransform = spawnObject.getTransform();
        spawnedTransform.setLocalPosition(new vec3(0,0,0));
        spawnedTransform.setLocalRotation(quat.quatIdentity());
        let refObjectItem;
        // Get the FreeDrawItem component and set up its events
        if(this.useRemotePrefab)
        {
            refObjectItem = remoteHolder.getComponent(RefObjectItem.getTypeName()) as RefObjectItem;
        } else {
            refObjectItem = spawnObject.getComponent(RefObjectItem.getTypeName()) as RefObjectItem;
        }

        if (refObjectItem) {
            this.spawnedItems.push(refObjectItem);
            // Register with browser if available
            if (this.browser && typeof this.browser.registerSpawnedItem === 'function') {
                this.browser.registerSpawnedItem(refObjectItem);
            }
            // Pass references down to the item for self-registration
            //refObjectItem.manager = this.manager;
            refObjectItem.modelId = this.useRemotePrefab && this.remotePrefab ? this.remotePrefab.name : (this.prefab ? this.prefab.name : "");
            refObjectItem.onItemGrabbed.add((event: InteractorEvent) => {
                if(!refObjectItem.isSpawned){
                    spawnedTransform.setLocalScale(this.spawnedScale.uniformScale(2));
                    refObjectItem.isSpawned = true;
                }
                
            });
            // Listen for item release events
            refObjectItem.onItemReleased.add((event: InteractorEvent) => {
                this.checkItemDistance(refObjectItem);
            });
        } else {
            print("FreeDrawItem component not found on spawned object" + spawnObject.name);
        }

        // Log the spawned object's transform
        const localPos = spawnedTransform.getLocalPosition();
        const localRot = spawnedTransform.getLocalRotation();
        const worldPos = spawnedTransform.getWorldPosition();
        const worldRot = spawnedTransform.getWorldRotation();
        
        
        // print(`Spawned Object Transform:
        //     Local Position: (${localPos.x.toFixed(2)}, ${localPos.y.toFixed(2)}, ${localPos.z.toFixed(2)})
        //     Local Rotation: (${localRot.x.toFixed(2)}, ${localRot.y.toFixed(2)}, ${localRot.z.toFixed(2)}, ${localRot.w.toFixed(2)})
        //     World Position: (${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)}, ${worldPos.z.toFixed(2)})
        //     World Rotation: (${worldRot.x.toFixed(2)}, ${worldRot.y.toFixed(2)}, ${worldRot.z.toFixed(2)}, ${worldRot.w.toFixed(2)})`);
    }

    private checkItemDistance(item: RefObjectItem): void {
        const itemPos = item.getWorldPosition();
        const spawnerPos = this.getSceneObject().getTransform().getWorldPosition();
        
        // Calculate distance between item and spawner
        const diff = new vec3(
            itemPos.x - spawnerPos.x,
            itemPos.y - spawnerPos.y,
            itemPos.z - spawnerPos.z
        );
        const distance = Math.sqrt(diff.x * diff.x + diff.y * diff.y + diff.z * diff.z);
        //print(`Item moved ${distance.toFixed(2)} units away`);
        // If item is far enough away, spawn a new one
        if (distance > this.spawnDistance) {
            //print(`Item moved ${distance.toFixed(2)} units away, spawning new item`);
            this.spawnItem();
        }
    }

    onDestroy(): void {
        // Clean up any event listeners if needed
        this.spawnedItems = [];
    }


    /* download remote asset from its reference */
    private downloadAsset(): void {
        if (!this.remotePrefab) {
            print("No remote prefab set!");
            return;
        }

        // print('Downloading remote Asset: ' + this.remotePrefab.name);
        this.remotePrefab.downloadAsset(
            (asset: Asset) => this.onDownloaded(asset),
            () => this.onFailed()
        );
    }

  /* on asset successfully downloaded */
  private onDownloaded(asset: Asset): void {
    // print(asset.name + ' was successfully downloaded, type is ' + asset.getTypeName());
    this.downloadedPrefab = asset as ObjectPrefab;     
    this.spawnInitialItem();
  }
  /* on remote asset download failed */
  private onFailed(): void {
    print(this.remotePrefab.name + ' was not downloaded');
    // fallback logic here
  }
}


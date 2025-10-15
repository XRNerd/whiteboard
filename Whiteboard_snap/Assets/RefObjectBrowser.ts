import { RefObjectItem } from "RefObjectItem"
import { RefObjectSpawner } from "RefObjectSpawner"
import { InteractorEvent } from "SpectaclesInteractionKit.lspkg/Core/Interactor/InteractorEvent";
import { PinchButton } from "SpectaclesInteractionKit.lspkg/Components/UI/PinchButton/PinchButton";
import { RefObjectManager } from "RefObjectManager";


type SpawnerPrefabSource =
    | { type: 'local', prefab: ObjectPrefab }
    | { type: 'remote', remotePrefab: RemoteReferenceAsset };

@component
export class RefObjectBrowser extends BaseScriptComponent {
    @input spawnerPrefab: ObjectPrefab;
    @input() objectPrefabs: ObjectPrefab[];
    @input refObjectManager: RefObjectManager;
    //@input() remoteObjectPrefabs: RemoteReferenceAsset[];

    @input root: SceneObject;
    @input spawnedObjectsRoot: SceneObject;
    @input objectWidth: number = 5;
    @input horizontalSpacing: number = 7;
    @input verticalSpacing: number = 15;
    @input itemsPerRow: number = 3;
    @input itemsPerPage: number = 9;

    freeDrawButtonNext: PinchButton;
    freeDrawButtonPrev: PinchButton;

    private spawnerPrefabs: SceneObject[] = [];
    private spawnedItems: RefObjectItem[] = [];
    private onPageNextCallback: (event: InteractorEvent) => void;
    private onPagePrevCallback: (event: InteractorEvent) => void;
    private currentPage: number = 0;
    // itemsPerPage is now an input
    private totalPages: number = 0;

    onAwake() {
        if (this.objectPrefabs.length === 0) {
            throw new Error("FreeDrawObjectBrowser: objectPrefabs array is empty!")
        }

        if (!this.spawnerPrefab) {
            throw new Error("FreeDrawObjectBrowser: spawnerPrefab is not set!")
        }

        // Calculate items per page (use input value)
        const totalItems = this.objectPrefabs.length //+ this.remoteObjectPrefabs.length;
        this.totalPages = Math.ceil(totalItems / this.itemsPerPage);

        const sceneObj = this.getSceneObject()
        const freeDrawItemTypeName = RefObjectItem.getTypeName()
        const refObjectSpawnerTypeName = RefObjectSpawner.getTypeName()

        const combinedSources: SpawnerPrefabSource[] = [
            ...this.objectPrefabs.map(prefab => ({ type: 'local', prefab } as const)),
            //...this.remoteObjectPrefabs.map(remotePrefab => ({ type: 'remote', remotePrefab } as const))
        ];

        print("Combined sources: " + combinedSources.length);
        // Instantiate all spawners once and set up their prefab and browser reference
        for (let i = 0; i < combinedSources.length; i++) {
            const source = combinedSources[i];
            var spawner = this.spawnerPrefab.instantiate(this.root)
            print("Spawner instantiated: " + spawner.name + spawner.getTransform().getLocalPosition());
            //spawner.enabled = false; // Hide by default, will be enabled in showPage
            this.spawnerPrefabs.push(spawner);

            const refObjectSpawner: RefObjectSpawner | null = spawner.getComponent(refObjectSpawnerTypeName)
            if (refObjectSpawner !== null) {
                // Pass reference to this browser
                refObjectSpawner.browser = this;
                refObjectSpawner.manager = this.refObjectManager;
                // if (typeof freeDrawSpawner.browser === 'function') {
                //     freeDrawSpawner.browser = this;
                // } else {
                //     // fallback: direct property assignment if method doesn't exist
                //     freeDrawSpawner.browser = this;
                // }
                if (source.type === 'local') {
                    refObjectSpawner.prefab = source.prefab;
                    refObjectSpawner.useRemotePrefab = false;
                } else if (source.type === 'remote') {
                    refObjectSpawner.remotePrefab = source.remotePrefab;
                    refObjectSpawner.useRemotePrefab = true;
                }
            }
        }
        this.createEvent("OnStartEvent").bind(() => {
            // Free Draw Navigation Callbacks
            if (this.freeDrawButtonNext && this.freeDrawButtonNext.onButtonPinched) {
                this.onPageNextCallback = (e: InteractorEvent) => {
                    this.onPageNext();
                };
                this.freeDrawButtonNext.onButtonPinched.add(this.onPageNextCallback.bind(this));
            }
            if (this.freeDrawButtonPrev && this.freeDrawButtonPrev.onButtonPinched) {
                this.onPagePrevCallback = (e: InteractorEvent) => {
                    this.onPagePrevious();
                };
                this.freeDrawButtonPrev.onButtonPinched.add(this.onPagePrevCallback.bind(this));
            }
            this.showPage(0);
        })
    }
    private showPage(page: number) {
        // Clamp page
        this.currentPage = Math.max(0, Math.min(page, this.totalPages - 1));

        // Paginate spawners (show/hide and position)
        const totalSpawners = this.spawnerPrefabs.length;
        const startIdx = this.currentPage * this.itemsPerPage;
        const endIdx = Math.min(startIdx + this.itemsPerPage, totalSpawners);

        for (let i = 0; i < totalSpawners; i++) {
            const spawner = this.spawnerPrefabs[i];
            if (i >= startIdx && i < endIdx) {
                spawner.enabled = true;
                // Calculate row/col for visible spawners
                const localIndex = i - startIdx;
                const row = Math.floor(localIndex / this.itemsPerRow);
                const col = localIndex % this.itemsPerRow;
                const xPosition = col * (this.objectWidth + this.horizontalSpacing);
                const yPosition = -row * this.verticalSpacing;
                const rootTransform = this.root.getTransform();
                const rootPosition = rootTransform.getWorldPosition();
                const rootRotation = rootTransform.getWorldRotation();
                const localOffset = new vec3(xPosition, yPosition, 0);
                const rotatedOffset = rootRotation.multiplyVec3(localOffset);
                spawner.getTransform().setWorldPosition(rootPosition.add(rotatedOffset));
            } else {
                spawner.enabled = false;
            }
        }

        // Always show all spawned items
        for (let item of this.spawnedItems) {
            item.getSceneObject().enabled = true;
        }

        // --- Pagination Button Logic ---
        if (this.freeDrawButtonNext && this.freeDrawButtonNext.sceneObject) {
            this.freeDrawButtonNext.sceneObject.enabled = this.currentPage < this.totalPages - 1 && this.totalPages > 1;
        }
        if (this.freeDrawButtonPrev && this.freeDrawButtonPrev.sceneObject) {
            this.freeDrawButtonPrev.sceneObject.enabled = this.currentPage > 0 && this.totalPages > 1;
        }
    }

    private onPageNext() {
        print("FreeDrawObjectBrowser: onPageNext called");
        this.currentPage++;
        this.showPage(this.currentPage);
    }

    private onPagePrevious() {
        print("FreeDrawObjectBrowser: onPagePrevious called");
        this.currentPage--;
        this.showPage(this.currentPage);
    }
}

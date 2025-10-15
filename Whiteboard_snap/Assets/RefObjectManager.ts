@component
export class RefObjectManager extends BaseScriptComponent {
    @input root: SceneObject;

    private tracked: { path: string, modelId: string, offset: vec3 }[] = []

    onAwake() {
        if (!this.root) {
            this.root = this.getSceneObject();
        }
    }

    // Registers or updates a tracked object with its model identifier
    public registerObject(sceneObject: SceneObject, modelId: string): void {
        const path = this.getHierarchyPath(sceneObject);
        const offset = this.computeOffset(sceneObject);
        const existingIndex = this.tracked.findIndex(t => t.path === path);
        if (existingIndex !== -1) {
            this.tracked[existingIndex] = { path, modelId, offset };
        } else {
            this.tracked.push({ path, modelId, offset });
        }
    }

    public unregisterObject(sceneObject: SceneObject): void {
        const path = this.getHierarchyPath(sceneObject);
        this.tracked = this.tracked.filter(t => t.path !== path);
    }

    // Serializes the tracked list into a compact string
    public snapshotToString(): string {
        const payload = {
            v: 1,
            rootPath: this.getHierarchyPath(this.root),
            items: this.tracked.map(t => ({
                p: t.path,
                m: t.modelId,
                o: { x: t.offset.x, y: t.offset.y, z: t.offset.z },
            }))
        };
        return JSON.stringify(payload);
    }

    // Restores object positions from a snapshot string
    public applySnapshot(snapshot: string): void {
        if (!snapshot || snapshot.trim().length === 0) {
            return;
        }
        let data: any;
        try {
            data = JSON.parse(snapshot);
        } catch (e) {
            print("RefObjectManager: Failed to parse snapshot string");
            return;
        }

        if (!data || !data.items || !Array.isArray(data.items)) {
            return;
        }

        for (const item of data.items) {
            const path: string = item.p;
            const offsetObj = item.o;
            const offset = new vec3(offsetObj.x, offsetObj.y, offsetObj.z);
            const sceneObject = this.findByPath(path);
            if (!sceneObject) {
                continue;
            }
            this.applyOffset(sceneObject, offset);
            // Keep internal tracked state in sync
            const existingIndex = this.tracked.findIndex(t => t.path === path);
            const modelId = item.m || "";
            if (existingIndex !== -1) {
                this.tracked[existingIndex] = { path, modelId, offset };
            } else {
                this.tracked.push({ path, modelId, offset });
            }
        }
    }

    // Computes a unique-ish hierarchy path from the scene root to the object
    private getHierarchyPath(obj: SceneObject): string {
        const names: string[] = [];
        let current: SceneObject | null = obj;
        while (current) {
            names.push(current.name || "(unnamed)");
            if (current === this.root) {
                break;
            }
            current = current.getParent();
        }
        return names.reverse().join("/");
    }

    private findByPath(path: string): SceneObject | null {
        if (!path || path.length === 0) {
            return null;
        }
        const segments = path.split("/");
        // Ensure the path starts at the configured root
        let current: SceneObject | null = this.root;
        let startIndex = 0;
        if (segments.length > 0 && current && (current.name || "(unnamed)") === segments[0]) {
            startIndex = 1;
        }
        for (let i = startIndex; i < segments.length; i++) {
            const segment = segments[i];
            if (!current) {
                return null;
            }
            current = this.findDirectChildByName(current, segment);
        }
        return current;
    }

    private findDirectChildByName(parent: SceneObject, name: string): SceneObject | null {
        const count = parent.getChildrenCount();
        for (let i = 0; i < count; i++) {
            const child = parent.getChild(i);
            if ((child.name || "(unnamed)") === name) {
                return child;
            }
        }
        return null;
    }

    private computeOffset(obj: SceneObject): vec3 {
        const rootPos = this.root.getTransform().getWorldPosition();
        const worldPos = obj.getTransform().getWorldPosition();
        return new vec3(
            worldPos.x - rootPos.x,
            worldPos.y - rootPos.y,
            worldPos.z - rootPos.z
        );
    }

    private applyOffset(obj: SceneObject, offset: vec3): void {
        const rootTransform = this.root.getTransform();
        const rootPos = rootTransform.getWorldPosition();
        const newWorldPos = new vec3(
            rootPos.x + offset.x,
            rootPos.y + offset.y,
            rootPos.z + offset.z
        );
        obj.getTransform().setWorldPosition(newWorldPos);
    }
}

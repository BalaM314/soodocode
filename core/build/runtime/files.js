import { crash } from "../utils/funcs.js";
export class LocalFileSystem {
    constructor(useLocalStorage) {
        this.useLocalStorage = useLocalStorage;
        this.files = Object.create(null);
        this.backupFiles = null;
        if (useLocalStorage)
            this.load();
    }
    openFile(filename, create = false) {
        return this.files[filename] ?? (create ? this.files[filename] = {
            name: filename, text: ""
        } : undefined);
    }
    hasFile(filename) {
        return filename in this.files;
    }
    createFile(filename) {
        this.files[filename] = {
            name: filename, text: ""
        };
    }
    updateFile(filename, newContent) {
        this.files[filename] = {
            name: filename,
            text: newContent
        };
        if (this.useLocalStorage)
            this.save();
    }
    clearFile(filename) {
        if (!this.files[filename])
            crash(`Cannot clear nonexistent file ${filename}`);
        this.files[filename] = {
            name: filename,
            text: ""
        };
    }
    closeFile(filename) {
        if (!this.files[filename])
            crash(`Cannot delete nonexistent file ${filename}`);
    }
    deleteFile(filename) {
        if (!this.files[filename])
            crash(`Cannot delete nonexistent file ${filename}`);
        delete this.files[filename];
    }
    listFiles() {
        return Object.keys(this.files);
    }
    makeBackup() {
        if (this.useLocalStorage) {
            this.save(LocalFileSystem.storageKey + "/backup");
        }
        else {
            this.backupFiles = JSON.stringify(this.files);
        }
    }
    loadBackup() {
        if (this.useLocalStorage) {
            this.load(LocalFileSystem.storageKey + "/backup");
        }
        else {
            if (this.backupFiles)
                this.files = JSON.parse(this.backupFiles);
        }
    }
    save(key = LocalFileSystem.storageKey) {
        localStorage.setItem(key, JSON.stringify(Object.fromEntries(Object.entries(this.files).map(([name, file]) => [name, file.text]))));
    }
    load(key = LocalFileSystem.storageKey) {
        const rawData = localStorage.getItem(key);
        if (!rawData)
            return;
        let parsedData;
        try {
            parsedData = JSON.parse(rawData);
        }
        catch {
            return;
        }
        if (typeof parsedData != "object" || !parsedData)
            return;
        this.files = Object.fromEntries(Object.entries(parsedData).filter((entry) => typeof entry[0] == "string" && typeof entry[1] == "string").map(([k, v]) => [k, {
                name: k,
                text: v
            }]));
    }
}
LocalFileSystem.storageKey = "soodocode:files";

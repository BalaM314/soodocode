import { crash } from "./utils.js";
export class BrowserFileSystem {
    constructor(useLocalStorage = true) {
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
            this.save(BrowserFileSystem.storageKey + "/backup");
        }
        else {
            this.backupFiles = JSON.stringify(this.files);
        }
    }
    loadBackup() {
        if (this.useLocalStorage) {
            this.load(BrowserFileSystem.storageKey + "/backup");
        }
        else {
            if (this.backupFiles)
                this.files = JSON.parse(this.backupFiles);
        }
    }
    save(key = BrowserFileSystem.storageKey) {
        localStorage.setItem(key, JSON.stringify(this.files));
    }
    load(key = BrowserFileSystem.storageKey) {
        const rawData = localStorage.getItem(key);
        if (!rawData)
            return;
        const parsedData = JSON.parse(rawData);
        if (typeof parsedData != "object" || !parsedData)
            return;
        this.files = Object.fromEntries(Object.entries(parsedData).filter((entry) => typeof entry[0] == "string" && typeof entry[1] == "string").map(([k, v]) => [k, {
                name: k,
                text: v
            }]));
    }
}
BrowserFileSystem.storageKey = "soodocode:files";

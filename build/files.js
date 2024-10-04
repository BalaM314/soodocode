import { crash } from "./utils.js";
export class FileSystem {
}
export class TemporaryFileSystem extends FileSystem {
    constructor() {
        super(...arguments);
        this.files = Object.create(null);
        this.backupFiles = null;
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
    }
    clearFile(filename) {
        if (!this.files[filename])
            crash(`Cannot clear nonexistent file ${filename}`);
        this.files[filename] = {
            name: filename,
            text: ""
        };
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
        this.backupFiles = JSON.stringify(this.files);
    }
    canLoadBackup() {
        return this.backupFiles != null;
    }
    loadBackup() {
        if (this.backupFiles)
            this.files = JSON.parse(this.backupFiles);
    }
}

import { File } from "./runtime-types.js";
export interface FileSystem {
    hasFile(filename: string): boolean;
    openFile(filename: string): File | undefined;
    openFile(filename: string, create: true): File;
    openFile(filename: string, create: boolean): File | undefined;
    closeFile(filename: string): void;
    createFile(filename: string): void;
    updateFile(filename: string, newContent: string): void;
    clearFile(filename: string, newContent: string): void;
    deleteFile(filename: string): void;
    listFiles(): string[];
}
export declare class BrowserFileSystem implements FileSystem {
    useLocalStorage: boolean;
    static readonly storageKey = "soodocode:files";
    private files;
    private backupFiles;
    constructor(useLocalStorage: boolean);
    openFile(filename: string): File | undefined;
    openFile(filename: string, create: true): File;
    openFile(filename: string, create: boolean): File | undefined;
    hasFile(filename: string): boolean;
    createFile(filename: string): void;
    updateFile(filename: string, newContent: string): void;
    clearFile(filename: string): void;
    closeFile(filename: string): void;
    deleteFile(filename: string): void;
    listFiles(): string[];
    makeBackup(): void;
    loadBackup(): void;
    private save;
    private load;
}

import { File } from "./runtime-types.js";
import type { MaybePromise } from "./types.js";
export interface FileSystem {
    hasFile(filename: string): MaybePromise<boolean>;
    openFile(filename: string): MaybePromise<File | undefined>;
    openFile(filename: string, create: true): MaybePromise<File>;
    openFile(filename: string, create: boolean): MaybePromise<File | undefined>;
    closeFile(filename: string): MaybePromise<void>;
    createFile(filename: string): MaybePromise<void>;
    updateFile(filename: string, newContent: string): MaybePromise<void>;
    clearFile(filename: string, newContent: string): MaybePromise<void>;
    deleteFile(filename: string): MaybePromise<void>;
    listFiles(): MaybePromise<string[]>;
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

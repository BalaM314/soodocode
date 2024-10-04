import { File } from "./runtime-types.js";
export declare abstract class FileSystem {
    abstract hasFile(filename: string): boolean;
    abstract openFile(filename: string): File | undefined;
    abstract openFile(filename: string, create: true): File;
    abstract openFile(filename: string, create: boolean): File | undefined;
    abstract createFile(filename: string): void;
    abstract updateFile(filename: string, newContent: string): void;
    abstract clearFile(filename: string, newContent: string): void;
    abstract deleteFile(filename: string): void;
    abstract listFiles(): string[];
}
export declare class TemporaryFileSystem extends FileSystem {
    private files;
    private backupFiles;
    openFile(filename: string): File | undefined;
    openFile(filename: string, create: true): File;
    openFile(filename: string, create: boolean): File | undefined;
    hasFile(filename: string): boolean;
    createFile(filename: string): void;
    updateFile(filename: string, newContent: string): void;
    clearFile(filename: string): void;
    deleteFile(filename: string): void;
    listFiles(): string[];
    makeBackup(): void;
    canLoadBackup(): boolean;
    loadBackup(): void;
}

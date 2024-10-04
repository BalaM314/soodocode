import { File } from "./runtime-types.js";
import { crash } from "./utils.js";

/** Represents a file system that Soodocode can interact with. */
export abstract class FileSystem {
	/** Returns whether or not a File with the specified name exists. */
	abstract hasFile(filename:string):boolean;
	/** Gets a File. Returns undefined if it does not exist. */
	abstract openFile(filename:string):File | undefined;
	/** Gets a File. If it does not exist, creates a new empty file. */
	abstract openFile(filename:string, create:true):File;
	/** Gets a File. */
	abstract openFile(filename:string, create:boolean):File | undefined;
	/** Creates a new File. Throws an error if it already exists. */
	abstract createFile(filename:string):void;
	/** Changes the content of an existing file. Creates the file if it does not exist. */
	abstract updateFile(filename:string, newContent:string):void;
	/** Clears the content of (pr truncates) an existing file. Throws an error if it does not exist. */
	abstract clearFile(filename:string, newContent:string):void;
	/** Deletes an existing file. Throws an error if it does not exist. */
	abstract deleteFile(filename:string):void;
	/** Returns the list of all filenames. */
	abstract listFiles():string[];
}

/** A file system that stores all the data about its files in a Javascript object. Supports creating backups. */
export class TemporaryFileSystem extends FileSystem {
	private files: Record<string, File> = Object.create(null);
	private backupFiles: string | null = null;
	openFile(filename:string):File | undefined;
	openFile(filename:string, create:true):File;
	openFile(filename:string, create:boolean):File | undefined;
	openFile(filename:string, create = false):File | undefined {
		return this.files[filename] ?? (create ? this.files[filename] = {
			name: filename, text: ""
		} : undefined);
	}
	hasFile(filename:string){
		return filename in this.files;
	}
	createFile(filename:string){
		this.files[filename] = {
			name: filename, text: ""
		};
	}
	updateFile(filename:string, newContent:string){
		this.files[filename] = {
			name: filename,
			text: newContent
		};
	}
	clearFile(filename:string){
		if(!this.files[filename]) crash(`Cannot clear nonexistent file ${filename}`);
		this.files[filename] = {
			name: filename,
			text: ""
		};
	}
	deleteFile(filename:string){
		if(!this.files[filename]) crash(`Cannot delete nonexistent file ${filename}`);
		delete this.files[filename];
	}
	listFiles(){
		return Object.keys(this.files);
	}
	makeBackup(){
		this.backupFiles = JSON.stringify(this.files);
	}
	canLoadBackup(){
		return this.backupFiles != null;
	}
	loadBackup(){
		if(this.backupFiles) this.files = JSON.parse(this.backupFiles) as Record<string, File>;
	}
}

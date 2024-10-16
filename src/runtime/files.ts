/* @license
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains types used for file system handling.
*/

import { crash } from "../utils/funcs.js";
import { File } from "./runtime-types.js";

/** Represents a file system that Soodocode can interact with. */
export interface FileSystem {
	/** Returns whether or not a File with the specified name exists. */
	hasFile(filename:string):boolean;
	/** Gets a File. Returns undefined if it does not exist. */
	openFile(filename:string):File | undefined;
	/** Gets a File. If it does not exist, creates a new empty file. */
	openFile(filename:string, create:true):File;
	/** Gets a File. */
	openFile(filename:string, create:boolean):File | undefined;
	/** Call this to tell the filesystem to close the underlying file handle (if necessary). */
	closeFile(filename:string):void;
	/** Creates a new File. Throws an error if it already exists. */
	createFile(filename:string):void;
	/** Changes the content of an existing file. Creates the file if it does not exist. */
	updateFile(filename:string, newContent:string):void;
	/** Clears the content of an existing file. Throws an error if it does not exist. */
	clearFile(filename:string, newContent:string):void;
	/** Deletes an existing file. Throws an error if it does not exist. */
	deleteFile(filename:string):void;
	/** Returns the list of all filenames. */
	listFiles():string[];
}

/** A file system that stores all the data about its files in a Javascript object, optionally saving it to local storage. Supports creating backups. */
export class LocalFileSystem implements FileSystem {
	static readonly storageKey = "soodocode:files";

	private files: Record<string, File> = Object.create(null);
	private backupFiles: string | null = null;
	constructor(
		public useLocalStorage:boolean
	){
		if(useLocalStorage) this.load();
	}
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
		if(this.useLocalStorage) this.save();
	}
	clearFile(filename:string){
		if(!this.files[filename]) crash(`Cannot clear nonexistent file ${filename}`);
		this.files[filename] = {
			name: filename,
			text: ""
		};
	}
	closeFile(filename:string){
		if(!this.files[filename]) crash(`Cannot delete nonexistent file ${filename}`);
		//Nothing else needed here
		//Don't even need to save to localstorage, because the update already does that
	}
	deleteFile(filename:string){
		if(!this.files[filename]) crash(`Cannot delete nonexistent file ${filename}`);
		delete this.files[filename];
	}
	listFiles(){
		return Object.keys(this.files);
	}
	makeBackup(){
		if(this.useLocalStorage){
			this.save(LocalFileSystem.storageKey + "/backup");
		} else {
			this.backupFiles = JSON.stringify(this.files);
		}
	}
	loadBackup(){
		if(this.useLocalStorage){
			this.load(LocalFileSystem.storageKey + "/backup");
		} else {
			if(this.backupFiles) this.files = JSON.parse(this.backupFiles) as Record<string, File>;
		}
	}
	private save(key = LocalFileSystem.storageKey){
		localStorage.setItem(key, JSON.stringify(Object.fromEntries(Object.entries(this.files).map(([name, file]) => [name, file.text]))));
	}
	private load(key = LocalFileSystem.storageKey){
		const rawData = localStorage.getItem(key);
		if(!rawData) return;
		let parsedData;
		try {
			parsedData = JSON.parse(rawData) as unknown;
		} catch {
			return;
		}
		if(typeof parsedData != "object" || !parsedData) return;
		this.files = Object.fromEntries(Object.entries(parsedData as Record<string, unknown>).filter((entry):entry is [string, string] =>
			typeof entry[0] == "string" && typeof entry[1] == "string"
		).map(([k, v]) => [k, {
			name: k,
			text: v
		}]));
	}
}

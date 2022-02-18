import * as fs from "fs-extra";
import path from "path";
import JSZip from "jszip";
import parse5 from "parse5";
import {InsightDatasetKind} from "./IInsightFacade";


export  class DatasetProcessing {
	private dataDir;

	constructor() {
		this.dataDir = "./data/";
	}
	public async getExistingDataSetIds(addedIds: string[]) {
		if (fs.existsSync(this.dataDir)) {
			const dir = await fs.promises.opendir(this.dataDir);
			for await (const file of dir) {
				let filename = file.name;
				let id = path.parse(filename).name;
				addedIds.push(id);
			}
		}
	}

	public async processDataset(content: string, id: string, kind: InsightDatasetKind){
		let processedDataset: any[] = [];
		let newZip = new JSZip();
		let promises: Array<Promise<any>> = [];
		const zip = await newZip.loadAsync(content, {base64: true});
		if (Object.keys(zip.files).length === 0) {
			throw new Error("Empty zip");
		}
		if (kind === "courses") {

			if (zip.folder(/courses/).length === 0) { // no course directory inside the zip file
				throw new Error("No courses directory");
			}

			zip.folder("courses")?.forEach(((relativePath, file) => {
				promises.push(this.parseCourses(processedDataset, file, id));
			}
			));
			await Promise.all(promises);
			if (processedDataset.length === 0) {
				throw new Error("A dataset needs at least one valid section overall.");
			}
			await this.writeDataSet(processedDataset, id);
		} else { // kind == rooms
			console.log((zip.folder(/rooms/).length));
			const arrMatchingFolders = zip.folder(/rooms/);
			if (arrMatchingFolders.length === 0 || arrMatchingFolders.length === 1) { // no course directory inside the zip file, for some reason it counts as 1 even when it doesn't exist?
				throw new Error("No rooms directory");
			}
			zip.folder("rooms")?.forEach(((relativePath, file) => {
				promises.push(this.parseRooms(processedDataset, file, id));
			}
			));


		}
	}
	private async parseRooms(processedDataset: any[], file: JSZip.JSZipObject, datasetId: any) {
		if(file.name === "rooms/index.htm") {
			let test = parse5.parse(await file.async("string"));
			console.log(test.childNodes);
		}


		// console.log(file);


		// TODO
	}


	private async parseCourses(processedDataset: any[], file: JSZip.JSZipObject, datasetId: any) {
		let resultsArr = await file.async("string"); // results = the results array in given file where each entry is a section
		if(!this.isValidJSON(resultsArr)){
			return; // the entire file is invalid, move onto next course in the for each loop.
		}
		let courseObject = JSON.parse(resultsArr);
		let arrSections = courseObject.result;
		for (let object of arrSections) {

			const jsonSection = {
				[datasetId + "_avg"]: object.Avg,
				[datasetId + "_pass"]: object.Pass,
				[datasetId + "_fail"]: object.Fail,
				[datasetId + "_audit"]: object.Audit,
				[datasetId + "_year"]: Number(object.Year),
				[datasetId + "_dept"]: object.Subject,
				[datasetId + "_id"]: object.Course,
				[datasetId + "_instructor"]: object.Professor,
				[datasetId + "_title"]: object.Title,
				[datasetId + "_uuid"]: object["id"].toString(10),
			};

			if (object.Section === "overall"){
				jsonSection[datasetId + "_year"] = 1900;
			}

			let sectionValues = Object.values(jsonSection);
			if (!this.isMissingAttribute(sectionValues)){
				processedDataset.push(jsonSection);
			}
		}
	}

	private async writeDataSet(processedDataset: any, id: string){
		try {
			if (!fs.existsSync(this.dataDir)) {
				await fs.mkdir(this.dataDir);
			}
		} catch (err){
			console.log("Failed to create directory");
		}
		let object = JSON.stringify(processedDataset, null, 4);
		try {
			await fs.writeFile(this.dataDir + id + ".json", object);
		} catch (err){
			console.log("Failed to write to directory");
		}
	}

	private isMissingAttribute(sectionValues: any[]){
		for (let value of sectionValues) {
			if (value === undefined) {
				return true;
			}
		}
		return false;
	}

	private isValidJSON(resultArr: string){
		try {
			JSON.parse(resultArr);
		} catch (e) {
			return false;
		}
		return true;
	}

	public async isZip(content: string) {
		let newZip = new JSZip();
		try {
			await newZip.loadAsync(content, {base64: true});
			return true;
		} catch (err) {
			return false;
		}
	}

	public isValidID(id: string, addedIds: string[]){
		if (id.includes("_") || addedIds.includes(id)) {
			return false;
		}
		return id.replace(/\s/g, "").length; // removes all whitespace in string
		// then checks length. if 0, the string was all whitespace and we return false
	}

	public loadDataset(id: string) {
		let dataset;
		try {
			const jsonString = fs.readFileSync(`data/${id}.json`);
			dataset = JSON.parse(jsonString.toString());
			return dataset;
		} catch(err) {
			throw new Error("Dataset does not exist");
		}
	}

}


import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError
} from "./IInsightFacade";
import JSZip from "jszip";
import * as fs from "fs-extra";
import path from "path";


/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	private dataDir = "./data/";

	constructor() {
		let a = 5;
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		let addedIds: string[] = [];
		await this.getExistingDataSetIds(addedIds);
		if(!this.isValidID(id,addedIds)) { // reject if invalid ID or same as previously added or not zip
			return Promise.reject(new InsightError());
		}
		const isZip = await this.isZip(content);
		if(!isZip){
			return Promise.reject(new InsightError());
		}
		try {
			await this.processDataset(content, id);
			addedIds.push(id);
		} catch (err) {
			return Promise.reject(new InsightError());
		}
		return Promise.resolve(addedIds);

	}

	private async getExistingDataSetIds(addedIds: string[]) {
		if (fs.existsSync(this.dataDir)) {
			const dir = await fs.promises.opendir(this.dataDir);
			for await (const file of dir) {
				let filename = file.name;
				let id = path.parse(filename).name;
				addedIds.push(id);
			}
		}
	}

	public async processDataset(content: string, id: string){
		let processedDataset: any[] = [];
		let newZip = new JSZip();
		const zip = await newZip.loadAsync(content, {base64: true});
		if (Object.keys(zip.files).length === 0) {
			throw new Error("Empty zip");
		}
		if (zip.folder(/courses/).length === 0){ // no course directory inside the zip file
			throw new Error("No courses directory");
		}
		let promises: Array<Promise<any>> = [];
		zip.folder("courses")?.forEach(((relativePath, file) => {
			promises.push(this.parseCourses(processedDataset, file));
		}
		));
		await Promise.all(promises);
		await this.writeDataSet(processedDataset, id);
	}


	private async parseCourses(processedDataset: any[], file: JSZip.JSZipObject) {
		let resultsArr = await file.async("string"); // results = the results array in given file where each entry is a section
		if(!this.isValidJSON(resultsArr)){
			return; // the entire file is invalid, move onto next course in the for each loop.
		}
		let courseObject = JSON.parse(resultsArr);
		let arrSections = courseObject.result;
		for (let object of arrSections) {
			const jsonSection = {
				avg: object.Avg,
				pass: object.Pass,
				fail: object.Fail,
				audit: object.Audit,
				year: object.Year,
				dept: object.Subject,
				id: object.Course,
				instructor: object.Professor,
				title: object.Title,
				uuid: object.id
			};
			let sectionValues = Object.values(jsonSection);
			if (!this.isMissingAttribute(sectionValues)){
				processedDataset.push(jsonSection);
			}
			// console.log(jsonSection);
		}
	}

	public async writeDataSet(processedDataset: any, id: string){
		const dataDir = "./data/";
		try {
			if (!fs.existsSync(dataDir)) {
				await fs.mkdir(dataDir);
			}
		} catch (err){
			console.log("Failed to create directory");
		}
		let object = JSON.stringify(processedDataset, null, 4);
		try {
			await fs.writeFile(dataDir + id + ".json", object);
		} catch (err){
			console.log("Failed to write to directory");
		}
	}

	public isMissingAttribute(sectionValues: any[]){
		for (let value of sectionValues) {
			if (value === undefined) {
				return true;
			}
		}
		return false;
	}

	public isValidJSON(resultArr: string){
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

	public removeDataset(id: string): Promise<string> {
		return Promise.resolve("");
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		console.log(query);
		let string = JSON.stringify(query);
		console.log(string);
		let object = JSON.parse(string);
		console.log(Object.keys(object));
		console.log("OBJECT WHERE ");

		console.log(object.WHERE);
		let id = "courses";
		let queriedDataset;
		try {
			queriedDataset = InsightFacade.loadDataset(id);
			// console.log(queriedDataset[0].avg);

		} catch (err){
			return Promise.reject(InsightError);
		}
		return Promise.resolve([]);
	}

	private static loadDataset(id: string) {
		let dataset;
		try {
			const jsonString = fs.readFileSync(`data/${id}.json`);
			dataset = JSON.parse(jsonString.toString());
			return dataset;
		} catch(err) {
			throw new Error("Dataset does not exist");
		}
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.resolve([]);
	}
}

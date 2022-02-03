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

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	private addedIds: string[] = [];

	constructor() {
		let a = 5;

	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		return new Promise((resolve, reject) => {
			if(!this.isValidID(id)) { // reject if invalid ID or same as previously added or not zip
				reject(new InsightError());
			}

			(async () => {
				const isZip = await this.isZip(content);
				if(!isZip){
					reject (new InsightError());
				}
				this.addedIds.push(id);
				try {
					await this.processDataset(content, id);
				} catch (err) {
					reject (new InsightError());
				}
				resolve(this.addedIds);
			})();


		});
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

	public isValidID(id: string){
		if (id.includes("_") || this.addedIds.includes(id)) {
			return false;
		}
		return id.replace(/\s/g, "").length; // removes all whitespace in string
		// then checks length. if 0, the string was all whitespace and we return false
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
		let object = JSON.stringify(processedDataset);
		await fs.mkdir("./data/");
		await fs.writeFile("./data/" + id + ".json", object);
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

	public removeDataset(id: string): Promise<string> {
		return Promise.resolve("");
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		return Promise.resolve([]);
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.resolve([]);
	}
}

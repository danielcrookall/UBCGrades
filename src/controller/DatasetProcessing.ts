import * as fs from "fs-extra";
import path from "path";
import JSZip from "jszip";


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
			promises.push(this.parseCourses(processedDataset, file, id));
		}
		));
		await Promise.all(promises);
		await this.writeDataSet(processedDataset, id);
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
				[datasetId + "_section"]: object.Section
			};
			if(jsonSection[datasetId + "_section"] === "overall"){
				jsonSection[datasetId + "_year"] = "1900";
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

}


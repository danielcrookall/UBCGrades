import * as fs from "fs-extra";
import path from "path";
import JSZip from "jszip";
import parse5 from "parse5";
import {InsightDatasetKind} from "./IInsightFacade";

export class DatasetProcessing {
	private dataDir;
	private datasetID;

	constructor(datasetID: string) {
		this.dataDir = "./data/";
		this.datasetID = datasetID;
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

	public async processDataset(content: string, id: string, kind: InsightDatasetKind) {
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
				promises.push(this.parseCourses(processedDataset, file));
			}
			));
			await Promise.all(promises);
			if (processedDataset.length === 0) {
				throw new Error("A dataset needs at least one valid section overall.");
			}
			await this.writeDataSet(processedDataset);
		} else { // kind == rooms
			let indexHTMLFile: any;
			let htmlTree: any;
			try {
				indexHTMLFile = await zip.file("rooms/index.htm")?.async("string");
				if (indexHTMLFile === undefined) { // move this check outside of try catch
					throw new Error("no rooms directory");
				}

				htmlTree = parse5.parse(indexHTMLFile);

			} catch (err) {
				throw new Error("The index indexHTML in a rooms dataset is either invalid HTML or does not exist.");
			}

			promises.push(this.parseRooms(processedDataset, htmlTree));


		}
	}

	private async parseRooms(processedDataset: any[], htmlTree: any) {

		this.getBuildings(htmlTree);

	}

	private getBuildings(node: any) {

		const obj: any = {};

		if (node.childNodes === undefined) {
			return;
		}

		if (node.nodeName === "tr") {
			this.parseTr(node);
			return;
		}

		let childNodeCount = node.childNodes.length;
		for (let i = 0; i < childNodeCount; i++) {
			this.getBuildings(node.childNodes[i]);
		}
	}

	private parseTr(trNode: any) {
		const obj: any = {};
		let childNodeCount = trNode.childNodes.length;
		for (let i = 0; i < childNodeCount; i++) {
			if (trNode.childNodes[i].nodeName === "td") {
				this.parseTd(trNode.childNodes[i], obj);
			}
		}

		console.log(obj); // the first one is undefined because it's the building image which we're doing nothing for.
	}

	private parseTd(tdNode: any, obj: any) {

		for (let attrbObj of tdNode.attrs) {
			switch (attrbObj.value) {
				case "views-field views-field-field-building-code":
					for (let childNode of tdNode.childNodes) { // there's just 1 childnode and I think that will always be the case, don't think you can even put another html element inside the TDnode
						obj[this.datasetID + "_shortname"] = childNode.value.trim(); // remove the /n and whitespaces
					}
					break;
				case "views-field views-field-title":
					for (let childNode of tdNode.childNodes) {
						if (childNode.nodeName === "a") {
							for (let attr of childNode.attrs) {
								if (attr.name === "href") {
									obj[this.datasetID + "_href"] = attr.value;
								}
							}
							for (let cn of childNode.childNodes) {
								obj[this.datasetID + "_fullname"] = cn.value;
							}
						}
					}
					break;
				case "views-field views-field-field-building-address":
					for (let childNode of tdNode.childNodes) {
						obj[this.datasetID + "_address"] = childNode.value.trim();
					}
					break;

			}
		}

	}


	private async parseCourses(processedDataset: any[], file: JSZip.JSZipObject) {
		let resultsArr = await file.async("string"); // results = the results array in given file where each entry is a section
		if (!this.isValidJSON(resultsArr)) {
			return; // the entire file is invalid, move onto next course in the for each loop.
		}
		let courseObject = JSON.parse(resultsArr);
		let arrSections = courseObject.result;
		for (let object of arrSections) {

			const jsonSection = {
				[this.datasetID + "_avg"]: object.Avg,
				[this.datasetID + "_pass"]: object.Pass,
				[this.datasetID + "_fail"]: object.Fail,
				[this.datasetID + "_audit"]: object.Audit,
				[this.datasetID + "_year"]: Number(object.Year),
				[this.datasetID + "_dept"]: object.Subject,
				[this.datasetID + "_id"]: object.Course,
				[this.datasetID + "_instructor"]: object.Professor,
				[this.datasetID + "_title"]: object.Title,
				[this.datasetID + "_uuid"]: object["id"].toString(10),
			};

			if (object.Section === "overall") {
				jsonSection[this.datasetID + "_year"] = 1900;
			}

			let sectionValues = Object.values(jsonSection);
			if (!this.isMissingAttribute(sectionValues)) {
				processedDataset.push(jsonSection);
			}
		}
	}

	private async writeDataSet(processedDataset: any) {
		try {
			if (!fs.existsSync(this.dataDir)) {
				await fs.mkdir(this.dataDir);
			}
		} catch (err) {
			console.log("Failed to create directory");
		}
		let object = JSON.stringify(processedDataset, null, 4);
		try {
			await fs.writeFile(this.dataDir + this.datasetID + ".json", object);
		} catch (err) {
			console.log("Failed to write to directory");
		}
	}

	private isMissingAttribute(sectionValues: any[]) {
		for (let value of sectionValues) {
			if (value === undefined) {
				return true;
			}
		}
		return false;
	}

	private isValidJSON(resultArr: string) {
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

	public isValidID(addedIds: string[]) {
		if (this.datasetID.includes("_") || addedIds.includes(this.datasetID)) {
			return false;
		}
		return this.datasetID.replace(/\s/g, "").length; // removes all whitespace in string
		// then checks length. if 0, the string was all whitespace and we return false
	}

	public loadDataset() {
		let dataset;
		try {
			const jsonString = fs.readFileSync(`data/${this.datasetID}.json`);
			dataset = JSON.parse(jsonString.toString());
			return dataset;
		} catch (err) {
			throw new Error("Dataset does not exist");
		}
	}

}

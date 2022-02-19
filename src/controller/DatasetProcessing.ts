import * as fs from "fs-extra";
import path from "path";
import JSZip from "jszip";
import parse5 from "parse5";
import {InsightDatasetKind} from "./IInsightFacade";

export class DatasetProcessing {
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
				promises.push(this.parseCourses(processedDataset, file, id));
			}
			));
			await Promise.all(promises);
			if (processedDataset.length === 0) {
				throw new Error("A dataset needs at least one valid section overall.");
			}
			await this.writeDataSet(processedDataset, id);
		} else { // kind == rooms
			let indexHTMLFile: any;
			let htmlTree: any;
			try {
				indexHTMLFile = await zip.file("rooms/index.htm")?.async("string");
				if (indexHTMLFile === null) { // move this check outside of try catch
					throw new Error("no rooms directory");
				}
				if (indexHTMLFile !== undefined) {
					htmlTree = parse5.parse(indexHTMLFile);
				}
			} catch (err) {
				throw new Error("The index indexHTML in a rooms dataset is either invalid HTML or does not exist.");
			}

			promises.push(this.parseRooms(processedDataset, htmlTree, id));


		}
	}

	private async parseRooms(processedDataset: any[], htmlTree: any, datasetId: any) {

		this.getBuildings(htmlTree);

		// console.log(roomsTree.childNodes[1].nodeName);


		// console.log(file);


		// TODO
	}

	private getBuildings(node: any) {

		const obj: any = {};

		if (node.childNodes === undefined) {
			return;
		}

		// if (node.nodeName === "tr") {
		// 	this.parseTD(node);
		// }

		if (node.nodeName === "td") { // maybe instead check once you reach a child ndoe if parent is of type TD then you can check parent value attribute and see if it matches, would prevent having to iterate over child nodes here
			for (let attrbObj of node.attrs) {
				if (attrbObj.value === "views-field views-field-field-building-code") {
					for (let childNode of node.childNodes) { // is this guaranteed to be the values we need?
						// feels like unecessary iteration through the nodes since we're bound to traverse them all but you can't tell soley off node alone if you need the values? Need the td
						console.log(childNode.value);

						obj["rooms_shortname"] = childNode.value;
					}
				}

				if (attrbObj.value === "views-field views-field-title") {
					for (let childNode of node.childNodes) { // is this guaranteed to be the values we need?
						if (childNode.nodeName === "a") {
							for (let attr of childNode.attrs) {
								if (attr.name === "href") {
									console.log(attr.value);
								}
							}
							for (let cn of childNode.childNodes) {
								console.log(cn.value);
							}
						}

					}
				}

				if (attrbObj.value === "views-field views-field-field-building-address") {
					for (let childNode of node.childNodes) { // is this guaranteed to be the values we need?
						console.log(childNode.value);
						obj["rooms_address"] = childNode.value;
					}
				}

			}
		}

		let childNodeCount = node.childNodes.length;
		for (let i = 0; i < childNodeCount; i++) {
			this.getBuildings(node.childNodes[i]);
		}
	}


	private async parseCourses(processedDataset: any[], file: JSZip.JSZipObject, datasetId: any) {
		let resultsArr = await file.async("string"); // results = the results array in given file where each entry is a section
		if (!this.isValidJSON(resultsArr)) {
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

			if (object.Section === "overall") {
				jsonSection[datasetId + "_year"] = 1900;
			}

			let sectionValues = Object.values(jsonSection);
			if (!this.isMissingAttribute(sectionValues)) {
				processedDataset.push(jsonSection);
			}
		}
	}

	private async writeDataSet(processedDataset: any, id: string) {
		try {
			if (!fs.existsSync(this.dataDir)) {
				await fs.mkdir(this.dataDir);
			}
		} catch (err) {
			console.log("Failed to create directory");
		}
		let object = JSON.stringify(processedDataset, null, 4);
		try {
			await fs.writeFile(this.dataDir + id + ".json", object);
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

	public isValidID(id: string, addedIds: string[]) {
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
		} catch (err) {
			throw new Error("Dataset does not exist");
		}
	}

}

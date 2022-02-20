import * as fs from "fs-extra";
import path from "path";
import JSZip from "jszip";
import parse5 from "parse5";
import {InsightDatasetKind} from "./IInsightFacade";
import {DatasetValidation} from "./DatasetValidation";
import * as http from "http";

export class DatasetProcessing {
	private dataDir;
	private datasetID;
	private validator;

	constructor(datasetID: string) {
		this.dataDir = "./data/";
		this.datasetID = datasetID;
		this.validator = new DatasetValidation(this.datasetID);
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

			await this.parseRooms(htmlTree, zip);
		}
	}

	private async parseRooms(htmlTree: any, zip: JSZip) {
		let result = [];
		let buildingInfo: any[] = [];
		let roomInfo: any[] = [];

		this.searchTree(htmlTree, buildingInfo,null);  // have no buildData info , maybe shouldn't be null though
		for(let building of buildingInfo){
			result.push(this.getRooms(building, zip, roomInfo));
		}
		await Promise.all(result);
		// console.log(buildingInfo);
		console.log(roomInfo);

	}

	private async getRooms(buildData: any, zip: JSZip, buildOrRoomData: any){
		// console.log(building.rooms_href);
		let roomTree: any;

		const filePath = "rooms" + buildData[`${this.datasetID}_fileHref`].substring(1);
		let roomFile = await zip.file(filePath)?.async("string");
		if (roomFile !== undefined) {
			roomTree = parse5.parse(roomFile);
		}

		this.searchTree(roomTree, buildOrRoomData, buildData);  // should rename getBulidings if using for both bulding info and room, and name of array storing results

	}

	private searchTree(node: any, buildOrRoomData: any[], buildData: any ) {

		if (node.childNodes === undefined) {
			return;
		}

		if (node.nodeName === "tr") {
			this.parseTr(node, buildOrRoomData, buildData);
			return;
		}

		let childNodeCount = node.childNodes.length;
		for (let i = 0; i < childNodeCount; i++) {
			this.searchTree(node.childNodes[i], buildOrRoomData, buildData);
		}
	}

	private parseTr(trNode: any, buildOrRoomData: any[], buildData: any) {
		const roomObj: any = {};
		let childNodeCount = trNode.childNodes.length;
		for (let i = 0; i < childNodeCount; i++) {
			if (trNode.childNodes[i].nodeName === "td") {
				this.parseTd(trNode.childNodes[i], roomObj);
			}
		}
		if(this.validator.validateBuildInfo(roomObj)){
			const geolocation: any = this.getGeolocation(roomObj[this.datasetID + "_address"]);
			roomObj[this.datasetID + "_lat"] = geolocation["lat"];
			roomObj[this.datasetID + "_lon"] = geolocation["lon"];
			buildOrRoomData.push(roomObj);
		} else {
			if (this.validator.validateRoomInfo(roomObj)) {
				let merged = {...roomObj, ...buildData};// merge room info with building info
				merged[this.datasetID + "_name"] = merged[`${this.datasetID}_shortname`]
					+ "_" + merged[`${this.datasetID}_number`];
				delete merged[this.datasetID + "_fileHref"]; // don't need fileHref, just room href in final object, but can always add back in here if necessary
				buildOrRoomData.push(merged);
			}
		}
	}

	private getGeolocation(address: any){
		return new Promise((resolve, reject) => {
			let encodedAddress = encodeURI(address);
			let url = `http://cs310.students.cs.ubc.ca:11316/api/v1/project_team565/${encodedAddress}`;

			http.get(url, (res) => {
				let data = "";
				res.on("data", (chunk) => {
					data += chunk;
				});

				res.on("end", () => {
					Promise.resolve(JSON.parse(data));
					console.log("done");
				});

			}).on("error", (err) => {
				console.error("Error: " + err.message);
			});

		});

	}


	private parseTd(tdNode: any, obj: any) {
		for (let attrbObj of tdNode.attrs) {
			switch (attrbObj.value) {
				case "views-field views-field-field-building-code":// there's just 1 childnode and I think that will always be the case, don't think you can even put another html element inside the TDnode
					obj[this.datasetID + "_shortname"] = tdNode.childNodes[0].value.trim(); // remove the /n and whitespaces
					break;
				case "views-field views-field-title":
					for (let childNode of tdNode.childNodes) {
						if (childNode.nodeName === "a") {
							for (let attr of childNode.attrs) {
								if (attr.name === "href") {
									obj[this.datasetID + "_fileHref"] = attr.value;  // this is the link for location of building in zip
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
				case "views-field views-field-field-room-number":
					for (let childNode of tdNode.childNodes) {
						if(childNode.nodeName === "a") {
							for (let attr of childNode.attrs) {
								if (attr.name === "href") {
									obj[this.datasetID + "_href"] = attr.value; // this is the href for full details of specific room
								}
							}
							obj[this.datasetID + "_number"] = childNode.childNodes[0].value;
						}
					}
					break;
				case "views-field views-field-field-room-capacity":
					obj[this.datasetID + "_seats"] = (Number)(tdNode.childNodes[0].value.trim()); // if there's more than 1 element here literally impossible to know what info to extract, so there surely can only be one childnode inside the td, same applies for most of other ones (no need to loop through but idk)
					break;
				case "views-field views-field-field-room-furniture":
					obj[this.datasetID + "_furniture"] = tdNode.childNodes[0].value.trim(); // if there's more than 1 element here literally impossible to know what info to extract, so there surely can only be one childnode inside the td, same applies for most of other ones (no need to loop through but idk)
					break;
				case "views-field views-field-field-room-type":
					obj[this.datasetID + "_type"] = tdNode.childNodes[0].value.trim(); // if there's more than 1 element here literally impossible to know what info to extract, so there surely can only be one childnode inside the td, same applies for most of other ones (no need to loop through but idk)
					break;
			}
		}
	}

	private async parseCourses(processedDataset: any[], file: JSZip.JSZipObject) {
		let resultsArr = await file.async("string"); // results = the results array in given file where each entry is a section
		if (!this.validator.isValidJSON(resultsArr)) {
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
			if (!this.validator.isMissingAttribute(sectionValues)) {
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

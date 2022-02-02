import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError
} from "./IInsightFacade";
import JSZip from "jszip";

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
				this.processDataset(content).then();
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

	public async processDataset(content: string) {
		let processedDataset: any[] = [];
		let newZip = new JSZip();

		const zip = await newZip.loadAsync(content, {base64: true});
		zip.folder("courses")?.forEach((async (relativePath, file) => { // within folder iterating over files
			let resultsArr = await file.async("string"); // results = the results array in given file where each entry is a section
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

				let isMissingAttribute = false;
				let sectionValues = Object.values(jsonSection);
				for(let value of sectionValues){
					if (value === undefined) {
						isMissingAttribute = true;
						break;
					}
				}
				if(!isMissingAttribute) {
					processedDataset.push(jsonSection);
				}
			}
		}));

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

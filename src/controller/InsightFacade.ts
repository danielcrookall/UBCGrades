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
			if(!this.isValidID(id)) { // reject if invalid ID or same as previously added
				reject(new InsightError());
			} else {
				this.addedIds.push(id);
				resolve(this.addedIds);
			}

		});
	}

	public isValidID(id: string){
		if (id.includes("_") || this.addedIds.includes(id)) {
			return false;
		}
		return id.replace(/\s/g, "").length; // removes all whitespace in string
		// then checks length. if 0, the string was all whitespace and we return false
	}

	public async processDataset(content: string) {
		let zip = new JSZip();
		await zip.loadAsync(content,{base64: true});
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

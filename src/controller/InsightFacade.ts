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
import {DatasetProcessing} from "./DatasetProcessing";
import {PerformQueryFilters} from "./PerformQueryFilters";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */

interface CourseSection {
	"avg": number,
	"pass": number,
	"fail": number,
	"audit": number,
	"year": number,
	"dept": string,
	"id": string,
	"instructor": string,
	"title": string,
	"uuid": string
}

export default class InsightFacade implements IInsightFacade {
	// private dataDir = "./data/";

	constructor() {
		let a = 5;
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		let dataProcessing = new DatasetProcessing();
		let addedIds: string[] = [];
		await dataProcessing.getExistingDataSetIds(addedIds);
		if(!dataProcessing.isValidID(id,addedIds)) { // reject if invalid ID or same as previously added or not zip
			return Promise.reject(new InsightError());
		}
		const isZip = await dataProcessing.isZip(content);
		if(!isZip){
			return Promise.reject(new InsightError());
		}
		try {
			await dataProcessing.processDataset(content, id);
			addedIds.push(id);
		} catch (err) {
			return Promise.reject(new InsightError());
		}
		return Promise.resolve(addedIds);

	}

	public removeDataset(id: string): Promise<string> {
		return Promise.resolve("");
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		let performQuery = new PerformQueryFilters();
		let id = "courses";
		let dataset: CourseSection[];
		try {
			dataset = performQuery.loadDataset(id);
			// console.log(queriedDataset[0].avg);

		} catch (err){
			return Promise.reject(InsightError);
		}

		let queryObject = performQuery.getQueryObject(query);
		let filter = queryObject.WHERE;
		let options = queryObject.OPTIONS;
		let queryResults = performQuery.performFilter(filter,dataset);
		let columnResults = performQuery.performColumns(options, queryResults);
		console.log(columnResults);
		let orderedResults = performQuery.performOrder(options, columnResults); // note this will modify the array in place meaning column results will also be ordered automatically.
		// console.log(filter);

		// console.log(queryObject.OPTIONS);
		// console.log(queryObject.OPTIONS.COLUMNS);
		// console.log(queryObject.OPTIONS.ORDER);

		console.log(queryResults);
		// console.log(columnResults);
		console.log(orderedResults);

		// console.log(query);
		// let string = JSON.stringify(query);
		// console.log(string);
		// let object = JSON.parse(string);
		// console.log(Object.keys(object));
		// console.log("OBJECT WHERE ");
		//
		// console.log(object.WHERE);
		// console.log(object.WHERE.GT);
		return Promise.resolve([]);
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.resolve([]);
	}
}

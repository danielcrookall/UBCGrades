import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError, ResultTooLargeError
} from "./IInsightFacade";
import JSZip from "jszip";
import * as fs from "fs-extra";
import path from "path";
import {DatasetProcessing} from "./DatasetProcessing";
import {PerformQueryFilters} from "./PerformQueryFilters";
import {QueryValidator} from "./QueryValidator";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */

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
		let dataset: any[];
		let queryObject = performQuery.getQueryObject(query);
		let filter = queryObject.WHERE;
		let options = queryObject.OPTIONS;
		let columns = options.COLUMNS;
		let orderKey = options.ORDER;
		let parser: any;
		try {
			parser = new QueryValidator(queryObject);
			parser.queryValidation(queryObject); // checking here same reason as below
			parser.whereValidation(queryObject.WHERE); // checking for validation of where block here, because it should only be checked once, not on subsequent iterations for nest queried like AND
			parser.optionsValidation(options);
			parser.validateFilter(filter);
			parser.validateColumns(columns);
			parser.validateOrder(orderKey, columns);

			dataset = performQuery.loadDataset(parser.datasetID);
		} catch (err: any){
			console.error(err.message);
			return Promise.reject(InsightError);
		}
		let queryResults: any;
		let columnResults: any;
		let orderedResults: any;
		if(parser.isEmpty(filter)) {// empty where clause, ie. no filter, return all entries in dataset
			columnResults = performQuery.performColumns(options, dataset);
			orderedResults = performQuery.performOrder(options, columnResults); // note this will modify the array in place meaning column results will also be ordered automatically.
		} else {
			queryResults = performQuery.performFilter(filter,dataset);
			columnResults = performQuery.performColumns(options, queryResults);
			orderedResults = performQuery.performOrder(options, columnResults); // note this will modify the array in place meaning column results will also be ordered automatically.
		}

		if(orderedResults.length > 5000){
			console.error("The result is too big. Only queries with a maximum of 5000 results are supported.");
			return Promise.reject(ResultTooLargeError);
		}
		console.log(orderedResults);
		console.log(orderedResults.length);
		return Promise.resolve([orderedResults]);
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.resolve([]);
	}
}

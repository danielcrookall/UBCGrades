import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError, ResultTooLargeError
} from "./IInsightFacade";
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
	private dataDir = "./data/";

	constructor() {
		let a = 5;
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		let dataProcessing = new DatasetProcessing();
		let addedIds: string[] = [];
		await dataProcessing.getExistingDataSetIds(addedIds);
		if(!dataProcessing.isValidID(id,addedIds)) { // reject if invalid ID or same as previously added
			return Promise.reject(new InsightError());
		}
		const isZip = await dataProcessing.isZip(content);
		if(!isZip){
			console.error("Not a zip file.");
			return Promise.reject(new InsightError());
		}
		try {
			await dataProcessing.processDataset(content, id, kind);
			addedIds.push(id);
		} catch (err: any) {
			console.error(err.message);
			return Promise.reject(new InsightError());
		}
		return Promise.resolve(addedIds);

	}

	public async removeDataset(id: string): Promise<string> {
		let dataProcessing = new DatasetProcessing();
		let addedIds: string[] = [];
		if(!dataProcessing.isValidID(id, addedIds)){
			return Promise.reject(new InsightError()); // invalid id
		}
		await dataProcessing.getExistingDataSetIds(addedIds);

		if (!addedIds.includes(id)) {
			return Promise.reject(new NotFoundError()); // valid id, but it has not been added yet
		}

		try {
			fs.unlinkSync(this.dataDir + id + ".json"); // can be assured file exists at this point

		} catch(err: any){
			console.error(err.message);
			return Promise.reject(new InsightError());
		}


		return Promise.resolve(id);
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		let performQuery = new PerformQueryFilters();
		let dataProcessor = new DatasetProcessing();
		let dataset: any[];
		let queryObject = performQuery.getQueryObject(query);
		let filter = queryObject.WHERE;
		let options = queryObject.OPTIONS;
		let parser: any;
		try {
			parser = new QueryValidator(queryObject);
			parser.queryValidation(queryObject); // checking here same reason as below
			parser.whereValidation(queryObject.WHERE); // checking for validation of where block here, because it should only be checked once, not on subsequent iterations for nest queried like AND
			parser.optionsValidation(options);
			parser.validateFilter(filter);
			parser.validateColumns(options.COLUMNS);
			parser.validateOrder(options.ORDER, options.COLUMNS);

			dataset = dataProcessor.loadDataset(parser.datasetID);
		} catch (err: any){
			// console.error(err.message);
			return Promise.reject(new InsightError());
		}
		let queryResults: any;
		let columnResults: any;
		let orderedResults: any;
		if(parser.isEmpty(filter)) {// empty where clause, ie. no filter, return all entries in dataset
			if(dataset.length > 5000){
				// console.error("The result is too big. Only queries with a maximum of 5000 results are supported.");
				return Promise.reject(new ResultTooLargeError());
			}
			columnResults = performQuery.performColumns(options, dataset);
			orderedResults = performQuery.performOrder(options, columnResults); // note this will modify the array in place meaning column results will also be ordered automatically.
		} else {
			queryResults = performQuery.performFilter(filter,dataset);
			if(queryResults.length > 5000){
				// console.error("The result is too big. Only queries with a maximum of 5000 results are supported.");
				return Promise.reject(new ResultTooLargeError());
			}
			columnResults = performQuery.performColumns(options, queryResults);
			orderedResults = performQuery.performOrder(options, columnResults); // note this will modify the array in place meaning column results will also be ordered automatically.
		}

		// console.log(orderedResults);
		// console.log(orderedResults.length);
		return Promise.resolve(orderedResults);
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		let dataProcessor = new DatasetProcessing();
		let currentlyAddedDatasets = [];
		if (fs.existsSync(this.dataDir)) {
			const dir = await fs.promises.opendir(this.dataDir);
			for await (const file of dir) {
				let filename = file.name;
				let id = path.parse(filename).name;
				const numRows = dataProcessor.loadDataset(id).length;
				const datasetInfo = {
					id: id,
					kind: InsightDatasetKind.Courses,
					numRows: numRows
				};
				currentlyAddedDatasets.push(datasetInfo);
			}
		}
		return Promise.resolve(currentlyAddedDatasets);
	}

}


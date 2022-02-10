import * as fs from "fs-extra";
import {InsightError} from "./IInsightFacade";

export class QueryValidator {
	public datasetID: string;
	private validSfields;
	private validMfields;
	private queryObj: any;

	constructor(queryObj: any) {
		this.queryObj = queryObj;
		this.validSfields = ["dept", "id", "instructor", "title", "uuid"];
		this.validMfields = ["avg", "pass", "fail", "audit", "year"];
		this.datasetID = this.getDatasetIdFromQuery(queryObj);
	}

	public validateFilter(filter: any) {
		let filterKey = Object.keys(filter);

		switch (filterKey[0]) {
			case "IS":
				return this.validateIS(filter.IS);
			case "LT":
				return this.validateLT(filter.LT);
			case "GT":
				return this.validateGT(filter.GT);
			case "EQ":
				return this.validateEQ(filter.EQ);
			case "NOT":
				return this.validateNOT(filter.NOT);
			case "AND":
				return this.validateAND(filter.AND);
			case "OR":
				return this.validateOR(filter.OR);
			case undefined: // this is case where where filter is empty and we can just continue executing safely.
				return;
			default:
				throw new Error("Illegal filter key");
		}
	}

	public validateColumns(columns: any) {
		let desiredColumns = columns; // this is an array of the columns to filter by, eg courses_dept
		for (let columnKey of desiredColumns) {
			if (!this.isKeyValid(columnKey)) {
				throw new Error("Column key is not an mfield or an sfield.");
			}
		}
	}

	public validateOrder(orderKey: any, columns: any) {
		if (orderKey !== undefined) { // Orderkey is something like "courses_avg"
			if (!this.isKeyValid(orderKey)) {
				throw new Error("Order by key is not an mfield or an sfield.");
			}
			if(!columns.includes(orderKey)){
				throw new Error("ORDER key must be in COLUMNS");
			}
		}
	}

	private isKeyValid(key: any) { // takes in a key, ie mkey or skey ( eg. courses_dept or courses_avg) and checks if they are valid keys (ie. id's match and valid mfield)
		this.datasetIdMatches(key);
		let mfieldOrsfield = this.trimId(key);

		if (this.validMfields.includes(mfieldOrsfield)) {
			return true;
		}
		if (this.validSfields.includes(mfieldOrsfield)){
			return true;
		}
		return false;
	}

	private validateIS(filter: any) {
		let skey = Object.keys(filter)[0]; // something like courses_instructor
		this.datasetIdMatches(skey);
		this.isValidSField(this.trimId(skey)); // removes dataset id
		let inputString = Object.values(filter)[0]; // this is something like "313" or "313*"
		if (typeof inputString !== "string") {
			throw new Error("Invalid value type in IS, should be string");
		}
		if ((this.containsAsterix(inputString))) {
			if (this.isAsterixInMiddle(inputString)) {
				throw new Error("Wildcards can only be the first or last characters of input strings");
			}
		}
	}


	private validateLT(filter: any) {
		let mkey = Object.keys(filter)[0];
		this.datasetIdMatches(mkey);
		this.isValidMField(this.trimId(mkey));

		let number: any = Object.values(filter)[0];
		if (isNaN(number)) {
			throw new Error("Invalid value type in LT, should be number");
		}
	}

	private validateGT(filter: any) {
		let mkey = Object.keys(filter)[0];
		this.datasetIdMatches(mkey);
		this.isValidMField(this.trimId(mkey));

		let number: any = Object.values(filter)[0];
		if (isNaN(number)) {
			throw new Error("Invalid value type in GT, should be number");
		}
	}

	private validateEQ(filter: any) {
		let mkey = Object.keys(filter)[0];
		this.datasetIdMatches(mkey);
		this.isValidMField(this.trimId(mkey));

		let number: any = Object.values(filter)[0];
		if (isNaN(number)) {
			throw new Error("Invalid value type in EQ, should be number");
		}
	}

	private validateNOT(filter: any) {
		this.validateFilter(filter);
	}

	private validateAND(filterArr: any) {
		if (filterArr.length === 0) {
			throw new Error("Empty AND clause not supported");
		}
		for (const filter of filterArr) {
			this.validateFilter(filter);
		}
	}

	private validateOR(filterArr: any) {
		if (filterArr.length === 0) {
			throw new Error("Empty OR clause not supported");
		}
		for (const filter of filterArr) {
			this.validateFilter(filter);
		}
	}

	private trimId(str: any) {
		let trimmedStr = (str.slice(str.indexOf("_") + 1)); // find the first underscore and return everything after
		return trimmedStr;
	}

	private isAsterixInMiddle(str: any) {
		for (let i = 0; i < str.length; i++) {
			if (str.charAt(i) === "*" && i !== 0 && i !== str.length - 1) {
				return true;
			}
		}
		return false;
	}

	private containsAsterix(intputString: any) {
		return (intputString.charAt(0) === "*" || intputString.charAt(intputString.length - 1) === "*");
	}

	private datasetIdMatches(key: string) { // checks if id passed in matches the field of the dataset ID.
		let datsetID = key.substring(0, key.indexOf("_"));
		if (datsetID !== this.datasetID) {
			throw new Error("Inconsistent datasetIds");
		}
	}

	private getDatasetIdFromQuery(queryObject: any) {  // columns must exist with at least one entry for the query to be valid which we can use to extract the dataset ID from
		try {
			let str = queryObject.OPTIONS.COLUMNS[0];
			let datasetID = str.substring(0, str.indexOf("_"));
			return datasetID;
		}catch(err){
			throw new Error("Columns does not exist.");
		}
	}

	private isValidSField(sfield: string) {
		if (!this.validSfields.includes(sfield)) {
			throw new Error("Invalid sfield");
		}
	}

	private isValidMField(mfield: string) {
		if (!this.validMfields.includes(mfield)) {
			throw new Error("Invalid mfield");
		}
	}

	public isEmpty(obj: any) {
		return Object.keys(obj).length === 0;
	}

	public optionsValidation(optionsObj: any) {
		let optionKeys = Object.keys(optionsObj);
		if (this.isEmpty(optionsObj)) {
			throw new Error("Empty options object");
		}
		if (optionsObj === undefined) {
			throw new Error("Options object does not exist");
		}
		if (optionKeys.length > 2) {
			throw new Error("Excess keys in options block");
		}
		if (optionsObj.COLUMNS === undefined) {
			throw new Error("Missing columns");
		}

		if (optionsObj.ORDER === undefined){
			if(optionKeys.length !== 1){
				throw new Error("Invalid key in options (no order key)"); // if order is undefined, then you can only ever have 1 key: columns.
			}
		}
	}

	public whereValidation(whereObj: any) {
		if (whereObj === undefined) {
			throw new Error("Where key does not exist");
		}
	}

	public queryValidation(queryObj: any) {
		let queryKeys = Object.keys(queryObj);
		if (queryKeys.length > 2) {
			throw new Error("Excess keys in query. Query should only contain WHERE and OPTIONS.");
		}
		if (queryKeys.length < 2) {
			throw new Error("Missing keys in query. Query should only contain WHERE and OPTIONS.");
		}
	}

}

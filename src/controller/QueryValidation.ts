import * as fs from "fs-extra";
import {InsightError} from "./IInsightFacade";
import {FilterValidation} from "./FilterValidation";

export class QueryValidation {
	private queryObj: any;
	public datasetID: string;
	protected validSfields;
	protected validMfields;
	private validApplyTokens;


	constructor(queryObj: any) {
		this.queryObj = queryObj;
		this.datasetID = this.getDatasetIdFromQuery(queryObj);
		this.validSfields = ["dept", "id", "instructor", "title", "uuid", "fullname", "shortname", "number", "name",
			"address", "type", "furniture", "href"];
		this.validMfields = ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];
		this.validApplyTokens = ["MAX", "MIN", "AVG", "COUNT", "SUM"];
	}

	public validateColumns(columns: any) {
		let desiredColumns = columns; // this is an array of the columns to filter by, eg courses_dept
		let transformationObj = this.queryObj.TRANSFORMATIONS;
		for (let columnKey of desiredColumns) {
			if (!columnKey.includes("_")) { // keys that don't have underscores are apply keys
				if (!this.isValidApplyKey(columnKey)) {
					throw new Error(`Column key '${columnKey}' is not a valid applykey.`);
				}
			} else { // key contains an underscore, check if it's a valid key
				if (!this.isValidKey(columnKey)) { // isValidKey just checks for valid mkey, skey, not applykey
					throw new Error(`Column key '${columnKey}' is not an mfield or sfield or it's an apply key
					with an underscore.`);
				}
			}

			if (transformationObj !== undefined) {  // if transformations exists, have to make sure column key is part of group or apply
				const groupKeysArr = transformationObj.GROUP;
				const applyKeysArr = this.getApplyKeys(transformationObj.APPLY);
				if (!groupKeysArr.includes(columnKey) && !applyKeysArr.includes(columnKey)) {
					throw new Error("Keys in COLUMNS must be in GROUP or APPLY when TRANSFORMATIONS is present");
				}
			}
		}

	}

	public validateTransformations(transformation: any) {
		if (transformation !== undefined) {
			if (Object.keys(transformation).length > 2) {
				throw new Error("Extra keys in TRANSFORMATIONS (should only contain GROUP and APPLY)");
			}

			if (transformation.GROUP === undefined) {
				throw new Error(" TRANSFORMATIONS missing GROUP");
			}
			if (transformation.APPLY === undefined) {
				throw new Error("TRANSFORMATIONS missing APPLY");
			}

			if (transformation.GROUP.length === 0) {
				throw new Error("GROUP must be a non-empty array");
			}

			for (let key of transformation.GROUP) {
				if (!this.isValidKey(key)) {
					throw new Error(`Invalid key '${key}' in GROUP`);
				}
			}

			this.validateApply(transformation.APPLY);

		}
	}

	private validateApply(applyRules: any) {

		const allApplyKeys: string[] = []; // an array containing all the seen apply keys, used to check for duplicates
		for (let ruleObj of applyRules) {  // note that Apply is an array of objects (applyRules), whose values contain another object(applyRule) like {"COUNT": courses_year"}
			const applyRuleKeys = Object.keys(ruleObj);
			if (applyRuleKeys.length !== 1) {
				throw new Error(`Apply rule should only have 1 key, has ${applyRuleKeys.length}`);
			}

			applyRuleKeys.map((key) => {
				if (!this.isValidApplyKey(key)) {
					throw new Error("Cannot have underscore in applyKey");
				}
			});

			const applyBodyKeys = Object.keys(ruleObj[applyRuleKeys[0]]); // we've verified that rule obj just contains 1 key, the apply body should contain something like "COUNT": courses_year"

			if (applyBodyKeys.length !== 1) {
				throw new Error(`Apply body should only have 1 key, has ${applyBodyKeys.length}`);
			}

			let applyKey = applyRuleKeys[0];  // something like "maxSeats"
			let applyObj = ruleObj[applyKey]; // the object that contains the applytoken (eg. MAX) and the key it applies to, eg (rooms_seats)
			let applyToken = Object.keys(applyObj)[0];
			let key = applyObj[applyToken]; // something like rooms_seats

			if (allApplyKeys.includes(applyKey)) {
				throw new Error("Duplicate APPLY key");
			}
			this.validateApplyRule(key, applyToken);
			allApplyKeys.push(applyKey);
		}
	}


	private validateApplyRule(key: string, applyToken: string) {
		if (!this.isValidKey(key)) { // is ValidKey may thrown an error before this error is thrown, so may not get error message expected.
			throw new Error(` Invalid key '${key}' in ${applyToken}`);
		}

		if (!this.validApplyTokens.includes(applyToken)) {
			throw new Error(`Illegal transformation operator '${applyToken}'`);

		}

		if (!this.isAggregateFunctionAppliedToCorrectType(key, applyToken)) {
			throw new Error(`Invalid key type in ${applyToken}`);
		}
	}

	private isAggregateFunctionAppliedToCorrectType(key: string, applyToken: string) {
		if (applyToken === "COUNT") {
			return true; // COUNT can be applied to both numeric and string fields
		}
		return (this.validMfields.includes(this.trimId(key))); // rest of aggregate functions can only be applied to numeric fields.
	}


	private getApplyKeys(applyRules: any) {
		let applyKeys: any = [];
		for (let ruleObj of applyRules) {
			let applyKey = Object.keys(ruleObj)[0];  // something like "maxSeats"
			applyKeys.push(applyKey);
		}
		return applyKeys;
	}

	public validateOrder(orderKey: any, columns: any) {
		if (orderKey !== undefined) { // Orderkey is something like "courses_avg"
			if (typeof orderKey === "object") {
				this.validateOrderObj(orderKey);
			} else {
				if (!orderKey.includes("_")) { // ordering by a single applykey
					if (!this.isValidApplyKey(orderKey)) {
						throw new Error(`Order key '${orderKey}' is not a valid applyKey`);
					}
				} else { // order key must be an mkey or skey or an invalid applykey containing an underscore
					if (!this.isValidKey(orderKey)) {
						throw new Error(`Order key '${orderKey}' is an invalid mfield, sfield or applykey`);
					}
				}
				if (!columns.includes(orderKey)) {
					throw new Error("ORDER key must be in COLUMNS");
				}
			}
		}
	}

	private validateOrderObj(orderObj: any) {
		if (Object.keys(orderObj).length > 2) {
			throw new Error("Extra keys in ORDER");
		}
		if (orderObj.dir === undefined) {
			throw new Error("ORDER missing 'dir' key");
		}
		if (orderObj.keys === undefined) {
			throw new Error("ORDER missing 'keys' key");
		}

		if (orderObj.keys.length === 0) {
			throw new Error(" ORDER keys must be a non-empty array");
		}

		if (orderObj.dir !== "DOWN" && orderObj.dir !== "UP") {
			throw new Error(`Invalid ORDER direction '${orderObj.dir}' (must be UP or DOWN)`);
		}

		for (let key of orderObj.keys) {
			if (!this.queryObj.OPTIONS.COLUMNS.includes(key)) {
				throw new Error("All ORDER keys must be in COLUMNS");
			}
		}
	}

	private isValidKey(key: any) { // takes in a key, ie mkey, skey  ( eg. courses_dept or courses_avg) and checks if they are valid keys (ie. id's match and valid mfield)
		if (!this.datasetIdMatches(key)) {
			return false;
		}
		let mfieldOrsfield = this.trimId(key);

		if (this.validMfields.includes(mfieldOrsfield)) {
			return true;
		}
		if (this.validSfields.includes(mfieldOrsfield)) {
			return true;
		}
		return false;
	}


	private isValidApplyKey(key: any) {
		return !key.includes("_");
	}


	protected trimId(str: any) {
		let trimmedStr = (str.slice(str.indexOf("_") + 1)); // find the first underscore and return everything after
		return trimmedStr;
	}


	protected datasetIdMatches(key: string) { // checks if id passed in matches the field of the dataset ID.
		let datasetID = key.substring(0, key.indexOf("_"));
		return (datasetID === this.datasetID);
	}


	private getDatasetIdFromQuery(queryObject: any) {  // columns must exist with at least one entry for the query to be valid which we can use to extract the dataset ID from
		let str: string;
		try { // HOWEVER, it's possible for columns to just contain applyKeys, which don't necessarily have the dataset ID associated with them.
			str = queryObject.OPTIONS.COLUMNS[0];
			if (str.includes("_")) { // if string doesn't have an underscore, then we're dealing with anykeys, check for dataset id in group clause instead

			} else {
				str = queryObject.TRANSFORMATIONS.GROUP[0];
			}
			let datasetID = str.substring(0, str.indexOf("_"));
			return datasetID;
		} catch (err) {
			throw new Error("Failed to retrieve dataset id. Columns or group does not exist.");
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
		if (optionsObj.ORDER === undefined) {
			if (optionKeys.length !== 1) {
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
		if (queryKeys.length > 3) {
			throw new Error("Excess keys in query. Query should only contain WHERE, OPTIONS and optionally " +
				"TRANSFORMATIONS.");
		}
		if (queryKeys.length < 2) {
			throw new Error("Missing keys in query. Query should only contain WHERE and OPTIONS (and optionally " +
				"TRANSFORMATIONS).");
		}
		if (queryKeys.length === 3) {
			if (!(queryObj.WHERE && queryObj.OPTIONS && queryObj.TRANSFORMATIONS)) {
				throw new Error("Excess keys in query object. Query with 3 keys must contain exactly WHERE, OPTIONS " +
					"and TRANSFORMATIONS.");
			}
		}


	}

}

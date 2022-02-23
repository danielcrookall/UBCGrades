import * as fs from "fs-extra";


export class PerformQueryFilters {
	private dataDir;

	constructor() {
		this.dataDir = "./data/";
	}

	public performFilter(filter: any, dataset: any[]) {
		let filterKey = Object.keys(filter);
		if (filterKey.length === 0) { // empty where clause
			return dataset;
		} else {
			switch (filterKey[0]) {
				case "IS":
					return this.doIS(filter.IS, dataset);
				case "LT":
					return this.doLT(filter.LT, dataset);
				case "GT":
					return this.doGT(filter.GT, dataset);
				case "EQ":
					return this.doEQ(filter.EQ, dataset);
				case "NOT":
					return this.doNOT(filter.NOT, dataset);
				case "AND":
					return this.doAND(filter.AND, dataset);
				case "OR":
					return this.doOR(filter.OR, dataset);
				default:
					throw new Error("Illegal filter key");
			}

		}
	}


	public performColumns(options: any, dataset: any) {
		let filteredResults = [];
		let desiredColumns = options.COLUMNS; // this is an array of the columns to filter by, eg courses_dept
		for (let section of dataset) {
			const filtered = Object.keys(section)
				.filter((key) => desiredColumns.includes(key)) // returns an array of keys to sort by eg. [courses_title, courses_instructor]
				.reduce((obj: Record<string, any>, key) => {
					obj[key] = section[key];  // obj[courses_title] = section[key], obj starts as an empty object, and you set it's keys/values to be the desired keys and the values from the section
					return obj;
				}, {});
			filteredResults.push(filtered);

		}
		return filteredResults;
	}

	public performOrder(options: any, dataset: any) {
		let orderKey = options.ORDER;
		if (typeof orderKey === "object") {
			this.performSort(options, dataset);
		} else {
			if (orderKey !== undefined) { // using old sort where order isn't an object
				dataset.sort(this.fieldSorter([orderKey]));
			}
		}

		return dataset;
	}

	public performSort(options: any, dataset: any) {
		let dir = options.ORDER.dir;
		let keys = options.ORDER.keys; // an array of keys, 1 or more. IN CASE OF ANYKEY, you can just SPECIFY 1 and not put it in array I THINK (That's the or statement at end of sort in EBNF)
		if (dir === "DOWN") {
			keys = keys.map((key: any) => (
				"_" + key  // can't put a negative sign in front as a flag because anykey may contain one, which would cause incorrect sorting order.
				// underscore isn't allowed in any of the keys and at this point query is validated, so it should be fine.
			));
		}
		dataset.sort(this.fieldSorter(keys));
	}

	public fieldSorter(keys: any[]) {
		return function (a: any, b: any) {
			return keys
				.map(function (object) {
					let dir = 1;
					if (object[0] === "_") {
						dir = -1;
						object = object.substring(1);
					}
					if (a[object] > b[object]) {
						return dir;
					}
					if (a[object] < b[object]) {
						return -(dir);
					}
					return 0;
				})
				.reduce(function firstNonZeroValue(previous, current) { // at this point you have an array of 1, 0s or -1 according to each filter
					// passed in ie, pass in [year,instructor] after comparing object[year] on 2 objects, then object [instructor] on the same 2 objects
					// it's only when there's a tie in the first field that you want to consult ordering of 2nd (that's why we want the first non-zero value)
					return previous ? previous : current;
				}, 0);
		};
	}


	// Take an isObj with format {skey: inputstring} and return list of all course sections
	// where the sfield of the skey matches inputstring (no wild cards atm).
	// Allowed sfields: dept,id,instructor,title,uuid
	// skey ::= idstring '_' sfield (idstring is the dataset name)
	private doIS(filter: any, dataset: any[]) {
		let courseList: any[] = [];
		let sField = Object.keys(filter)[0];
		let inputString = Object.values(filter)[0]; // this is something like "313" or "313*"
		if ((this.containsAsterix(inputString))) {
			courseList = this.doISWildcard(filter, dataset, sField);
		} else {
			for (let section of dataset) {
				if (section[sField as keyof typeof section] === Object.values(filter)[0]) {
					courseList.push(section);
				}
			}
		}
		return courseList;
	}


	private doISWildcard(filter: any, dataset: any[], sField: string) {
		let courseList: any[] = [];
		let inputString: any = Object.values(filter)[0]; // this is something like "313" or "313*"
		for (let section of dataset) {
			let datasetValue = section[sField as keyof typeof section]; // this is a value in the dataset, like a UUID of 3000
			let match = new RegExp("^" + inputString.replace(/\*/g, ".*") + "$").test(datasetValue); // replaces all * in inputstring with .* to match any character
			if (match) {
				courseList.push(section);
			}
		}
		return courseList;
	}

	private containsAsterix(intputString: any) {
		return (intputString.charAt(0) === "*" || intputString.charAt(intputString.length - 1) === "*");
	}

	private doLT(filter: any, dataset: any[]) {
		let courseList: any[] = [];
		let mField = Object.keys(filter)[0];

		let dataSetMField: any = Object.values(filter)[0];

		for (let section of dataset) {
			if (section[mField as keyof typeof section] < dataSetMField) { // makes appear as syntax error in debugger but still works. don't even ahve to cast to a number.
				courseList.push(section);
			}
		}
		return courseList;
	}

	private doGT(filter: any, dataset: any[]) {
		let courseList: any[] = [];
		let mField = Object.keys(filter)[0];

		let dataSetMField: any = Object.values(filter)[0];

		for (let section of dataset) {
			if (section[mField as keyof typeof section] > dataSetMField) {
				courseList.push(section);
			}
		}
		return courseList;
	}

	private doEQ(filter: any, dataset: any[]) {
		let courseList: any[] = [];
		let mField = Object.keys(filter)[0];

		let dataSetMField: any = Object.values(filter)[0];

		for (let section of dataset) {
			if (section[mField as keyof typeof section] === dataSetMField) {
				courseList.push(section);
			}
		}
		return courseList;
	}

	private doNOT(filter: any, dataset: any[]) {
		let complementCourseList: any[] = [];
		let filteredDataset: any = this.performFilter(filter, dataset);
		for (let originalSection of dataset) {
			if (!filteredDataset.includes(originalSection)) {
				complementCourseList.push(originalSection);
			}
		}
		return complementCourseList;
	}

	private doAND(filterArr: any, dataset: any[]) {
		if (filterArr.length === 0) {
			throw new Error("Empty AND clause not supported");
		}
		let result: any = this.performFilter(filterArr[0], dataset);
		for (let i = 1; i < filterArr.length; i++) {
			let result2 = this.performFilter(filterArr[i], dataset);
			result = this.inBothCourselists(result, result2);
		}
		return result as any;
	}

	private doOR(filterArr: any, dataset: any[]) {
		if (filterArr.length === 0) {
			throw new Error("Empty OR clause not supported");
		}
		let result: any = this.performFilter(filterArr[0], dataset);
		for (let i = 1; i < filterArr.length; i++) {
			let result2 = this.performFilter(filterArr[i], dataset);
			result = this.inEitherCourselists(result, result2);
		}
		return result;

	}

	private inEitherCourselists(dataset1: any[], dataset2: any[]) {
		let courseList: any[] = [];
		for (let section1 of dataset1) {
			courseList.push(section1);
		}
		for (let section2 of dataset2) {
			if (!courseList.includes(section2)) {
				courseList.push(section2);
			}
		}
		return courseList;
	}


	private inBothCourselists(dataset1: any[], dataset2: any[]) {
		let courseList: any[] = [];
		for (let section1 of dataset1) {
			for (let section2 of dataset2) {
				if (section1 === section2) {
					courseList.push(section1);
				}
			}
		}
		return courseList;
	}

	public getQueryObject(query: unknown) {
		let string = JSON.stringify(query);
		let queryObject = JSON.parse(string);
		return queryObject;
	}

}

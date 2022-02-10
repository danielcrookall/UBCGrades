import * as fs from "fs-extra";


export  class PerformQueryFilters {
	private dataDir;

	constructor() {
		this.dataDir = "./data/";
	}

	public performFilter(filter: any, dataset: any[]){
		let filterKey = Object.keys(filter);
		switch(filterKey[0]) {
			case "IS":
				return this.doIS(filter.IS, dataset);
			case "LT":
				return this.doLT(filter.LT, dataset);
			case "GT":
				return this.doGT(filter.GT,dataset);
			case "EQ":
				return this.doEQ(filter.EQ,dataset);
			case "NOT":
				return this.doNOT(filter.NOT,dataset);
			case "AND":
				return this.doAND(filter.AND,dataset);
			case "OR":
				return this.doOR(filter.OR,dataset);
			default:
				throw new Error("Illegal filter key");
		}
	}

	public performColumns(options: any, dataset: any){
		let filteredResults = [];
		let desiredColumns = options.COLUMNS; // this is an array of the columns to filter by, eg courses_dept
		for (let section of dataset){
			const filtered = Object.keys(section)
				.filter((key) => desiredColumns.includes(key))
				.reduce((obj: Record<string, any>, key) => {
					obj[key] = section[key];
					return obj;
				}, {});
			filteredResults.push(filtered);

		}
		return filteredResults;
	}

	public performOrder(options: any, dataset: any){
		let orderKey = options.ORDER;
		dataset.sort((a: any, b: any) => {
			let valA = a[orderKey];
			let valB = b[orderKey];
			if (valA < valB) {
				return -1;
			}
			if (valA > valB) {
				return 1;
			}
			return 0;

		});

		return dataset;


	}

	// Take an isObj with format {skey: inputstring} and return list of all course sections
	// where the sfield of the skey matches inputstring (no wild cards atm).
	// Allowed sfields: dept,id,instructor,title,uuid
	// skey ::= idstring '_' sfield (idstring is the dataset name)
	private doIS(filter: any, dataset: any[]){
		let courseList: any[] = [];
		let sField = Object.keys(filter)[0];
		let inputString = Object.values(filter)[0]; // this is something like "313" or "313*"
		if((this.containsAsterix(inputString))){
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


	private doISWildcard(filter: any, dataset: any[], sField: string){
		let courseList: any[] = [];
		let inputString: any = Object.values(filter)[0]; // this is something like "313" or "313*"
		for (let section of dataset) {
			let datasetValue = section[sField as keyof typeof section]; // this is a value in the dataset, like a UUID of 3000
			let match = new RegExp("^" + inputString.replace(/\*/g, ".*") + "$").test(datasetValue); // replaces all * in inputstring with .* to match any character
			if(match){
				courseList.push(section);
			}
		}
		return courseList;
	}

	private containsAsterix(intputString: any){
		return(intputString.charAt(0) === "*" || intputString.charAt(intputString.length - 1) === "*");
	}

	private doLT(filter: any, dataset: any[]){
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

	private doGT(filter: any, dataset: any[]){
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
	private doEQ(filter: any, dataset: any[]){
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

	private doNOT(filter: any, dataset: any[]){
		let complementCourseList: any[] = [];
		let filteredDataset: any = this.performFilter(filter,dataset);
		for (let originalSection of dataset) {
			if(!filteredDataset.includes(originalSection)){
				complementCourseList.push(originalSection);
			}
		}
		return complementCourseList;
	}

	private doAND(filterArr: any, dataset: any[]){
		if(filterArr.length === 0){
			throw new Error("Empty AND clause not supported");
		}
		let result: any = this.performFilter(filterArr[0],dataset);
		for(let i = 1; i < filterArr.length; i++){
			let result2 = this.performFilter(filterArr[i], dataset);
			result = this.inBothCourselists(result, result2);
		}
		return result as any;
	}

	private doOR(filterArr: any, dataset: any[]){
		if(filterArr.length === 0){
			throw new Error("Empty OR clause not supported");
		}
		let result: any = this.performFilter(filterArr[0],dataset);
		for(let i = 1; i < filterArr.length; i++){
			let result2 = this.performFilter(filterArr[i], dataset);
			result = this.inEitherCourselists(result, result2);
		}
		return result;

	}

	private inEitherCourselists(dataset1: any[], dataset2: any[]){
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


	private inBothCourselists(dataset1: any[], dataset2: any[]){
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

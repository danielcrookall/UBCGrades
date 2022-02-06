import * as fs from "fs-extra";

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
export  class PerformQueryFilters {
	private dataDir;

	constructor() {
		this.dataDir = "./data/";
	}

	public performFilter(filter: any, dataset: CourseSection[]){
		let filterKey = Object.keys(filter);
		// let obj = filter.IS;
		// let str = Object.keys(obj);
		// console.log(str[0].slice(str[0].indexOf("_") + 1));
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

	// Take an isObj with format {skey: inputstring} and return list of all course sections
	// where the sfield of the skey matches inputstring (no wild cards atm).
	// Allowed sfields: dept,id,instructor,title,uuid
	// skey ::= idstring '_' sfield (idstring is the dataset name)
	private doIS(filter: any, dataset: CourseSection[]){
		let courseList: CourseSection[] = [];
		let sField = this.trimIdString(filter); // takes courses_instructor and returns instructor without quotes
		let inputString = Object.values(filter)[0]; // this is something like "313" or "313*"
		if((this.containsAsterix(inputString))){ // STILL HAVE TO CHECK FOR ASTERIX THAT AREN"T AT BEGINNING AND END INVALIDATING QUERY.
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

	private doISWildcard(filter: any, dataset: CourseSection[], sField: string){
		let arrDatasetSFieldKeysValues = [];   // an array of all the values in the dataset that match the skey, eg. all the datasets UUIDs
		let courseList: CourseSection[] = [];
		let inputString = Object.values(filter)[0]; // this is something like "313" or "313*"
		for (let section of dataset) {
			let datasetValue = section[sField as keyof typeof section]; // this is a value in the dataset, like a UUID of 3000
			arrDatasetSFieldKeysValues.push(datasetValue);
		}
		let filteredValues = this.filterByRegex(arrDatasetSFieldKeysValues, inputString); // returns all values in the dataset that match the specified inputString wildcard string

		for (let courseSection of dataset) {
			for (let values of filteredValues) {
				if (courseSection[sField as keyof typeof courseSection] === values) { // returns every section in dataset if its value matches wildcard query
					courseList.push(courseSection);
				}
			}
		}
		return courseList;
	}

	// applies regex to every value in the arr and returns an array of results that match
	private filterByRegex(arr: any, inputString: any){
		let filteredValues: any[] = [];
		for (let sectionValue of arr){
			let match = new RegExp("^" + inputString.replace(/\*/g, ".*") + "$").test(sectionValue); // replaces all * in inputstring with .* to match any character
			if(match){
				filteredValues.push(sectionValue);
			}
		}
		return filteredValues;
	}

	private containsAsterix(intputString: any){
		return(intputString.charAt(0) === "*" || intputString.charAt(intputString.length - 1) === "*");
	}

	private doLT(filter: any, dataset: CourseSection[]){
		let courseList: CourseSection[] = [];
		let mField = this.trimIdString(filter);

		let dataSetMField: any = Object.values(filter)[0];

		for (let section of dataset) {
			if (section[mField as keyof typeof section] < dataSetMField) { // makes appear as syntax error in debugger but still works. don't even ahve to cast to a number.
				courseList.push(section);
			}
		}
		return courseList;
	}

	private doGT(filter: any, dataset: CourseSection[]){
		let courseList: CourseSection[] = [];
		let mField = this.trimIdString(filter);

		let dataSetMField: any = Object.values(filter)[0];

		for (let section of dataset) {
			if (section[mField as keyof typeof section] > dataSetMField) {
				courseList.push(section);
			}
		}
		return courseList;
	}
	private doEQ(filter: any, dataset: CourseSection[]){
		let courseList: CourseSection[] = [];
		let mField = this.trimIdString(filter);

		let dataSetMField: any = Object.values(filter)[0];

		for (let section of dataset) {
			if (section[mField as keyof typeof section] === dataSetMField) {
				courseList.push(section);
			}
		}
		return courseList;
	}

	private doNOT(filter: any, dataset: CourseSection[]){
		let complementCourseList: CourseSection[] = [];
		let filteredDataset: any = this.performFilter(filter,dataset);
		for (let originalSection of dataset) {
			if(!filteredDataset.includes(originalSection)){
				complementCourseList.push(originalSection);
			}
		}
		return complementCourseList as any;
	}

	private doAND(filterArr: any, dataset: CourseSection[]){
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

	private doOR(filterArr: any, dataset: CourseSection[]){
		if(filterArr.length === 0){
			throw new Error("Empty OR clause not supported");
		}
		let result: any = this.performFilter(filterArr[0],dataset);
		for(let i = 1; i < filterArr.length; i++){
			let result2 = this.performFilter(filterArr[i], dataset);
			result = this.inEitherCourselists(result, result2);
		}
		return result as any;

		return null;
	}

	private inEitherCourselists(dataset1: CourseSection[], dataset2: CourseSection[]){
		let courseList: CourseSection[] = [];
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


	private inBothCourselists(dataset1: CourseSection[], dataset2: CourseSection[]){
		let courseList: CourseSection[] = [];
		for (let section1 of dataset1) {
			for (let section2 of dataset2) {
				if (section1 === section2) {
					courseList.push(section1);
				}
			}
		}
		return courseList;
	}

	private trimIdString(filterObj: any){
		let str = Object.keys(filterObj);
		let trimmedStr = (str[0].slice(str[0].indexOf("_") + 1)); // find the first underscore and return everything after
		return trimmedStr;
	}

	public getQueryObject(query: unknown) {
		let string = JSON.stringify(query);
		let queryObject = JSON.parse(string);
		return queryObject;
	}

	public loadDataset(id: string) {
		let dataset;
		try {
			const jsonString = fs.readFileSync(`data/${id}.json`);
			dataset = JSON.parse(jsonString.toString());
			return dataset;
		} catch(err) {
			throw new Error("Dataset does not exist");
		}
	}

}

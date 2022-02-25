import {QueryValidation} from "./QueryValidation";

export class FilterValidation extends QueryValidation {


	constructor(queryObj: any) {
		super(queryObj);
	}

	public validateFilter(filter: any) {
		let filterKey = Object.keys(filter);

		switch (filterKey[0]) {
			case "IS":
				this.validateIS(filter.IS);
				break;
			case "LT":
				this.validateLT(filter.LT);
				break;
			case "GT":
				this.validateGT(filter.GT);
				break;
			case "EQ":
				this.validateEQ(filter.EQ);
				break;
			case "NOT":
				this.validateNOT(filter.NOT);
				break;
			case "AND":
				this.validateAND(filter.AND);
				break;
			case "OR":
				this.validateOR(filter.OR);
				break;
			case undefined: // this is case where where filter is empty and we can just continue executing safely.
				return;
			default:
				throw new Error("Illegal filter key");
		}
	}

	private validateIS(filter: any) {
		let skey = Object.keys(filter)[0]; // something like courses_instructor
		if (!this.datasetIdMatches(skey)) {
			throw new Error(`${skey} is inconsistent with datasetID`);
		}
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
		this.validateMComparators(filter, "LT");
	}

	private validateGT(filter: any) {
		this.validateMComparators(filter, "GT");
	}

	private validateEQ(filter: any) {
		this.validateMComparators(filter, "EQ");
	}

	private validateMComparators(filter: any, mComptr: string) {
		let mkey = Object.keys(filter)[0];
		if (!this.datasetIdMatches(mkey)) {
			throw new Error(`${mkey} is inconsistent with datasetID`);
		}
		this.isValidMField(this.trimId(mkey));

		let number: any = Object.values(filter)[0];
		if (isNaN(number)) {
			throw new Error(`Invalid value type in ${mComptr}, should be number`);
		}
	}

	private validateNOT(filter: any) {
		this.validateFilter(filter);
	}

	private validateAND(filterArr: any) {
		this.logicValidator(filterArr, "AND");
	}

	private validateOR(filterArr: any) {
		this.logicValidator(filterArr, "OR");
	}


	private logicValidator(filterArr: any, logic: string) {
		if (filterArr.length === 0) {
			throw new Error(`Empty ${logic} clause not supported`);
		}
		for (const filter of filterArr) {
			this.validateFilter(filter);
		}

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

}

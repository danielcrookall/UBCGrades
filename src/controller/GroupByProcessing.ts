import Decimal from "decimal.js";

export class GroupByProcessing {
	private dataDir;

	constructor() {
		this.dataDir = "./data/";
	}

	public performTransformations(transformations: any, dataset: any[]) {
		if(transformations === undefined) {
			return dataset;
		}
		let groupKeys = transformations.GROUP; // an array of keys to group by, eg [rooms_shortname, rooms_uuid]
		let groupedResults = this.groupBy(dataset, groupKeys);  // really just need to perform columns on the given groups, then eliminate any duplicates. Have to make sure we retain any keys the apply block will need though.
		let applyResults = this.performApply(groupedResults, transformations.APPLY);
		// you have the grouped representation as an object (an object where each key has a value of an array and represents a grouping), we want all these groupings combined into one object after apply has been done.
		return this.getReducedGroups(applyResults);
	}

	private getReducedGroups(applyResults: any) {
		let reducedGroups: any = [];
		let groupArrs: any = Object.values(applyResults);
		for (let arr of groupArrs) { // each array holds a list of objects that have been grouped together
			const grouped = arr.reduce((curr: any, next: any) => { // merge every object in each arr down to 1, if there are duplicates they just get overwritten which is fine. We're maintaining a list of all the object properties, even though some of them don't actually make sense in terms of the group.
				return ({...curr, ...next});
			}, {});
			reducedGroups.push(grouped);
		}
		return reducedGroups;
	}

	private performApply(objGroupArrs: any, applyRules: any) {

		for (let ruleObj of applyRules) {
			let applyKey = Object.keys(ruleObj)[0];  // something like "maxSeats"
			let applyObj = ruleObj[applyKey]; // the object that contains the applytoken (eg. MAX) and the key it applies to, eg (rooms_seats)
			let applyToken = Object.keys(applyObj)[0];
			let key = applyObj[applyToken]; // something like rooms_seats

			switch (applyToken) {
				case "MAX"  : {
					this.doMax(objGroupArrs, key, applyKey);
					break;
				}
				case "MIN": {
					this.doMin(objGroupArrs, key, applyKey);
					break;
				}
				case "AVG": {
					this.doAvg(objGroupArrs, key, applyKey);
					break;
				}
				case "COUNT": {
					this.doCount(objGroupArrs, key, applyKey);
					break;
				}
				case "SUM": {
					this.doSum(objGroupArrs, key, applyKey);
					break;
				}
				default:
					throw new Error("Illegal applyToken");
			}

		}
		return objGroupArrs;
	}

	private getAggregatedObj(applyKey: string, aggregatedValue: number | string) {
		const aggregatedResult = {
			[applyKey]: aggregatedValue
		};
		return aggregatedResult;
	}

	private doMax(objGroups: any, key: string, applyKey: string) {
		let groupArrs: any = Object.values(objGroups);
		for (let arr of groupArrs) { // each array holds a list of objects that have been grouped together
			let max = arr[0][key];
			for (let groupObj of arr) {
				if (groupObj[key] > max) {
					max = groupObj[key];
				}
			}
			const aggregatedResult = this.getAggregatedObj(applyKey, max);
			arr.push(aggregatedResult);
		}

	}

	private doMin(objGroups: any, key: string, applyKey: string) {
		let groupArrs: any = Object.values(objGroups);
		for (let arr of groupArrs) { // each array holds a list of objects that have been grouped together
			let min = arr[0][key];
			for (let groupObj of arr) {
				if (groupObj[key] < min) {
					min = groupObj[key];
				}
			}
			const aggregatedResult = this.getAggregatedObj(applyKey, min);
			arr.push(aggregatedResult);
		}

	}

	private doAvg(objGroups: any, key: string, applyKey: string) {
		let groupArrs: any = Object.values(objGroups);
		for (let arr of groupArrs) { // each array holds a list of objects that have been grouped together
			let sum: Decimal = new Decimal (0);
			const count = arr.length;
			for (let groupObj of arr) {
				let decimalValue = new Decimal(groupObj[key]);
				sum = Decimal.add(decimalValue, sum);
			}
			let avg = sum.toNumber() / count;
			let res = Number(avg.toFixed(2));
			const aggregatedResult = this.getAggregatedObj(applyKey, res);
			arr.push(aggregatedResult);
		}
	}

	private doCount(objGroups: any, key: string, applyKey: string) {
		let groupArrs: any = Object.values(objGroups);
		for (let arr of groupArrs) { // each array holds a list of objects that have been grouped together
			const set = new Set();
			for (let groupObj of arr) {
				set.add(groupObj[key]);
			}
			const aggregatedResult = this.getAggregatedObj(applyKey, set.size);
			arr.push(aggregatedResult);
		}
	}

	private doSum(objGroups: any, key: string, applyKey: string) {
		let groupArrs: any = Object.values(objGroups);
		for (let arr of groupArrs) { // each array holds a list of objects that have been grouped together
			let sum = 0;
			for (let groupObj of arr) {
				sum += groupObj[key];
			}
			const aggregatedResult = this.getAggregatedObj(applyKey, Number(sum.toFixed(2)));
			arr.push(aggregatedResult);
		}
	}

	private groupBy(datasetArr: any, keysArr: any) {
		return datasetArr.reduce((groupedData: any, obj: any) => {
			const objKey = keysArr.map((key: any) => `${obj[key]}`).join("#"); // joins the list of keys you're grouping by into 1 name to identify each unique grou.
			if (groupedData[objKey]) { // groupData contains the key (undefined is a falsy value), push it to the preexisting array (the value at the key).
				groupedData[objKey].push(obj);
			} else { // groupData does not contain the key, need to initalize it in storage as an array.
				groupedData[objKey] = [obj];
			}
			return groupedData;
		}, {});
	}

}

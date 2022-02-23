export class GroupByProcessing {
	private dataDir;

	constructor() {
		this.dataDir = "./data/";
	}

	public performTransformations(transformations: any, dataset: any[]) {
		let groupKeys = transformations.GROUP; // an array of keys to group by, eg [rooms_shortname, rooms_uuid]
		let groupedResults = this.groupBy(dataset, groupKeys);  // really just need to perform columns on the given groups, then eliminate any duplicates. Have to make sure we retain any keys the apply block will need though.
		let applyResults = this.performApply(groupedResults, transformations.APPLY);
		let reducedGroups = this.getReducedGroups(applyResults); // you have the grouped representation as an object (an object where each key has a value of an array and represents a grouping), we want all these groupings combined into one object after apply has been done.
		return reducedGroups;
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
					throw new Error("Illegal filter key");
			}

		}
		return objGroupArrs;
	}

	private doMax(objGroups: any, key: any, applyKey: any) {
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

	private getAggregatedObj(applyKey: any, aggregatedValue: any) {
		const aggregatedResult = {
			[applyKey]: aggregatedValue
		};
		return aggregatedResult;
	}

	private doMin(objGroups: any, key: any, groupKeys: any) {
		// TODO
	}

	private doAvg(objGroups: any, key: any, groupKeys: any) {
		// TODO
	}

	private doCount(objGroups: any, key: any, groupKeys: any) {
		// TODO
	}

	private doSum(objGroups: any, key: any, groupKeys: any) {
		// TODO
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

import JSZip from "jszip";

export class DatasetValidation {

	private datasetID;

	constructor(datasetID: string) {

		this.datasetID = datasetID;
	}

	public validateRoomInfo (roomObj: any) {
		let keysArr = Object.keys(roomObj);
		return (keysArr.includes(`${this.datasetID}_number`) && keysArr.includes(`${this.datasetID}_href`)
			&& keysArr.includes(`${this.datasetID}_furniture`) && keysArr.includes(`${this.datasetID}_seats`)
			&& keysArr.includes(`${this.datasetID}_type`));
	}

	public validateBuildInfo (roomObj: any){
		let keysArr = Object.keys(roomObj);
		return (keysArr.includes(`${this.datasetID}_shortname`) && keysArr.includes(`${this.datasetID}_fileHref`) &&
			keysArr.includes(`${this.datasetID}_fullname`) && `${this.datasetID}_address`);
	}

	public isMissingAttribute(sectionValues: any[]) {
		for (let value of sectionValues) {
			if (value === undefined) {
				return true;
			}
		}
		return false;
	}

	public isValidJSON(resultArr: string) {
		try {
			JSON.parse(resultArr);
		} catch (e) {
			return false;
		}
		return true;
	}

	public async isZip(content: string) {
		let newZip = new JSZip();
		try {
			await newZip.loadAsync(content, {base64: true});
			return true;
		} catch (err) {
			return false;
		}
	}

	public isValidID(addedIds: string[]) {
		if (this.datasetID.includes("_") || addedIds.includes(this.datasetID)) {
			return false;
		}
		return this.datasetID.replace(/\s/g, "").length; // removes all whitespace in string
		// then checks length. if 0, the string was all whitespace and we return false
	}


}

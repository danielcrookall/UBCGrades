import InsightFacade from "../controller/InsightFacade";
import {InsightDatasetKind} from "../controller/IInsightFacade";
import * as fs from "fs-extra";
import CourseQueries from "./queries/CourseQueries";

export default class RouteHandlers {

	private static facade = new InsightFacade();

	public static async upload(req: any, res: any) {
		if (req.files === null) {
			return res.status(400).json({msg: "No file uploaded"});
		}
		const file = req.files.file;

		if (file.name !== "courses.zip" && file.name !== "rooms.zip") {
			console.error("File was not courses.zip or rooms.zip");
			return res.status(400).json({msg: "File was not courses.zip or rooms.zip"});
		}
		try {
			await file.mv(`src/backend/uploads/${file.name}`);
		} catch (err) {
			console.error(`Error moving file ${err}`);
			return res.status(500).send(err);
		}

		const dataset = this.getContentFromUploads(`${file.name}`);
		try {
			if (file.name === "courses.zip") {
				await RouteHandlers.facade.addDataset("courses", dataset, InsightDatasetKind.Courses);
			} else {
				await RouteHandlers.facade.addDataset("rooms", dataset, InsightDatasetKind.Rooms);
			}
		} catch (err: any) {
			console.error("Failed to addDataset" + err);
			return res.status(500).send(err);
		}
		return res.status(200).json({result: true, msg: "file uploaded"});
	}

	public static async defaultUpload(req: any, res: any) {
		const {name} = req.params;
		let dataset;
		try {
			if (name === "courses.zip") {
				console.log("courses being added");
				dataset = fs.readFileSync("src/backend/defaultDatasets/courses.zip").toString("base64");
				await RouteHandlers.facade.addDataset("courses", dataset, InsightDatasetKind.Courses);
			} else {
				dataset = fs.readFileSync("src/backend/defaultDatasets/rooms.zip").toString("base64");
				await RouteHandlers.facade.addDataset("rooms", dataset, InsightDatasetKind.Rooms);
			}

		} catch (err: any) {
			console.error("Failed to addDataset" + err);
			return res.status(500).send(err);
		}
		return res.status(200).json({result: true, msg: "file uploaded"});
	}

	public static async deleteUpload(req: any, res: any) {
		const {name} = req.params;
		const trimmedName = name.slice(0, -4); // remove file extension
		try {
			console.log(trimmedName);
			RouteHandlers.deleteFromUploads();
			await RouteHandlers.facade.removeDataset(trimmedName);
		} catch (err: any) {
			console.error("Failed to remove dataset" + err);
			return res.status(500).send(err);
		}
		console.log("File Deleted");
		return res.status(200).json({result: true, msg: "file deleted"});
	}

	public static async clearData(req: any, res: any) {
		try {
			RouteHandlers.clearDataDirectory();
			fs.removeSync("src/backend/uploads");
		} catch (err: any) {
			console.error("Failed to clear data directory" + err);
			return res.status(500).send(err);
		}
		return res.status(200).json({result: true, msg: "data directory cleared"});
	}

	public static async getDeptList(req: any, res: any) {
		let deptArr;
		try {
			deptArr = await RouteHandlers.facade.performQuery(CourseQueries.deptListQuery());
		} catch (err: any) {
			console.error("Failed to fetch departments from dataset");
			return res.status(500).send(err);
		}
		return res.status(200).json(deptArr);
	}

	public static async getIdList(req: any, res: any) {
		let idArr;
		try {
			idArr = await RouteHandlers.facade.performQuery(CourseQueries.idListQuery(req));
		} catch (err: any) {
			console.error("Failed to fetch course IDS from dataset");
			return res.status(500).send(err);
		}
		return res.status(200).json(idArr);
	}

	public static async getYearList(req: any, res: any) {
		let yearArr;
		try {
			yearArr = await RouteHandlers.facade.performQuery(CourseQueries.yearListQuery(req));
		} catch (err: any) {
			console.error("Failed to fetch year from dataset");
			return res.status(500).send(err);
		}
		return res.status(200).json(yearArr);
	}

	public static async getBoosters(req: any, res: any) {
		let deptArr;
		try {
			deptArr = await RouteHandlers.facade.performQuery(CourseQueries.boostersQuery(req));
		} catch (err: any) {
			console.error("Failed to get GPA boosters");
			return res.status(500).send(err);
		}
		return res.status(200).json(deptArr);
	}

	public static async getDataByCourse(req: any, res: any) {
		const year = Number(req.params.year);
		let dataArr;
		try {
			dataArr = await RouteHandlers.facade.performQuery(CourseQueries.courseDataQuery(req,year));
		} catch (err: any) {
			console.error("Failed to get data by course");
			return res.status(500).send(err);
		}
		console.log(dataArr);
		console.log(req.params.year);
		console.log(req.params.dept);
		console.log(req.params.id);
		return res.status(200).json(dataArr);
	}

	public static async getGradeDistribution(req: any, res: any) {
		let dataArr;
		try {
			dataArr = await RouteHandlers.facade.performQuery(CourseQueries.gradeDistributionQuery(req));
		} catch (err: any) {
			console.error("Failed to get data by course");
			return res.status(500).send(err);
		}

		return res.status(200).json(dataArr);
	}

	private static getContentFromUploads(name: string) {
		return fs.readFileSync(`src/backend/uploads/${name}`).toString("base64");
	}

	private static deleteFromUploads = () => {
		fs.removeSync("src/backend/uploads");
	};

	private static clearDataDirectory = (() => {
		fs.removeSync("./data");
	});

}



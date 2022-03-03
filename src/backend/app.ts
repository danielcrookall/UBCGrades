import InsightFacade from "../controller/InsightFacade";
import {InsightDatasetKind} from "../controller/IInsightFacade";

import * as fs from "fs-extra";

const express = require("express");
const fileUpload = require("express-fileupload");
const app = express();
const cors = require("cors");
const port = 5000;
app.use(cors());
app.use(fileUpload({
	createParentPath: true
}));

const facade = new InsightFacade();

app.post("/upload", async (req: any, res: any) => {

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

	const dataset = getContentFromUploads(`${file.name}`);
	try {
		if (file.name === "courses.zip") {
			await facade.addDataset("courses", dataset, InsightDatasetKind.Courses);
		} else {
			await facade.addDataset("rooms", dataset, InsightDatasetKind.Rooms);
		}
	} catch (err: any) {
		console.error("Failed to addDataset" + err);
		return res.status(500).send(err);
	}
	return res.status(200).json({result: true, msg: "file uploaded"});
});

app.put("/defaultUpload/:name", async (req: any, res: any) => {

	const {name} = req.params;
	let dataset;
	try {
		if (name === "courses.zip") {
			console.log("courses being added");
			dataset = fs.readFileSync("src/backend/defaultDatasets/courses.zip").toString("base64");
			await facade.addDataset("courses", dataset, InsightDatasetKind.Courses);
		} else {
			dataset = fs.readFileSync("src/backend/defaultDatasets/rooms.zip").toString("base64");
			await facade.addDataset("rooms", dataset, InsightDatasetKind.Rooms);
		}

	} catch (err: any) {
		console.error("Failed to addDataset" + err);
		return res.status(500).send(err);
	}
	return res.status(200).json({result: true, msg: "file uploaded"});
});

app.delete("/upload/:name", async (req: any, res: any) => {
	const {name} = req.params;
	const trimmedName = name.slice(0, -4); // remove file extension
	try {
		console.log(trimmedName);
		deleteFromUploads(name);
		await facade.removeDataset(trimmedName);
	} catch (err: any) {
		console.error("Failed to remove dataset" + err);
		return res.status(500).send(err);
	}
	console.log("File Deleted");
	return res.status(200).json({result: true, msg: "file deleted"});
});

app.delete("/clearData", (req: any, res: any) => {

	try {
		clearDataDirectory();
		fs.removeSync("src/backend/uploads");
	} catch (err: any) {
		console.error("Failed to clear data directory" + err);
		return res.status(500).send(err);
	}
	return res.status(200).json({result: true, msg: "data directory cleared"});

});

app.get("/deptList", async (req: any, res: any) => {
	let deptArr;
	try {
		deptArr = await facade.performQuery({
			WHERE: {}
			,
			OPTIONS: {
				COLUMNS: [
					"courses_dept"
				],
				ORDER: {
					dir: "UP",
					keys: [
						"courses_dept"
					]
				}
			},
			TRANSFORMATIONS: {
				GROUP: [
					"courses_dept"
				],
				APPLY: []
			}
		}
		);
	} catch (err: any) {
		console.error("Failed to fetch departments from dataset");
		return res.status(500).send(err);
	}
	return res.status(200).json(deptArr);
});

app.get("/boosters/:dept", async (req: any, res: any) => {

	let deptArr;
	try {
		deptArr = await facade.performQuery({
			WHERE: {
				IS: {
					courses_dept: `${req.params.dept}`
				}
			},
			OPTIONS: {
				COLUMNS: [
					"courses_dept",
					"courses_id",
					"avg"
				],
				ORDER: {
					dir: "DOWN",
					keys: [
						"avg"
					]
				}
			},
			TRANSFORMATIONS: {
				GROUP: [
					"courses_dept",
					"courses_id"
				],
				APPLY: [
					{
						avg: {
							AVG: "courses_avg"
						}
					}
				]
			}
		}

		);
	} catch (err: any) {
		console.error("Failed to get GPA boosters");
		return res.status(500).send(err);
	}
	return res.status(200).json(deptArr);

});

app.listen(port, () => {
	console.log(`App listening on port ${port}`);
});


const getContentFromUploads = (name: string): string => {
	return fs.readFileSync(`src/backend/uploads/${name}`).toString("base64");
};

const deleteFromUploads = (fileName: string) => {
	fs.removeSync("src/backend/uploads");
};

const clearDataDirectory = (() => {
	fs.removeSync("./data");
});

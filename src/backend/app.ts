import InsightFacade from "../controller/InsightFacade";
import {InsightDatasetKind} from "../controller/IInsightFacade";

import * as fs from "fs-extra";
import RouteHandlers from "./RouteHandlers";

const express = require("express");
const fileUpload = require("express-fileupload");
const app = express();
const cors = require("cors");
const port = 5000;
app.use(cors());
app.use(fileUpload({
	createParentPath: true
}));


app.post("/upload", RouteHandlers.upload);
app.put("/defaultUpload/:name", RouteHandlers.defaultUpload);
app.delete("/upload/:name", RouteHandlers.deleteUpload);
app.delete("/clearData", RouteHandlers.clearData);
app.get("/deptList", RouteHandlers.getDeptList);
app.get("/idList/:dept", RouteHandlers.getIdList);
app.get("/yearList/:dept/:id", RouteHandlers.getYearList);
app.get("/boosters/:dept", RouteHandlers.getBoosters);
app.get("/dataByCourse/:dept/:id/:year", RouteHandlers.getDataByCourse);
app.get("/gradeDistribution/:dept/:id", RouteHandlers.getGradeDistribution);


app.listen(port, () => {
	console.log(`App listening on port ${port}`);
});



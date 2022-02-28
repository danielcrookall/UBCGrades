
const express = require('express');
const fileUpload = require("express-fileupload");
const app = express()
const cors = require('cors');
// const InsightFacade = require("../src/controller/InsightFacade");


// const InsightFacade = require("../src/controller/InsightFacade");
// const {getContentFromArchives} = require("../test/TestUtil");
// const {InsightDatasetKind} = require("../src/controller/IInsightFacade");
const port = 5000
app.use(cors());
app.use(fileUpload());

// const facade = new InsightFacade();

//test
app.post('/upload', async (req, res) => {
	if(req.files === null){
		return res.status(400).json({msg: 'No file uploaded'});
	}
	const file = req.files.file;
	// const dataset = getContentFromArchives(`${file.name}`);
	// await facade.addDataset("rooms", dataset, InsightDatasetKind.Rooms);
	file.mv(`./backend/uploads/${file.name}`, err => {
		if(err){
			console.error(`Error moving file ${err}`)
			return res.status(500).send(err);
		}
	});

	return res.status(200).json({result: true, msg: "file uploaded"});

});

app.delete('/upload/:name', (req,res) => {
	console.log("File Deleted")
	console.log(req.params)
	return res.status(200).json({result: true, msg: "file deleted"});
})

app.listen(port, () => {
	console.log(`App listening on port ${port}`)
})

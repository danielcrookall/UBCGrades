import {useState, useEffect} from "react";
import FileUpload from "./components/FileUpload/FileUpload";
import "./App.css"
import FileList from "./components/FileList/FileList";
import axios from "axios";

function App() {
	const [files, setFiles] = useState([]);

	useEffect(() => {
		axios.delete("/clearData")
			.then()
			.catch((err) => console.error("Failed to clear directory" + err))
	},[]);


	const removeFile = (filename) => {
		setFiles(files.filter(file => file.name !== filename))
	}

	return (
    <div className="App">
		<div className="title-container">
			<h1 className="title"> InsightUBC </h1>
		</div>

		<p className="upload-title"> Upload File </p>
	  <FileUpload files = {files} setFiles = {setFiles} removeFile = {removeFile} />
		<FileList files = {files} removeFile = {removeFile}/>
    </div>
  );
}

export default App;

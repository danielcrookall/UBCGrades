import {useState} from "react";
import FileUpload from "./components/FileUpload/FileUpload";
import "./App.css"
import FileList from "./components/FileList/FileList";

function App() {
	const [files, setFiles] = useState([]);

	console.log(files);

	const removeFile = (filename) => {
		setFiles(files.filter(file => file.name !== filename))
	}

	return (
    <div className="App">
		<p className="title"> Upload File </p>
	  <FileUpload files = {files} setFiles = {setFiles} removeFile = {removeFile} />
		<FileList files = {files} removeFile = {removeFile}/>
    </div>
  );
}

export default App;

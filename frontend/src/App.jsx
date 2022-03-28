import React, {useState, useEffect} from "react";
import FileUpload from "./components/FileUpload/FileUpload";
import "./App.css"
import FileList from "./components/FileList/FileList";
import axios from "axios";
import {DataTable} from "./components/DataTable/DataTable";
import {DeptSearch} from "./components/DeptSearch/DeptSearch";

function App() {
	const [files, setFiles] = useState([]);
	const [deptList, setDeptList] = useState([]);

	useEffect(() => {
		axios.delete("/clearData")
			.then()
			.catch((err) => console.error("Failed to clear directory" + err))
	}, []);


	const removeFile = (filename) => {
		setFiles(files.filter(file => file.name !== filename))
		if(filename === "courses.zip") {
			setDeptList((deptList) => deptList = []);
		}
	}

	return (
		<div className="App">

			<header className="header">
				<h1 className="title"> InsightUBC </h1>
			</header>
			<main className="main">

				<aside className="aside-1">


					<p className="upload-title"> Upload File </p>
					<FileUpload files={files} setFiles={setFiles} removeFile={removeFile} deptList={deptList}
					setDeptList={setDeptList}/>
					<FileList files={files} removeFile={removeFile}/>
				</aside>

				<article className="article">
					<div className="table-title">Averages by Course</div>
					<div className="article-container">
					<DeptSearch deptList={deptList} setDeptList ={setDeptList}  />
					</div>
				</article>

				{/*<aside className="aside-2">*/}

				{/*</aside>*/}


			</main>
			<footer className="footer"></footer>


		</div>
	);
}

export default App;

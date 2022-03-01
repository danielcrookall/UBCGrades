import React from 'react'
import FileItem from "../FileItem/FileItem";
import axios from "axios";


const FileList = ({files, removeFile}) => {
	const deleteFileHandler = (name) => {
		axios.delete(`/upload/${name}`)
			.then((res) => removeFile(name))
			.catch((err) => console.error("Failed to delete" + err))
	}


	return (
		<ul className="file-list">
			{
				files && files.map((file,index) => <FileItem key = {index} file = {file} deleteFile = {deleteFileHandler}/>)
			}


		</ul>
	)
}

export default FileList;

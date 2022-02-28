import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import React from 'react'
import {faPlus} from "@fortawesome/free-solid-svg-icons";
import './FileUpload.css'
import axios from "axios";


const FileUpload = ({files, setFiles, removeFile}) => {
	const uploadHandler = (event) => {
		const file = event.target.files[0];
		file.isUploading = true;
		setFiles([...files, file])
		const formData = new FormData();
		formData.append(
			'file',
			file,
			file.name
		);

		axios.post('/upload', formData)
			.then((res) => {
				file.isUploading = false;
				setFiles([...files, file])
			})
			.catch((err) => {
				console.error(`Failed to upload ${err}`);
				removeFile(file.name);
			})


	}

	return (
		<div>
			<div className="upload-card">
				<div className="file-inputs">
					<input type="file" className="upload-box" onChange={uploadHandler}/>
					<button className="upload-button">
						<i className = "upload-icon">
							<FontAwesomeIcon icon={faPlus}/>
						</i>
						Upload
					</button>
				</div>
				<p className="main"> Upload a courses or rooms zip file</p>
			</div>

		</div>
	)
}

export default FileUpload

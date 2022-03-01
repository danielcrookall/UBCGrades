import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import React from 'react'
import {faPlus} from "@fortawesome/free-solid-svg-icons";
import './FileUpload.css'
import axios from "axios";


const FileUpload = ({files, setFiles, removeFile}) => {

	const uploadHandler = (event) => {

		const file = event.target.files[0];

		if (isDuplicate(file)) {
			alert("You can't upload duplicate files");
		} else {
			console.log(files);
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
					event.target.value = '' //necessary so user can upload the same file twice in a row if they want.
				})
				.catch((err) => {
					console.error(`Failed to upload ${err}`);
					removeFile(file.name);
				})
		}
	}

	const isDuplicate = (file) => {
		for (let fileObj of files) {
			if (fileObj.name === file.name) {
				return true;
			}
		}
		return false;
	}


	const defaultUploadHandler = (event) => {
		const file = {};
		console.log(event.target.className)
		if (event.target.className === "default-courses-button") {
			file.name = "courses.zip";
		} else {
			file.name = "rooms.zip";
		}


		if (isDuplicate(file)) {
			alert("You can't upload duplicate files");
		} else {
			file.isUploading = true;
			setFiles([...files, file])
			axios.put(`/defaultUpload/${file.name}`).then((res) => {
				file.isUploading = false;
				setFiles([...files, file])
			})
				.catch((err) => {
					console.error(`Failed to upload ${err}`);
					removeFile(file.name);
				})
		}
	}


	return (
		<div>
			<div className="upload-card">
				<div className="file-inputs">
					<input type="file" className="upload-box" onChange={uploadHandler}/>
					<button className="upload-button">
						<i className="upload-icon">
							<FontAwesomeIcon icon={faPlus}/>
						</i>
						Choose File
					</button>
				</div>
				<p className="main"> Upload a courses or rooms zip file.</p>
				<p className="main"> Or select a default dataset below. </p>
				<div className="buttons">
				<button onClick={defaultUploadHandler} className="default-courses-button">
					courses.zip
				</button>
				<button onClick={defaultUploadHandler} className="default-rooms-button">
					rooms.zip
				</button>
					</div>
			</div>

		</div>
	)
}

export default FileUpload

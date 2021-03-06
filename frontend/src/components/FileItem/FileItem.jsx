import React from 'react'
import "./FileItem.css";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faFileAlt, faSpinner, faTrash} from "@fortawesome/free-solid-svg-icons";


const FileItem = ({file, deleteFile}) => {
	return (
		<li className="file-item"
			key={file.name}>

			<div className="icon">
				<FontAwesomeIcon icon={faFileAlt}/>
			</div>

			<p className="file-name">{file.name}</p>
			<div className="actions">
				{file.isUploading &&
				<FontAwesomeIcon
					icon={faSpinner} className="fa-spin"/>
				}
				{!file.isUploading &&
				<FontAwesomeIcon
					icon={faTrash} className="fa-trash"
					onClick={() => deleteFile(file.name)}/>
				}
			</div>


		</li>
	)
}

export default FileItem;

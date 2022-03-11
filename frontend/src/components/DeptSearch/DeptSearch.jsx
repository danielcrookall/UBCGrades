import React, {useState} from "react";
import {DataTable} from "../DataTable/DataTable";
import axios from "axios";
import "./DeptSearch.css"

export const DeptSearch = ({deptList, setDeptList}) => {


	const getDepts = () => deptList.map((dept, index) => {
		return <option key={index}> {dept}</option>
	})

	const getYears = () => yearList.map((year, index) => {
		return <option key={index}> {year.courses_year}</option>
	})

	const getIDs = () => idList.map((id, index) => {
		return <option key={index}> {`${id.courses_id}- ${id.courses_title} `}</option>
	})

	const [dept, setDept] = useState();
	const [id, setID] = useState();
	const [year, setYear] = useState();

	const [idList, setIdList] = useState([]);
	const [yearList, setYearList] = useState([]);


	const [dataByCourse, setDataByCourse] = useState();


	// const getAverageByDept = () => {
	// 	axios.get(`/boosters/${dept}`)
	// 		.then((res) => {
	// 			// console.log(res)
	// 			setGradesData(res.data);
	// 			console.log(gradesData);
	// 		})
	//
	// }

	const getDataByCourse = () => {
		const idNoTitle = id.substr(0, id.indexOf('-'));
		axios.get(`/dataByCourse/${dept}/${idNoTitle}/${year}`)
			.then((res) => {
				setDataByCourse(res.data);
			})
	}


	const handleDept = (event) => {
		setDept((deptQuery) => {
			return (deptQuery = event.target.value);
		})
		updateIDList(event.target.value);

	}

	const updateIDList = (dept) => {
		axios.get(`/idList/${dept}`)
			.then((res) => {
				setIdList(res.data);
			})


	}

	const handleID = (event) => {
		setID((selecteID) => {
			return (selecteID = event.target.value);
		})
		updateYearList(dept, id)
	}

	const handleYear = (event) => {
		setYear((year) => {
			return (year = event.target.value);
		})
	}

	const updateYearList = (dept, id) => {
		const IdNoTitle = id.substr(0, id.indexOf('-'));
		axios.get(`/yearList/${dept}/${IdNoTitle}`)
			.then((res) => {
				setYearList(res.data);
			})
	}


	const clearInput = (event) => {
		event.target.value = ''
		getDepts()
		getIDs()
		getYears()
	}


	return (
		<div>
			<div className="flexbox-container">
				<div className="dept-container">
					<p>Enter department</p>
					<input type="text" list="dept" onInput={handleDept} onClick={clearInput}/>
					<datalist id="dept">
						{getDepts()}
					</datalist>
				</div>

				<div className="course-ID-container">
					<p>Enter course ID</p>
					<input type="text" list="courseID" onInput={handleID} onClick={clearInput}/>
					<datalist id="courseID">
						{getIDs()}
					</datalist>
				</div>

				<div className="course_year-container">
					<p>Enter year</p>
					<input type="text" list="year" onInput={handleYear} onClick={clearInput}/>
					<datalist id="year">
						{getYears()}
					</datalist>
				</div>
				<div className="submit-button">
					<button className="submit-button" onClick={getDataByCourse}>
						submit
					</button>
				</div>
			</div>
			<DataTable data={dataByCourse} dept={dept} id={id} year={year} />
		</div>
	)
}

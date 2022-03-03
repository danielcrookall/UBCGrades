import React, {useState} from "react";
import {DataTable} from "../DataTable/DataTable";
import axios from "axios";

export const DeptSearch = ({deptList, setData}) => {


const getDepts = () => deptList.map((dept, index) => {
		return <option key={index}> {dept}</option>
	})

	const [deptQuery, setDeptQuery] = useState();

	const [gradesData, setGradesData] = useState();



	const getAverageByDept = ()=> {
		console.log(deptQuery)
		axios.get(`/boosters/${deptQuery}`)
			.then((res) => {
				// console.log(res)
				setGradesData(res.data);
				console.log(gradesData);
			})

	}


	const handleDept = (event) => {
		setDeptQuery((deptQuery) => {
			return (deptQuery = event.target.value);
		})


	}


	return (
		<div>
			<div>
				<p>Enter your department</p>
				<button onClick={getAverageByDept}>
					submit
				</button>
				<input type="text" list="dept" onBlur={handleDept} />
				<datalist id ="dept">
					{getDepts()}
				</datalist>
				<DataTable data= {gradesData} selectedDept = {deptQuery}/>

			</div>
		</div>
	)
}

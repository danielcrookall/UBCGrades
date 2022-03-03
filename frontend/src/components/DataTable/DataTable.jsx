import React, {useState} from 'react'
import "./DataTable.css"
import {DeptSearch} from "../DeptSearch/DeptSearch";
import axios from "axios";

export const DataTable = ({data, selectedDept}) => {

	const renderTableData = () => {
		if(data !== undefined){
			return data.map((course) => {
			const {courses_dept, courses_id, avg} = course
			return (
				<tr key={courses_id}>
					<td>{courses_dept.toUpperCase()}</td>
					<td>{courses_id}</td>
					<td>{avg}</td>
				</tr>
			)
		})}
	}

	const renderTableHeader = () => {
		if(data !== undefined && selectedDept !== undefined) {
			let header = Object.keys(data[0])
			return header.map((key, index) => {
				return <th key={index}>{trimId(key.toUpperCase())}</th>
			})
		}
	}

	const trimId = ((str) => {
		let trimmedStr = (str.slice(str.indexOf("_") + 1)); // find the first underscore and return everything after
		return trimmedStr;
	})



	return (
		<div>
			<h1 id='title'>Courses with the highest average in {selectedDept && selectedDept.toUpperCase()}</h1>
			<table id='courses'>
				<tbody>
				{renderTableHeader()}
				{renderTableData()}
				</tbody>
			</table>



		</div>
	)
}

import React, {useState} from 'react'
import "./DataTable.css"
import {GradesLineChart} from "../charts/GradesLineChart";

export const DataTable = ({data, dept, id, year}) => {

	const renderTableData = () => {
		if(data !== undefined){
			return data.map((course) => {
			const {courses_dept, courses_id, courses_year, TotalPass, TotalFail, TotalAudit, OverallAvg, HighestAvg, LowestAvg} = course
			return (
				<tr key={courses_dept}>
					<td>{courses_dept.toUpperCase()}</td>
					<td>{courses_id}</td>
					<td>{courses_year}</td>
					<td>{TotalPass}</td>
					<td>{TotalFail}</td>
					<td>{TotalAudit}</td>
					<td>{OverallAvg}</td>
					<td>{HighestAvg}</td>
					<td>{LowestAvg}</td>

				</tr>
			)
		})}
	}

	const renderTableHeader = () => {
		if(data !== undefined && dept !== undefined) {
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
			<div className="container">

			<table className="courses-table" id='courses-table'>
				<thead>
				{ data && <th>Dept</th>}
				{ data && <th>ID</th>}
				{ data && <th>Year</th>}
				{ data && <th>Total Pass</th>}
				{ data && <th>Total Fail</th>}
				{ data && <th>Total Audit</th>}
				{ data && <th>Average over all sections</th>}
				{ data && <th>Highest average over all sections</th>}
				{ data && <th>Lowest average over all sections</th>}
				</thead>
				<tbody>
				{renderTableData()}
				</tbody>
			</table>
		</div>
			{data && <GradesLineChart dept={dept} id={id} year={year} />}

		</div>
	)
}

import React, {useEffect, useState} from 'react'
import {Line} from "react-chartjs-2"
import axios from "axios";
import {
	CategoryScale,
	Chart as ChartJS,
	Legend,
	LinearScale,
	LineElement,
	PointElement,
	Title,
	Tooltip
} from "chart.js";
import "./GradesLineChart.css"

export const GradesLineChart = ({dept, id, year}) => {

	const [chartData, setChartData] = useState();


	ChartJS.register(
		CategoryScale,
		LinearScale,
		LineElement,
		PointElement,
		Title,
		Tooltip
	)

	const options = {
		responsive: true,
		plugins: {
			legend: {
				position: 'top',
			},
			title: {
				display: true,
				text: `${dept.toUpperCase()}${id} Overall Average by Year`
			},
			scales: {
				y: {
					title: {
						display: true,
						text: 'yTitle'
					}
				}

		}
	}};



	ChartJS.defaults.font = {
		family: 'Arial',
		size: 18,
	}

	const chart = () => {
		let sectionYears = [];
		let avgByYear = [];
		const idNoTitle = id.substr(0, id.indexOf('-'));
		axios.get(`/gradeDistribution/${dept}/${idNoTitle}`)
			.then((res) => {
				console.log(res.data);
				for (const dataObj of res.data) {
					sectionYears.push(dataObj.courses_year);
					avgByYear.push(dataObj.OverallAvg);
				}
				// console.log(sectionYears, avgByYear)
				setChartData({
					labels: sectionYears,
					datasets: [{
						data: avgByYear,
						fill: false,
						borderColor: 'black',
						tension: 0.1,
						backgroundColor: "red",
						pointHitRadius: 30

					}]
				})
			})
	}

	useEffect(() => {
		chart();
	}, [dept,id,year])

	return (
		<div className="chart-container" >
			<div className="chart">
			{chartData &&<Line options={options} type={"line"} data={chartData}/>}
			</div>
		</div>
	)
}

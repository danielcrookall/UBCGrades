import {Request} from "express";

export default class CourseQueries {

	public static courseDataQuery(req: Request, year: number) {
		return {
			WHERE: {
				AND: [{
					IS: {
						courses_dept: `${req.params.dept}`
					}
				}, {
					EQ: {
						courses_year: year
					}
				}, {
					IS: {
						courses_id: `${req.params.id}`
					}
				}
				]
			},
			OPTIONS: {
				COLUMNS: [
					"courses_dept", "courses_id", "courses_year", "TotalPass", "TotalFail", "TotalAudit", "OverallAvg",
					"HighestAvg", "LowestAvg"
				],
				ORDER: {
					dir: "UP", keys: ["courses_id"]
				}},
			TRANSFORMATIONS: {
				GROUP: [
					"courses_id", "courses_dept", "courses_year"
				], APPLY: [{
					TotalPass: {
						SUM: "courses_pass"
					}}, {
					TotalFail: {
						SUM: "courses_fail"
					}}, {
					TotalAudit: {
						SUM: "courses_audit"
					}}, {
					LowestAvg: {
						MIN: "courses_avg"
					}}, {
					HighestAvg: {
						MAX: "courses_avg"
					}}, {
					OverallAvg: {
						AVG: "courses_avg"
					}}]}
		};
	}

	public static gradeDistributionQuery(req: Request) {
		return {
			WHERE: {
				AND: [
					{
						IS: {
							courses_dept: `${req.params.dept}`
						}
					},
					{
						IS: {
							courses_id: `${req.params.id}`
						}
					}
				]
			},
			OPTIONS: {
				COLUMNS: [
					"courses_dept",
					"courses_id",
					"courses_year",
					"OverallAvg"
				],
				ORDER: {
					dir: "UP",
					keys: [
						"courses_year"
					]
				}
			},
			TRANSFORMATIONS: {
				GROUP: [
					"courses_id",
					"courses_dept",
					"courses_year"
				],
				APPLY: [
					{
						OverallAvg: {
							AVG: "courses_avg"
						}
					}
				]
			}
		};
	}

	public static deptListQuery() {
		return {
			WHERE: {}
			,
			OPTIONS: {
				COLUMNS: [
					"courses_dept"
				],
				ORDER: {
					dir: "UP",
					keys: [
						"courses_dept"
					]
				}
			},
			TRANSFORMATIONS: {
				GROUP: [
					"courses_dept"
				],
				APPLY: []
			}
		};
	}

	public static idListQuery(req: Request) {
		return {
			WHERE: {
				IS: {
					courses_dept: `${req.params.dept}`
				}
			},
			OPTIONS: {
				COLUMNS: [
					"courses_dept",
					"courses_id",
					"courses_title"
				],
				ORDER: {
					dir: "UP",
					keys: [
						"courses_id"
					]
				}
			},
			TRANSFORMATIONS: {
				GROUP: [
					"courses_dept",
					"courses_id",
					"courses_title"
				],
				APPLY: []
			}
		};

	}

	public static yearListQuery(req: Request) {
		return {
			WHERE: {
				AND: [
					{
						IS: {
							courses_dept: `${req.params.dept}`
						}
					},
					{
						IS: {
							courses_id: `${req.params.id}`
						}
					}
				]
			},
			OPTIONS: {
				COLUMNS: [
					"courses_year"
				],
				ORDER: {
					dir: "UP",
					keys: [
						"courses_year"
					]
				}
			},
			TRANSFORMATIONS: {
				GROUP: [
					"courses_dept",
					"courses_id",
					"courses_year"
				],
				APPLY: []
			}
		};
	}

	public static boostersQuery(req: Request) {
		return {
			WHERE: {
				IS: {
					courses_dept: `${req.params.dept}`
				}
			},
			OPTIONS: {
				COLUMNS: [
					"courses_dept",
					"courses_id",
					"avg"
				],
				ORDER: {
					dir: "DOWN",
					keys: [
						"avg"
					]
				}
			},
			TRANSFORMATIONS: {
				GROUP: [
					"courses_dept",
					"courses_id"
				],
				APPLY: [
					{
						avg: {
							AVG: "courses_avg"
						}
					}
				]
			}
		};

	}
}

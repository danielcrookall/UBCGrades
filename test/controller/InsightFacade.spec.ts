import {
	IInsightFacade,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";
import {expect} from "chai";
import {clearDisk, getContentFromArchives} from "../TestUtil";
import {folderTest} from "@ubccpsc310/folder-test";


describe("InsightFacade", function () {
	let courses: string;
	let oneCourse: string;
	let invalidJSONCourses: string;
	let notZip: string;
	let noCourseDirectory: string;
	let coursesWithMissingAttribute: string;
	let invalidJsonOneSection: string;
	let invalidAndValidJson: string;
	let empty: string;
	let course1SectionAVGGT98YearLT1985: string;
	let rooms: string;
	let noRoomsDirectory: string;
	let test: string;

	before(function () {
		courses = getContentFromArchives("courses.zip");
		invalidJSONCourses = getContentFromArchives("invalidJSONCourses.zip");
		notZip = getContentFromArchives("notZip.json");
		noCourseDirectory = getContentFromArchives("noCourseDirectory.zip");
		oneCourse = getContentFromArchives("1course.zip");
		coursesWithMissingAttribute = getContentFromArchives("1courseSectionWithNoProf.zip");
		invalidJsonOneSection = getContentFromArchives("invalidJSon1Section.zip");
		invalidAndValidJson = getContentFromArchives("invalidAndValidJSON.zip");
		empty = getContentFromArchives("empty.zip");
		course1SectionAVGGT98YearLT1985 = getContentFromArchives("courseWith1SectionAVGGT98YEARLT1985.zip");
		rooms = getContentFromArchives("rooms.zip");
		noRoomsDirectory = getContentFromArchives("noRoomsDirectory.zip");
		test = getContentFromArchives("test.zip");
	});

	describe("List Datasets", function () {
		let facade: IInsightFacade;

		beforeEach(function () {
			clearDisk();
			facade = new InsightFacade();

		});

		it("should list no datasets", function () {
			return facade.listDatasets().then((insightDatasets) => {
				expect(insightDatasets).to.be.an.instanceof(Array);
				expect(insightDatasets).to.have.length(0);

			});

		});

		it("should list one dataset", function () {

			return facade.addDataset("courses", courses, InsightDatasetKind.Courses)
				.then((addedIDs) => facade.listDatasets())
				.then((insightDatasets) => {
					expect(insightDatasets).to.deep.equal([{
						id: "courses",
						kind: InsightDatasetKind.Courses,
						numRows: 64612,
					}]);

				});
		});

		it("should list multiple datasets", function () {
			return facade.addDataset("courses", courses, InsightDatasetKind.Courses)
				.then(() => {
					return facade.addDataset("courses-2", courses, InsightDatasetKind.Courses);
				})
				.then(() => {
					return facade.listDatasets();
				})
				.then((insightDatasets) => {
					expect(insightDatasets).to.be.an.instanceof(Array);
					expect(insightDatasets).to.have.length(2);
					const insightDatasetCourses = insightDatasets.find((dataset) => dataset.id === "courses");
					expect(insightDatasetCourses).to.exist;
					expect(insightDatasetCourses).to.deep.equal({
						id: "courses",
						kind: InsightDatasetKind.Courses,
						numRows: 64612,
					});

				});

		});


	});

	describe("addDataset", function () {
		let facade: IInsightFacade;

		beforeEach(function () {
			clearDisk();
			facade = new InsightFacade();

		});

		it("should resolve if one dataset is added and id is valid", async function () {
			const addedIds = await facade.addDataset("courses", courses, InsightDatasetKind.Courses);
			expect(addedIds).to.deep.equal(["courses"]);
		});

		it("should resolve if AND dataset is added", async function () {
			const addedIds = await facade.addDataset("ANDDataset", course1SectionAVGGT98YearLT1985,
				InsightDatasetKind.Courses);
			expect(addedIds).to.deep.equal(["ANDDataset"]);
		});

		it("should resolve if one dataset with 1 course is added and id is valid", async function () {
			const addedIds = await facade.addDataset("courses", oneCourse, InsightDatasetKind.Courses);
			expect(addedIds).to.deep.equal(["courses"]);
		});

		it("should resolve if 2 valid datasets are added", async function () {
			const addedId = await facade.addDataset("courses", oneCourse, InsightDatasetKind.Courses);
			expect(addedId).to.deep.equal(["courses"]);
			const addedIds = await facade.addDataset("courses2.0", invalidAndValidJson, InsightDatasetKind.Courses);
			expect(addedIds).to.deep.equal(["courses", "courses2.0"]);
		});

		it("should resolve if an invalid section missing an attribute is added", async function () {
			const addedIds =
				await facade.addDataset("courses", coursesWithMissingAttribute, InsightDatasetKind.Courses);
			expect(addedIds).to.deep.equal(["courses"]);
		});

		it("should reject if id contains an underscore", async function () {
			try {
				await facade.addDataset("courses_", courses, InsightDatasetKind.Courses);
				expect.fail("Should have rejected!");
			} catch (err) {
				expect(err).to.be.an.instanceof(InsightError);
			}

		});

		it("should reject if id is only whitespace characters", async function () {
			try {
				await facade.addDataset(" ", courses, InsightDatasetKind.Courses);
				expect.fail("Should have rejected!");
			} catch (err) {
				expect(err).to.be.an.instanceof(InsightError);
			}
		});

		it("should reject if id is the same as an already added dataset", async function () {
			try {
				await facade.addDataset("courses", courses, InsightDatasetKind.Courses);
				await facade.addDataset("courses", courses, InsightDatasetKind.Courses);
				expect.fail("Should have rejected!");
			} catch (err) {
				expect(err).to.be.an.instanceof(InsightError);
			}
		});


		it("should reject when a dataset added has invalid JSON and only one course file", async function () {
			try {
				await facade.addDataset("courses", invalidJSONCourses, InsightDatasetKind.Courses);
				expect.fail("Should have rejected!");
			} catch (err) {
				expect(err).to.be.an.instanceof(InsightError);
			}


		});

		it("should skip over a dataset added that has invalid JSON in 1 course section but include the other course" +
			" with valid json", async function () {
			const addedIds = await facade.addDataset("courses", invalidAndValidJson, InsightDatasetKind.Courses);
			expect(addedIds).to.deep.equal(["courses"]);

		});

		it("should reject if the file being added is not a zip file", async function () {
			try {
				await facade.addDataset("courses", notZip, InsightDatasetKind.Courses);
				expect.fail("Should have rejected!");
			} catch (err) {
				expect(err).to.be.an.instanceof(InsightError);
			}
		});

		it("should reject if the file being added does not contain directory courses", async function () {
			try {
				await facade.addDataset("courses", noCourseDirectory, InsightDatasetKind.Courses);
				expect.fail("Should have rejected!");
			} catch (err) {
				expect(err).to.be.an.instanceof(InsightError);
			}
		});

		it("should reject if the dataset being added has no data", async function () {
			try {
				await facade.addDataset("courses", empty, InsightDatasetKind.Courses);
				expect.fail("Should have rejected!");
			} catch (err) {
				expect(err).to.be.an.instanceof(InsightError);
			}
		});

		it("should reject if rooms dataset has no rooms directory", async function () {
			try {
				await facade.addDataset("rooms", noRoomsDirectory, InsightDatasetKind.Rooms);
				expect.fail("Should have rejected!");
			} catch (err) {
				expect(err).to.be.an.instanceof(InsightError);
			}
		});

		it("should resolve if one valid rooms dataset is added and id is valid", async function () {
			const addedIds = await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
			expect(addedIds).to.deep.equal(["rooms"]);
		});

	});

	describe("removeDataset", function () {
		let facade: IInsightFacade;

		beforeEach(function () {
			clearDisk();
			facade = new InsightFacade();

		});

		it("should fulfill upon a successful removal of one dataset", async function () {
			await facade.addDataset("courses", courses, InsightDatasetKind.Courses);
			const removedId = await facade.removeDataset("courses");
			expect(removedId).to.be.a("string");
			expect(removedId).to.deep.equal("courses");
			const addedDatasets = await facade.listDatasets();
			expect(addedDatasets).to.be.an.instanceof(Array);
			expect(addedDatasets).to.have.length(0);
		});

		it("should fulfill upon a successful removal of one dataset when 2 datasets have been added",
			async function () {
				await facade.addDataset("courses", courses, InsightDatasetKind.Courses);
				await facade.addDataset("courses2", course1SectionAVGGT98YearLT1985, InsightDatasetKind.Courses);
				const removedId = await facade.removeDataset("courses");
				expect(removedId).to.be.a("string");
				expect(removedId).to.deep.equal("courses");
				const addedDatasets = await facade.listDatasets();
				expect(addedDatasets).to.be.an.instanceof(Array);
				expect(addedDatasets).to.have.length(1);
			});

		it("should reject removal if ID is invalid because it contains an underscore", async function () {
			try {
				await facade.removeDataset("cour_ses");
				expect.fail("Should have rejected!");
			} catch (err) {
				expect(err).to.be.an.instanceof(InsightError);
			}

		});

		it("should reject removal if ID is invalid because it contains only whitespace", async function () {
			try {
				await facade.removeDataset("  ");
				expect.fail("Should have rejected!");
			} catch (err) {
				expect(err).to.be.an.instanceof(InsightError);
			}

		});


		it("should reject removal if ID is valid but has not yet been added", async function () {
			try {
				await facade.removeDataset("courses3");
				expect.fail("Should have rejected!");
			} catch (err) {
				expect(err).to.be.an.instanceof(NotFoundError);
			}

		});


	});

	describe("performQuery", function () {
		let facade: IInsightFacade;

		before(async function () {
			clearDisk();
			facade = new InsightFacade();

			await facade.addDataset("courses", courses, InsightDatasetKind.Courses);

		});

		type Error = "InsightError" | "ResultTooLargeError";
		folderTest<unknown, Promise<InsightResult[]>, Error>(
			"Add Dynamic Test",
			(input: unknown): Promise<InsightResult[]> => facade.performQuery(input),
			"./test/resources/queries/singleQuery",
			{
				errorValidator(error: any): error is Error {
					return error === "InsightError" || error === "ResultTooLargeError";
				},
				assertOnResult(actual: any, expected: any[]) {
					expect(actual).to.be.an.instanceof(Array);
					// console.log(expected);
					expect(actual).to.have.length(expected.length);
					expect(actual).to.have.deep.members(expected);
				},
				assertOnError(actual: any, expected: Error) {
					if (expected === "InsightError") {
						expect(actual).to.be.an.instanceof(InsightError);
					} else if (expected === "ResultTooLargeError") {
						expect(actual).to.be.an.instanceof(ResultTooLargeError);
					}
				}
			}
		);
	});

});

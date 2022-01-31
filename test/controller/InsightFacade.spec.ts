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
	let invalidJSONCourses: string;
	let notZip: string;
	let noCourseDirectory: string;

	before(function () {
		courses = getContentFromArchives("courses.zip");
		invalidJSONCourses = getContentFromArchives("invalidJSONCourses.zip");
		notZip = getContentFromArchives("notZip.json");
		noCourseDirectory = getContentFromArchives("noCourseDirectory.zip");
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

		it("should skip over a dataset added that has invalid JSON ", async function () {
			const addedIds = await facade.addDataset("courses", invalidJSONCourses, InsightDatasetKind.Courses);
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
			"./test/resources/queries",
			{
				errorValidator(error: any): error is Error {
					return error === "InsightError" || error === "ResultTooLargeError";
				},
				assertOnError(expected: Error, actual: any) {
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

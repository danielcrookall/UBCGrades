import express, {Application, Request, Response} from "express";
import * as http from "http";
import cors from "cors";
import InsightFacade from "../controller/InsightFacade";
import {InsightDatasetKind, InsightError, NotFoundError} from "../controller/IInsightFacade";

export default class Server {
	private readonly port: number;
	private express: Application;
	private server: http.Server | undefined;
	private facade: InsightFacade;

	constructor(port: number) {
		console.info(`Server::<init>( ${port} )`);
		this.port = port;
		this.express = express();
		this.facade = new InsightFacade();

		this.registerMiddleware();
		this.registerRoutes();

		// NOTE: you can serve static frontend files in from your express server
		// by uncommenting the line below. This makes files in ./frontend/public
		// accessible at http://localhost:<port>/
		// this.express.use(express.static("./frontend/public"))
	}

	/**
	 * Starts the server. Returns a promise that resolves if success. Promises are used
	 * here because starting the server takes some time and we want to know when it
	 * is done (and if it worked).
	 *
	 * @returns {Promise<void>}
	 */
	public start(): Promise<void> {
		return new Promise((resolve, reject) => {
			console.info("Server::start() - start");
			if (this.server !== undefined) {
				console.error("Server::start() - server already listening");
				reject();
			} else {
				this.server = this.express.listen(this.port, () => {
					console.info(`Server::start() - server listening on port: ${this.port}`);
					resolve();
				}).on("error", (err: Error) => {
					// catches errors in server start
					console.error(`Server::start() - server ERROR: ${err.message}`);
					reject(err);
				});
			}
		});
	}

	/**
	 * Stops the server. Again returns a promise so we know when the connections have
	 * actually been fully closed and the port has been released.
	 *
	 * @returns {Promise<void>}
	 */
	public stop(): Promise<void> {
		console.info("Server::stop()");
		return new Promise((resolve, reject) => {
			if (this.server === undefined) {
				console.error("Server::stop() - ERROR: server not started");
				reject();
			} else {
				this.server.close(() => {
					console.info("Server::stop() - server closed");
					resolve();
				});
			}
		});
	}

	// Registers middleware to parse request before passing them to request handlers
	private registerMiddleware() {
		// JSON parser must be place before raw parser because of wildcard matching done by raw parser below
		this.express.use(express.json());
		this.express.use(express.raw({type: "application/*", limit: "10mb"}));

		// enable cors in request headers to allow cross-origin HTTP requests
		this.express.use(cors());
	}

	// Registers all request handlers to routes
	private registerRoutes() {
		this.express.put("/dataset/:id/:kind", this.uploadDataset.bind(this));
		this.express.delete("/dataset/:id", this.deleteDataset.bind(this));
		this.express.post("/query", this.performQuery.bind(this));
		this.express.get("/datasets", this.listDataset.bind(this));
	}

	private async uploadDataset(req: Request, res: Response) {
		const {id, kind} = req.params;
		const rawData = req.body;
		let addedIds;
		try {
			const content = Buffer.from(rawData).toString("base64");
			addedIds = await this.facade.addDataset(id, content, kind as InsightDatasetKind);
		} catch (err) {
			return res.status(400).json(
				{
					error: "Failed to add dataset"
				}
			);
		}
		return res.status(200).json(
			{
				result: addedIds
			});

	}

	private async listDataset(req: Request, res: Response) {
		let addedDatasets;
		addedDatasets = await this.facade.listDatasets();

		return res.status(200).json(
			{
				result: addedDatasets
			});

	}

	private async performQuery(req: Request, res: Response) {
		const query = req.body;

		let queryResults;
		try {
			queryResults = await this.facade.performQuery(query);
		} catch (err) {
			return res.status(400).json(
				{
					error: "Failed to perform query"
				}
			);
		}
		return res.status(200).json(
			{
				result: queryResults
			});

	}

	private async deleteDataset(req: Request, res: Response) {
		const {id} = req.params;
		let removedID;
		try {
			removedID = await this.facade.removeDataset(id);
		} catch (err: any) {

			if (err.message === "Dataset does not exist") {
				return res.status(404).json(
					{
						error: "Failed to remove dataset (NotFoundError)"
					}
				);
			} else {
				return res.status(400).json(
					{
						error: "Failed to remove dataset (InsightError)."
					}
				);
			}

		}
		return res.status(200).json(
			{
				result: removedID
			});

	}
}

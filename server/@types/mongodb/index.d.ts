declare module "mongodb" {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	interface FindOneOptions<T> {
		projectID?: boolean;
	}
}

export {};

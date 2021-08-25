/** @format */
export class FDCError extends Error {
    constructor(message) {
        super(`Fero-DC Error: ${message}`);
    }
}

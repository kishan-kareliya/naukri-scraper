const startBot = require('./naukriScraper');
const fs = require("node:fs/promises");

exports.handler = async (event) => {
    const jobRole = event.jobRole || 'Web Developer';
    const jobLocation = event.jobLocation || 'Ahmedabad';
    const limit = event.limit || 20;

    try {
        const result = await startBot(jobRole, jobLocation, limit);
        return {
            statusCode: 200,
            source: "Naukri",
            body: JSON.stringify({ message: 'Scraping Complete', result }),
        };
    } catch (err) {
        console.error("❌ Lambda failed:", err);
        throw err; // make step function handle retries
    }
};


// // Run locally if not in Lambda
if (require.main === module) {
    (async () => {
        const output = await exports.handler({
            jobRole: 'Rust',
            jobLocation: 'remote',
            limit: 20
        });
        const parsed = JSON.parse(output.body);
        await fs.writeFile("jobs.json", JSON.stringify(parsed.result, null, 2));
        console.log("✅ Data written to jobs.json");
    })();
}

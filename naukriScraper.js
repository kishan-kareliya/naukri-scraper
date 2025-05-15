const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const UserAgent = require('user-agents');
const cheerio = require("cheerio");
const extractJobDescriptionFromUrl = require('./jobDescriptionExtractor');

async function startBot(jobRole, jobLocation, limit) {
    const currentTime = Date.now();
    const userAgent = new UserAgent({ deviceCategory: 'desktop' });
    const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

    chromium.setGraphicsMode = false;

    let browser;

    try {
        const executablePath = isLambda
            ? await chromium.executablePath()
            : "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath,
            headless: chromium,
        });

        const page = await browser.newPage();

        // // Setup stealth
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
            window.chrome = { runtime: {} };
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) =>
                parameters.name === 'notifications'
                    ? Promise.resolve({ state: Notification.permission })
                    : originalQuery(parameters);
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        });

        await page.setUserAgent(userAgent.toString());
        console.log("User-Agent:", userAgent.toString());

        try {
            await page.goto('https://www.naukri.com', {
                waitUntil: 'networkidle2',
                timeout: 0
            });
        } catch (err) {
            console.error("❌ Error navigating to Naukri.com:", err);
            throw err;
        }

        try {
            await page.waitForSelector('.keywordSugg .suggestor-input');
            await page.waitForSelector('.locationSugg .suggestor-input');

            await page.click('.keywordSugg .suggestor-input');
            await page.type('.keywordSugg .suggestor-input', `${jobRole}`, { delay: 100 });

            await page.click('.locationSugg .suggestor-input');
            await page.type('.locationSugg .suggestor-input', `${jobLocation}`, { delay: 100 });

            await page.waitForSelector('.qsbSubmit', { visible: true });
            await page.evaluate(() => {
                const btn = document.querySelector('.qsbSubmit');
                if (btn) {
                    btn.scrollIntoView({ behavior: 'smooth', block: 'center' });

                    const event = new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        view: window,
                    });
                    btn.dispatchEvent(event);
                }
            });
        } catch (err) {
            console.error("❌ Error filling form fields:", err);
            throw err;
        }

        let htmlContent;
        try {
            await page.waitForSelector('.srp-jobtuple-wrapper');
            htmlContent = await page.content();
        } catch (err) {
            console.error("❌ Error loading job results:", err);
            throw err;
        }

        const $ = cheerio.load(htmlContent);
        const jobCards = $('.srp-jobtuple-wrapper');
        const jobs = [];

        for (let i = 0; i < Math.min(limit, jobCards.length); i++) {
            const element = jobCards[i];

            const title = $(element).find('h2 > a.title').text().trim() || '';
            const company = $(element).find('.comp-name').text().trim() || '';
            const location = $(element).find('.locWdth').text().trim() || '';
            const link = $(element).find('h2 > a.title').attr('href') || '';

            const job = {
                title,
                company,
                location,
                link
            };

            console.log(`✅ Extracted job ${i + 1}: ${job.title}`);

            job.rawDescription = await extractJobDescriptionFromUrl(browser, job.link);
            jobs.push(job);
        }
        browser.close();
        const duration = Date.now() - currentTime;
        const seconds = Math.floor((duration / 1000) % 60);
        const minutes = Math.floor(duration / 1000 / 60);
        console.log(`⏱️ Process took ${minutes} minute(s) and ${seconds} second(s)`);
        return jobs;

    } catch (error) {
        console.error("❌ Critical error in startBot:", error);
        await browser.close();
        throw error; // important for Lambda to fail so Step Function retries
    }
}

module.exports = startBot;



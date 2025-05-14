async function extractJobDescriptionFromUrl(browser, userAgent, url) {
    const page = await browser.newPage();
    await page.setUserAgent(userAgent.toString());

    try {
        console.log(`Navigating to job description page: ${url}`);
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 0 });

        await page.waitForSelector(".styles_JDC__dang-inner-html__h0K4t");
        const rawHtml = await page.$eval(
            ".styles_JDC__dang-inner-html__h0K4t",
            (el) => el.innerHTML
        );
        return rawHtml;
    } catch (error) {
        console.log(`⚠️ Failed to extract description for: ${url}`);
        return "Description not available";
    } finally {
        await page.close();
    }
}

module.exports = extractJobDescriptionFromUrl;
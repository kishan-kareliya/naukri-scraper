async function extractJobDescriptionFromUrl(browser, userAgent, url) {
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    await page.setViewport({ width: 1280, height: 800 });


    try {
        console.log(`Navigating to job description page: ${url}`);
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });

        await page.locator(".styles_JDC__dang-inner-html__h0K4t").wait();
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
import puppeteer from 'puppeteer-core';
import {executablePath} from 'puppeteer'

const startBrowser = async ()=>{
    let browser
    try {
        // Launch the browser and open a new blank page
        browser = await puppeteer.launch({
            headless: false,
            args: ["--disable-setuid-sandbox"],
            'ignoreHTTPSErrors': true,
            executablePath: executablePath(),
        });

    } catch (error) {
        console.log("Không tạo được Browser", error);
    }
    return browser
}

export default startBrowser
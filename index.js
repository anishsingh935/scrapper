const PuppeteerExtra = require("puppeteer-extra");
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const serverless = require('serverless-http');
const express = require('express');
const { uploadUrl } = require("./upload_pdf");
const chromium = require('@sparticuz/chromium');
const app = express();

app.use(express.json());

const datavalue = async (url, pnr , email) => {
  try {

    PuppeteerExtra.use(StealthPlugin());

    const browser = await PuppeteerExtra.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: false,
      //For the local
      // executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      // headless: false,
    })

    const page = await browser.newPage();

    const getNewPageWhenLoaded =  async () => {
      return new Promise(x =>
        browser.on('targetcreated', async (target) => {
          if (target.type() === 'page') {
            const newPage = await target.page();
            const newPagePromise = new Promise(y => newPage.once('domcontentloaded', () => y(newPage)));
            const isPageLoaded = await newPage.evaluate(() => document.readyState);
            return isPageLoaded.match('complete|interactive') ? x(newPage) : x(newPagePromise);
          }
        })
      );
    };

    await page.goto(url , { waitUntil: 'networkidle0' });
    await page.type("input.form-control.hpBookingForm.gst-pnr", pnr, { delay: 20 });
    await page.type( "input.form-control.hpBookingForm.close-icon.gst-name-email", email, { delay: 20 });
    const navigationPromise = page.waitForNavigation({ waitUntil: "networkidle0" }).catch(err => { console.error("Navigation error:", err)});
    await Promise.all([ page.$eval(".btn.btn-primary.block.bold.ig-search-btn.viewGstTabBtn", elem => elem.click()), navigationPromise])
    const list = await page.$$(".tableWrap #ViewInvoice");
    let files = [];

    let i=1;

    for(const l of list){
        await l.click();
        const newPagePromise = getNewPageWhenLoaded();
        const newPage = await newPagePromise;
        const PDF_FILE_LOCATION = "/tmp/";
        let path = `${PDF_FILE_LOCATION}${pnr}_${(new Date()).getTime()}.pdf`;
        try {
          await newPage.pdf({ path: path, format: 'A4' ,printBackground:true});
        } catch (error) {
            console.log(error);  
        }
        files.push(path);
        await page.bringToFront();
        i++;
    }
    await browser.close();
    return files;
  } catch (error) {
    console.log(error);
    return {};
  }
};


app.post('/api/reconcile', async (req, res) => {
  const { url , pnr , email } = req.body;
  const data = await datavalue(url, pnr, email);
  console.log(data);
  res.status(201).json({ message: 'Post created successfully',data});
});

app.post('/api/upload', async (req, res) => {
  const data = await uploadUrl(req.query);
  console.log(data);
  res.status(201).json({ message: 'Post created successfully',data});
});


	
module.exports.handler = serverless(app);
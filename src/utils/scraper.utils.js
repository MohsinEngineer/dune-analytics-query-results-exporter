const puppeteer = require('puppeteer');

const parseTable = async (table) => {
    // Get table header
    const header = await table.$('thead tr');
    const headerCells = await header.$$('th');
    
    const columns = [];
    for (let i = 0; i < headerCells.length; i++) {
        const cell = headerCells[i];
        const text = await cell.evaluate(node => node.innerText);
        columns.push(text);
    }

    // Get table body
    const body = await table.$$('tbody tr');
    const bodyCells = await Promise.all(body.map(async row => await row.$$('td')));

    const data = [];
    for (let i = 0; i < bodyCells.length; i++) {
        const row = bodyCells[i];
        data.push({});
        for (let j = 0; j < row.length; j++) {
            const cell = row[j];
            const text = await cell.evaluate(node => node.innerText);
            data[i][columns[j]] = text;
        }
    }

    return { columns, data };
}

const parseQuery = async (url) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    await page.goto(url);
    await page.waitForNetworkIdle();

    const titleDiv = await page.waitForSelector('div[class*="header_title__"]');
    const title = await titleDiv.evaluate(node => node.innerText);
    
    console.log(title);

    const totalRowCount = await page.waitForSelector('span[class*="table_total_"]');
    const totalRows = await totalRowCount.evaluate(node => node.innerText ? parseInt(node.innerText.replace(',','')) : 0);
    
    // get table
    const table = await page.waitForSelector('table[class*="table_table_"]');

    // keep extracting data until there is no next page
    const tableData = [];
    const header = [];
    const nextPageSelector = 'button:not(:disabled) svg[aria-label="Next page"]';
    let nextPageAvailable = true;
    let pageCounter = 1;

    while(nextPageAvailable) {
        const {columns, data} = await parseTable(table);
        tableData.push(...data);

        if(pageCounter == 1) header.push(...columns);
        
        console.log(`- Page ${pageCounter} done - ${tableData.length}/${totalRows} rows`);
        pageCounter++;
        
        nextPageAvailable = await page.$eval(nextPageSelector, () => true).catch(() => false);
        if (!nextPageAvailable) break;

        nextPageBtn = await page.waitForSelector(nextPageSelector);
        await nextPageBtn.click();
        await page.waitForNetworkIdle();
    }

    if(tableData.length !== totalRows) throw new Error(`Expected ${totalRows} rows but got ${tableData.length}`);

    const json = JSON.stringify({ title, url, data: tableData }, null, 2);
    const psv = tableData.map(row => Object.values(row).join('|')).join('\n');

    await browser.close();

    return { title, json, psv, header };
};

module.exports = {
    parseQuery
}
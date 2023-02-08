const fs = require('fs').promises;
const { parseQuery } = require('./utils/scraper.utils');

(async () => {

    const queryEmbedUrlList = [];

    if (queryEmbedUrlList.length === 0) {
        console.log('No queries found. Please add query embed urls to queryEmbedUrlList array in src/index.js');
        return;
    }

    // remove output folder if exists and create new
    try {
        await fs.unlink('output', { recursive: true });
    } catch (error) {}
    finally {
        await fs.mkdir('output/json', { recursive: true });
        await fs.mkdir('output/psv', { recursive: true });
    }

    queryEmbedUrlList.forEach(async (url) => {
        const {title, json, psv, header} = await parseQuery(url);

        // convert title to lowercase and replace spaces with hyphens and remove special characters
        const fileName = title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g,'');

        await fs.writeFile(`./output/json/${fileName}.json`, json);
        await fs.writeFile(`./output/psv/${fileName}.psv`, `${header.join('|')}\n${psv}`);
    });
})();
const cheerio = require('cheerio');
const fs = require('fs');

const html = fs.readFileSync('dashboard.html', 'utf8');
const $ = cheerio.load(html);

const links = [];
$('a').each((i, el) => {
    links.push({
        href: $(el).attr('href'),
        text: $(el).text().trim()
    });
});
console.log(links);

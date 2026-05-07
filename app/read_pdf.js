const fs = require('fs');
const pdf = require('pdf-parse');

async function parsePDF(filePath) {
    let dataBuffer = fs.readFileSync(filePath);
    try {
        const data = await pdf(dataBuffer);
        console.log(`==== ${filePath} ====`);
        console.log(data.text);
    } catch (err) {
        console.error('Error reading PDF:', err);
    }
}

async function main() {
    await parsePDF('../H15报价单（海创）_0410.pdf');
    await parsePDF('../T280报价单（海创）_0410.pdf');
}

main();

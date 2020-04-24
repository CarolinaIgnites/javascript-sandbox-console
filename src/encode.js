const path = require("path")
const fs = require("fs")

const ENCODED = Buffer
                    .from(fs.readFileSync(path.join(__dirname, '/console.js'),
                                          'utf-8', 'r+'))
                    .toString('base64');

module.exports = { ENCODED: ENCODED };

require("dotenv").config()

const {DIR_PATH, CONFIG_PATH, TILDA_PUB_KEY, TILDA_SECRET, PORT} = process.env

const configPath = (CONFIG_PATH || __dirname) + '/tilda.conf';
const dirPath = (DIR_PATH || __dirname + '/files');
const tildaAPI = {
  getPageFull: `https://api.tildacdn.info/v1/getpagefull/?publickey=${TILDA_PUB_KEY}&secretkey=${TILDA_SECRET}`
}
const serverPort = PORT || 8080;
const timeout = 60 * 60 * 1000

module.exports = { configPath, dirPath, tildaAPI, serverPort, timeout }

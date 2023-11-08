import dotenv from 'dotenv'
import path from 'path';
import { fileURLToPath } from 'url';
dotenv.config()

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const {DIR_PATH, CONFIG_PATH, TILDA_PUB_KEY, TILDA_SECRET, PORT} = process.env

export const configPath = (CONFIG_PATH || __dirname) + '/tilda.conf';
export const dirPath = (DIR_PATH || __dirname) + '/files';

export const tildaAPI = {
  getPageFull: `https://api.tildacdn.info/v1/getpagefull/?publickey=${TILDA_PUB_KEY}&secretkey=${TILDA_SECRET}`
}

export const serverPort = PORT || 8080;
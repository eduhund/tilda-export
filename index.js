import fs from 'fs';
import express from 'express';
import fetch from 'node-fetch';
import { NginxConfFile } from 'nginx-conf';
import { exec } from 'child_process';
import {configPath, dirPath, tildaAPI, serverPort} from './config.js'

const server = express();

async function NginxConf() {
  return new Promise((resolve, reject) => {
    NginxConfFile.create(configPath, function (err, conf) {
      if (err || !conf) {
          reject()
      }
      resolve(conf)
    })
  })
}

function restartNGINX() {
  try {
    const restart = exec('systemctl restart nginx');

    restart.stderr.on('data', function (data) {
      console.log('restart stderr: ' + data);
    });

    restart.stdout.on('data', function (data) {
      console.log('restart stdout: ' + data);
    });

    restart.on('close', function (code) {
      console.log('Restart NGINX with the code ' + code);
    })
  } catch (e) {
    console.log(e)
  }
}

function checkPage(config, pageId) {
  for (const location of config.nginx.location || []) {
    for (const rewrite of location.rewrite || []) {
      if (rewrite._value.includes(pageId)) return true
    }
  }

  return false
}

async function savePage(page) {
  const data = await fetch(tildaAPI.getPageFull + '&pageid=' + page.pageid)
  .then((response) => response.json())

  console.log("data recieved")

  const {html, alias} = data.result || {}
  const pagePath = alias ? alias.split('/', 2) : null

  if (pagePath) {
    const config = await NginxConf()
    const isCurrentPage = checkPage(config, page.pageid)

    if (!isCurrentPage) {
      const regStr = '^/' + pagePath[0] + '$'
      const reg = new RegExp(regStr)
      const parentDirIndex = config.nginx.location.findIndex((loc) => reg.test(loc._value))

      if (parentDirIndex === -1) {
        config.nginx._add('location', `/${pagePath[0]}`)
        config.nginx.location[result.nginx.location.length-1]._add('rewrite', `^/${alias}$ /page${page.pageid}.html`)
        config.flush();
      } else {
        config.nginx.location[parentDirIndex]._add('rewrite', `^/${alias}$ /page${page.pageid}.html`)
      }

      restartNGINX()
    }
  }

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true }, (err) => {
      if (err) throw err;
    });
  }

  const path = `${dirPath}/page${page.pageid}.html`
  
  fs.writeFileSync(path, html)

  console.log("page saved")
}

server.get('/webhook', (req, res) => {
    const {query} = req
    console.log(query)
    res.sendStatus(200)
    savePage(query)
  });

  server.listen(serverPort, () => {
  console.log(`Server listening on port ${serverPort}`)
})
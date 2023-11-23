const fs = require('fs');
const express = require('express');
const fetch = require('node-fetch');
const { NginxConfFile } = require('nginx-conf');
const { exec } = require('child_process');
const { configPath, dirPath, tildaAPI, serverPort, timeout } = require('./config')

const server = express();

function queueMachine() {
  const queue = []
  let isHold = false

  function next() {
    return queue.shift()
  }

  function add(item) {
    console.log(`Page ${item} was added to queue!`)
    return queue.push(item)
  }

  async function start() {
    setInterval(async() => {
      const item = queue[0]
      if (!item || isHold) return 
      else {
        isHold = true
        if (await savePage(item)) {
        next()
        isHold = false
        console.log(`Page ${item} was removed from queue!`)
        } else {
          setTimeout(() => isHold = false, timeout)
        }
      }
    }, 1000)
  }

  start()

  return {add}
}

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

async function savePage(pageId) {
  if (!pageId) return
  console.log(`Saving page ${pageId}...`)
  const {status, message, result} = await fetch(tildaAPI.getPageFull + '&pageid=' + pageId)
  .then(response => response.json())
  .catch((error) => {
    console.log(error)
    return {
      message: "Server drop request."
    }
  });

  if (status !== "FOUND") {
    console.log(`Page ${pageId} wasn't loaded! `, message)
    return false
  }

  const {alias, html} = result || {}

  const pagePath = alias ? alias.split('/', 2) : null

  if (pagePath) {
    const config = await NginxConf()
    const isCurrentPage = checkPage(config, pageId)

    if (!isCurrentPage) {
      const regStr = '^/' + pagePath[0] + '$'
      const reg = new RegExp(regStr)
      const parentDirIndex = config.nginx.location.findIndex((loc) => reg.test(loc._value))

      if (parentDirIndex === -1) {
        config.nginx._add('location', `/${pagePath[0]}`)
        config.nginx.location[result.nginx.location.length-1]._add('rewrite', `^/${alias}$ /page${pageId}.html`)
        config.flush();
      } else {
        config.nginx.location[parentDirIndex]._add('rewrite', `^/${alias}$ /page${pageId}.html`)
      }

      restartNGINX()
    }
  }

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true }, (err) => {
      if (err) throw err;
    });
  }

  const path = `${dirPath}/page${pageId}.html`
  
  fs.writeFileSync(path, html)

  console.log(`Page ${pageId} was saved!`)

  return true
}

const queue = queueMachine()

server.get('/webhook', async (req, res) => {
    const { pageid } = req.query
    if (!pageid) {
      res.sendStatus(400)
      return
    }
    console.log('New change on Tilda. Page', pageid)
    res.sendStatus(200)
    queue.add(pageid)
  });

  server.listen(serverPort, () => {
  console.log(`Server listening on port ${serverPort}`)
})
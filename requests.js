'use strict'

/**
 * Convenience wrapper over node https package
 * Usage:
 *    requests('GET', url).send()
 *    requests('POST', url).setHeaders(headers).setData(data).send()
 *    requests('POST', url, headers, data).send()
 *    requests('GET', url, headers, data).urlEncodeData().send()
 */

const https = require('https')
const querystring = require('querystring')
const URL = require('url').URL

function setHeaders (headers) {
  this.headers = Object.assign(this.headers || {}, headers)
  return this
}

function setData (data) {
  this.data = JSON.stringify(data)
  this.headers = Object.assign(this.headers || {}, { 'Content-Length': this.data.length })
  return this
}

function urlEncodeData () {
  if (this.data) {
    this.data = querystring.stringify(JSON.parse(this.data))
    this.headers = Object.assign(this.headers || {}, { 'Content-Length': this.data.length })
  }
  return this
}

function stringifyResult () {
  this.doStringifyResult = true
  return this
}

function send () {
  return new Promise((resolve, reject) => {
    const params = {
      host: this.host,
      path: this.path,
      port: this.port,
      method: this.method || 'GET',
      headers: this.headers
    }
    const req = https.request(params, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error('statusCode=' + res.statusCode))
      }
      const buf = []
      res.on('data', (chunk) => {
        buf.push(chunk)
      })
      res.on('end', () => {
        try {
          if (buf.length > 0) {
            resolve(
              this.doStringifyResult
                ? Buffer.concat(buf).toString()
                : JSON.parse(Buffer.concat(buf).toString())
            )
          } else {
            resolve(this.doStringifyResult ? '' : {})
          }
        } catch (err) {
          reject(err)
        }
      })
    })
    req.on('error', (err) => {
      reject(err)
    })
    const data = this.data || ''
    req.write(data)
    req.end()
  })
}

module.exports = (method, url, headers, data) => {
  const parsedUrl = new URL(url)
  const requests = {
    // attributes
    method: method.toUpperCase(),
    port: 443,
    host: parsedUrl.host,
    path: parsedUrl.pathname,

    // methods
    setHeaders,
    setData,
    urlEncodeData,
    stringifyResult,
    send
  }
  if (typeof headers !== 'undefined' && headers !== null) { requests.setHeaders(headers) }
  if (typeof data !== 'undefined' && data !== null) { requests.setData(data) }
  return requests
}

let useXMLHttpRequest, compatibleActiveXObject

window.Request = {
  get: function (url, callback) {
    return send(url, null, 'GET', callback)
  },
  post: function (url, data, callback) {
    return send(url, data, 'POST', callback)
  },
  put: function (url, data, callback) {
    return send(url, data, 'PUT', callback)
  },
  patch: function (url, data, callback) {
    return send(url, data, 'PATCH', callback)
  },
  del: function (url, data, callback) {
    return send(url, data, 'DELETE', callback)
  }
}

function send (url, data, method, callback) {
  const dataString = []
  for (const field in data) {
    dataString.push(`${field}=${encodeURI(data[field])}`)
  }
  const x = getRequest()
  x.open(method, url, true)
  x.onreadystatechange = function () {
    if (x.readyState !== 4) {
      return
    }
    return callback(null, x.responseText)
  }
  x.send(dataString.join('&'))
  return x
}

function getRequest () {
  if (useXMLHttpRequest || typeof XMLHttpRequest !== 'undefined') {
    useXMLHttpRequest = true
    return new window.XMLHttpRequest()
  }
  if (compatibleActiveXObject !== null) {
    return new window.ActiveXObject(compatibleActiveXObject)
  }
  let xhr
  const xhrversions = ['MSXML2.XmlHttp.5.0', 'MSXML2.XmlHttp.4.0', 'MSXML2.XmlHttp.3.0', 'MSXML2.XmlHttp.2.0', 'Microsoft.XmlHttp']
  for (let i = 0, len = xhrversions.length; i < len; i++) {
    try {
      xhr = new window.ActiveXObject(xhrversions[i])
      compatibleActiveXObject = xhrversions[i]
      return xhr
    } catch (e) { }
  }
}

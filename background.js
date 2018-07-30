"use strict";

//
// Cookie manipulation library
//
function Cookie(cookie_str) {
  this.cookie_arr = cookie_str
    .split(";")
    .map(item => item.trim())
    .filter(item => item.length > 0)
    .map(item => {
      var kv_idx = item.indexOf("=");

      return {
        name: item.substr(0, kv_idx),
        value: item.substr(kv_idx + 1)
      };
    });
}

Cookie.prototype.item = function(name) {
  return this.cookie_arr.find(item => item.name === name);
};

Cookie.prototype.get = function(name, default_value) {
  var item = this.item(name);

  return item ? item.value : default_value;
};

Cookie.prototype.set = function(name, value) {
  var item = this.item(name);

  if (item) {
    item.value = value;
  } else {
    this.cookie_arr.push({
      name: name,
      value: value
    });
  }
};

Cookie.prototype.stringify = function() {
  return this.cookie_arr.map(item => item.name + "=" + item.value).join("; ");
};

//
// Extension logic
//
var ctx = "browser" in window ? window.browser : window.chrome;
var targetUrl = "https://www.youtube.com/*";

function injectCookie(e) {
  var cookieHeader = e.requestHeaders.find(function(header) {
    return header.name.toLowerCase() === "cookie";
  });

  if (!cookieHeader) {
    cookieHeader = { name: "Cookie", value: "" };
    e.requestHeaders.push(cookieHeader);
  }

  var cookieStore = new Cookie(cookieHeader.value);
  var modifiedPrefs = cookieStore
    .get("PREF", "")
    .split("&")
    .filter(pref => pref.length > 0)
    .filter(pref => pref.substr(0, 2) !== "f6")
    .concat("f6=8")
    .join("&");

  cookieStore.set("PREF", modifiedPrefs);
  cookieHeader.value = cookieStore.stringify();

  return { requestHeaders: e.requestHeaders };
}

ctx.webRequest.onBeforeSendHeaders.addListener(
  injectCookie,
  { urls: [targetUrl], types: ["main_frame"] },
  ["blocking", "requestHeaders"]
);

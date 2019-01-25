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
var browser = "chrome" in window ? window.chrome : window.browser;
var targetUrl = "https://www.youtube.com/*";

function processRequestHeaders(e) {
  return new Promise(function(resolve, reject) {
    getStoredState(function(state) {
      var cookieHeader = e.requestHeaders.find(function(header) {
        return header.name.toLowerCase() === "cookie";
      });

      if (!cookieHeader) {
        cookieHeader = { name: "Cookie", value: "" };
        e.requestHeaders.push(cookieHeader);
      }

      var cookieStore = new Cookie(cookieHeader.value);
      var prefs = cookieStore.get("PREF", "");
      var parsed_prefs = ensureRequiredPref(parsePrefs(prefs));
      modifyPrefIfRequired(extractPrefByKey(parsed_prefs, "f6"), state);

      cookieStore.set("PREF", joinPrefs(parsed_prefs));
      cookieHeader.value = cookieStore.stringify();

      resolve({ requestHeaders: e.requestHeaders });
    });
  });
}

function parsePrefs(prefs_str) {
  return prefs_str.split("&")
      .map(function(pref) {
          return pref.split("=");
      });
}

function joinPrefs(prefs) {
  return prefs.map(function(pref) {
    return pref.join("=");
  }).join("&");
}

function ensureRequiredPref(prefs) {
  var exists = prefs.reduce(function(x, pref) {
      if (pref[0] === "f6") {
          return true;
      } else {
          return x;
      }
  }, false);

  if (exists) {
      return prefs;
  } else {
      return prefs.concat([[ "f6", "" ]]);
  }
}

function extractPrefByKey(prefs, key) {
  return prefs.find(function(pref) {
      return pref[0] === key;
  });
}

function modifyPrefIfRequired(pref, state) {
  if (state.mode === "on" && !matchLastBit(pref[1], ["8", "9"])) {
      pref[1] = replaceLastBit(pref[1], "8");
  } else if (state.mode !== "on" && !matchLastBit(pref[1], ["0", "1"])) {
      pref[1] = replaceLastBit(pref[1], "0");
  }
}

function matchLastBit(str, chars) {
  var last_bit = str.substr(-1);
  var match = chars.find(function(char) {
    return char === last_bit;
  });

  return !!match;
}

function replaceLastBit(str, char) {
  return str.slice(0, -1).concat(char);
}

function getStoredState(cb) {
  browser.storage.local.get(["mode", "method"], function(result) {
    cb({
      mode: result.mode || "on",
      method: result.method || "cookie"
    });
  });
}

function setState(key, value) {
  browser.storage.local.set({ [key]: value });
}

browser.webRequest.onBeforeSendHeaders.addListener(
  processRequestHeaders,
  { urls: [targetUrl], types: ["main_frame"] },
  ["blocking", "requestHeaders"]
);

browser.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  switch (msg.type) {
    case "GET_STATE": {
      getStoredState(function(_state) {
        sendResponse(_state);
      });
      return true;
    }
    case "SET_STATE": {
      setState(msg.key, msg.value);
    }
  }
});

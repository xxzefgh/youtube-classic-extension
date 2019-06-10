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
var BASE_URL = "https://www.youtube.com";
var browser = "chrome" in window ? window.chrome : window.browser;
var globalState = null;

function parsePrefs(prefs_str) {
	return prefs_str.split("&").map(function(pref) {
		return pref.split("=");
	});
}

function joinPrefs(prefs) {
	return prefs
		.map(function(pref) {
			return pref.join("=");
		})
		.join("&");
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
		return prefs.concat([["f6", ""]]);
	}
}

function extractPrefByKey(prefs, key) {
	return prefs.find(function(pref) {
		return pref[0] === key;
	});
}

function modifyPrefIfRequired(pref, state) {
	if (state.enable === "true" && !matchLastBit(pref[1], ["8", "9"])) {
		pref[1] = replaceLastBit(pref[1], "8");
	} else if (state.enable !== "true" && !matchLastBit(pref[1], ["0", "1"])) {
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
	browser.storage.local.get(["enable", "homepage"], function(result) {
		cb({
			enable: result.enable || "true",
			homepage: result.homepage || "home"
		});
	});
}

function setState(key, value, cb) {
	browser.storage.local.set({ [key]: value }, cb);
}

function reloadGlobalState() {
	getStoredState(function(state) {
		globalState = state;
	});
}

function detectChromeMajorVersion() {
	var version = /Chrome\/([0-9]+)/.exec(navigator.userAgent);

	return version ? version[1] : -1;
}

function onBeforeSendHeadersOptions() {
	var options = ["blocking", "requestHeaders", "extraHeaders"];
	if (detectChromeMajorVersion() < 71) {
		options.length = options.length - 1;
	}

	return options;
}

function onResponseStartedOptions() {
	var options = ["responseHeaders", "extraHeaders"];
	if (detectChromeMajorVersion() < 71) {
		options.length = options.length - 1;
	}

	return options;
}

browser.webRequest.onBeforeSendHeaders.addListener(
	function handleOnBeforeSendHeaders(details) {
		if (globalState === null) return;

		var cookieHeader = details.requestHeaders.find(function(header) {
			return header.name.toLowerCase() === "cookie";
		});

		if (!cookieHeader) {
			cookieHeader = { name: "Cookie", value: "" };
			details.requestHeaders.push(cookieHeader);
		}

		var cookieStore = new Cookie(cookieHeader.value);
		var prefs = cookieStore.get("PREF", "");
		var parsedPrefs = ensureRequiredPref(parsePrefs(prefs));

		modifyPrefIfRequired(extractPrefByKey(parsedPrefs, "f6"), globalState);

		cookieStore.set("PREF", joinPrefs(parsedPrefs));
		cookieHeader.value = cookieStore.stringify();

		return { requestHeaders: details.requestHeaders };
	},
	{ urls: [BASE_URL + "/*"], types: ["main_frame"] },
	onBeforeSendHeadersOptions()
);

browser.webRequest.onResponseStarted.addListener(
	function handleOnResponseStarted(details) {
		if (globalState === null) return;
		if (globalState.enable !== "true") return;
		if (globalState.homepage !== "subscriptions") return;

		var setCookieHeader = details.responseHeaders.find(function(header) {
			return header.name.toLowerCase() === "set-cookie";
		});

		if (setCookieHeader) {
			browser.tabs.update(details.tabId, {
				url: BASE_URL + "/feed/subscriptions"
			});
		}
	},
	{ urls: [BASE_URL + "/"], types: ["main_frame"] },
	onResponseStartedOptions()
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
			setState(msg.key, msg.value, function() {
				reloadGlobalState();
			});
			break;
		}
	}
});

reloadGlobalState();

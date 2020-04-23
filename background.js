"use strict";

const BASE_URL = "https://www.youtube.com";
const COOKIE_MODIFICATION_DISABLED = true;
let browser = window.browser || window.chrome;
let globalState = null;

function parsePrefs(prefsStr) {
	return prefsStr.split("&").map(pref => pref.split("="));
}

function joinPrefs(prefs) {
	return prefs.map(pref => pref.join("=")).join("&");
}

function ensureRequiredPref(prefs) {
	let exists = prefs.reduce((x, pref) => {
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
	return prefs.find(pref => pref[0] === key);
}

function modifyPrefIfRequired(pref, state) {
	if (state.enable === "true" && !matchLastBit(pref[1], ["8", "9"])) {
		pref[1] = replaceLastBit(pref[1], "8");
	} else if (state.enable !== "true" && !matchLastBit(pref[1], ["0", "1"])) {
		pref[1] = replaceLastBit(pref[1], "0");
	}
}

function matchLastBit(str, chars) {
	let lastBit = str.substr(-1);
	let match = chars.find(char => char === lastBit);

	return !!match;
}

function replaceLastBit(str, char) {
	return str.slice(0, -1).concat(char);
}

function getStoredState(cb) {
	browser.storage.local.get(["enable", "homepage"], result => {
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
	getStoredState(state => {
		globalState = state;
	});
}

function detectChromeMajorVersion() {
	let version = /Chrome\/([0-9]+)/.exec(navigator.userAgent);
	return version ? version[1] : -1;
}

function onBeforeSendHeadersOptions() {
	let options = ["blocking", "requestHeaders", "extraHeaders"];
	if (detectChromeMajorVersion() < 71) {
		options.length = options.length - 1;
	}

	return options;
}

function onResponseStartedOptions() {
	let options = ["responseHeaders", "extraHeaders"];
	if (detectChromeMajorVersion() < 71) {
		options.length = options.length - 1;
	}

	return options;
}

browser.webRequest.onBeforeRequest.addListener(
	function handleOnBeforeRequest(details) {
		if (globalState === null) return;

		let [baseUrl, queryString] = details.url.split('?');
		let queryParams = queryString ? queryString.split('&') : [];

		let disablePolymerExists = false;
		for (let param of queryParams) {
			if (param.indexOf('disable_polymer') !== -1) {
				disablePolymerExists = true;
			}
		}

		if (!disablePolymerExists) {
			queryParams.push('disable_polymer=1');
			return { redirectUrl: baseUrl + '?' + queryParams.join('&')};
		}
	},
	{ urls: [BASE_URL + "/*"], types: ["main_frame"] },
	["blocking"]
);

browser.webRequest.onBeforeSendHeaders.addListener(
	function handleOnBeforeSendHeaders(details) {
		if (COOKIE_MODIFICATION_DISABLED) return;
		if (globalState === null) return;

		let cookieHeader = details.requestHeaders.find(
			header => header.name.toLowerCase() === "cookie"
		);

		if (!cookieHeader) {
			cookieHeader = { name: "Cookie", value: "" };
			details.requestHeaders.push(cookieHeader);
		}

		let cookieStore = new CookieStore(cookieHeader.value);
		let prefs = cookieStore.getItem("PREF", "");
		let parsedPrefs = ensureRequiredPref(parsePrefs(prefs));

		modifyPrefIfRequired(extractPrefByKey(parsedPrefs, "f6"), globalState);

		cookieStore.setItem("PREF", joinPrefs(parsedPrefs));
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

		let setCookieHeader = details.responseHeaders.find(
			header => header.name.toLowerCase() === "set-cookie"
		);

		if (setCookieHeader) {
			browser.tabs.update(details.tabId, {
				url: BASE_URL + "/feed/subscriptions"
			});
		}
	},
	{ urls: [BASE_URL + "/"], types: ["main_frame"] },
	onResponseStartedOptions()
);

browser.runtime.onMessage.addListener(function handleOnMessage(
	msg,
	sender,
	sendResponse
) {
	switch (msg.type) {
		case "GET_STATE": {
			getStoredState(state => sendResponse(state));
			return true;
		}
		case "SET_STATE": {
			setState(msg.key, msg.value, () => reloadGlobalState());
			break;
		}
	}
});

reloadGlobalState();

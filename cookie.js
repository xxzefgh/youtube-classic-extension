"use strict";

class CookieStore {
	constructor(cookieHeader) {
		if (typeof cookieHeader !== "string") {
			this.cookieList = [];
		} else {
			this.cookieList = cookieHeader
				.split(";")
				.map(item => item.trim())
				.filter(item => item.length > 0)
				.map(item => {
					const i = item.indexOf("=");
					return [item.substr(0, i), item.substr(i + 1)];
				});
		}
	}

	find(name) {
		return this.cookieList.find(item => item[0] === name);
	}

	getItem(name, defaultValue) {
		const item = this.find(name);
		return item !== undefined ? item[1] : defaultValue;
	}

	setItem(name, value) {
		var item = this.find(name);

		if (item !== undefined) {
			item[1] = value;
		} else {
			this.cookieArr.push([name, value]);
		}
	}

	stringify() {
		return this.cookieList.map(item => item[0] + "=" + item[1]).join("; ");
	}
}

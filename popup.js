(function(context) {
	if (!context) {
		return void console.warn("'window.browser' is undefined.");
	}

	var $enable_toggler = document.querySelector("#enable-toggler");
	// var $method_selector = document.querySelector("#method-selector");
	var $homepage_selector = document.querySelector("#homepage-selector");

	$enable_toggler.addEventListener("change", function(event) {
		context.runtime.sendMessage({
			type: "SET_STATE",
			key: "enable",
			value: event.target.checked ? "true" : "false"
		});
	});

	// $method_selector.addEventListener("change", function(event) {
	// 	switch (event.target.value) {
	// 		case "cookie":
	// 		case "useragent": {
	// 			context.runtime.sendMessage({
	// 				type: "SET_STATE",
	// 				key: "method",
	// 				value: event.target.value
	// 			});
	// 			break;
	// 		}
	// 	}
	// });

	$homepage_selector.addEventListener("change", function(event) {
		switch (event.target.value) {
			case "home":
			case "subscriptions": {
				context.runtime.sendMessage({
					type: "SET_STATE",
					key: "homepage",
					value: event.target.value
				});
			}
		}
	});

	context.runtime.sendMessage({ type: "GET_STATE" }, function(state) {
		$enable_toggler.checked = state.enable === "true";
		// $method_selector.value = state.method;
		$homepage_selector.value = state.homepage;
	});
})(window.browser || window.chrome);

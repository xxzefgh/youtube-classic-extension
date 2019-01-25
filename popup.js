var browser = "chrome" in window ? window.chrome : window.browser;
var DOM = {
  onReady: function onReady(cb) {
    window.addEventListener("onload", cb, false);
  },

  selectById: function selectById(id) {
    return document.getElementById(id);
  },

  onChange: function onChange(el, cb) {
    el.addEventListener("change", cb);
  },

  onClick: function onClick(el, cb) {
    el.addEventListener("click", cb);
  }
};

function el_Mode() {
  return DOM.selectById("mode-toggle");
}

function el_Method() {
  return DOM.selectById("method-selector");
}

DOM.onChange(el_Mode(), function (evt) {
  browser.runtime.sendMessage({
    type: "SET_STATE",
    key: "mode",
    value: evt.target.checked ? "on" : "off"
  });
});

DOM.onChange(el_Method(), function (evt) {
  switch (evt.target.value) {
    case "cookie":
    case "useragent": {
      browser.runtime.sendMessage({
        type: "SET_STATE",
        key: "method",
        value: evt.target.value
      });
      break;
    }
  }
});

function reloadState() {
  browser.runtime.sendMessage({ type: "GET_STATE" }, function (state) {
    el_Mode().checked = state.mode === "on";
    el_Method().value = state.method;
  });
}

reloadState();

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
  return DOM.selectById("mode-selector");
}

function el_Workaround() {
  return DOM.selectById("workaround-selector");
}

DOM.onChange(el_Mode(), function (evt) {
  switch (evt.target.value) {
    case "classic":
    case "material": {
      browser.runtime.sendMessage({
        type: "SET_STATE",
        key: "mode",
        value: evt.target.value
      });
      break;
    }
  }
});

DOM.onChange(el_Workaround(), function (evt) {
  switch (evt.target.value) {
    case "cookie":
    case "useragent": {
      browser.runtime.sendMessage({
        type: "SET_STATE",
        key: "workaround",
        value: evt.target.value
      });
      break;
    }
  }
});

function reloadState() {
  browser.runtime.sendMessage({ type: "GET_STATE" }, function (state) {
    console.log("STATE RELOAD: " + JSON.stringify(state));
    el_Mode().value = state.mode;
    el_Workaround().value = state.workaround;
  });
}

reloadState();

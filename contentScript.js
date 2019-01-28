var msgChannel = {
    getState: function getState(cb) {
        cb({
            mode: "on"
        })
    }
}

document.addEventListener("DOMContentLoaded", function() {
    chrome.runtime.sendMessage({ type: "GET_STATE" }, function(state) {
        if (state.mode === "on") {
            injectClassicLook()
        } else {
            injectNewLook()
        }  
    })
})

function injectClassicLook() {
    var buttonHtml = '' +
    '<button class="yt-uix-button yt-uix-button-size-default yt-uix-button-primary yt-uix-button-switch-to-new-look" type="button">' +
        '<span class="yt-uix-button-content">Switch To New Look</span>' +
    '</button>'
    
    var creationMenuElement = document.querySelector("#yt-masthead-creation-menu")

    if (creationMenuElement) {
        var buttonElement = createElementFromHtml(buttonHtml)
        creationMenuElement.parentNode.insertBefore(buttonElement, creationMenuElement)

        buttonElement.addEventListener("click", function() {
            chrome.runtime.sendMessage({ type: "SET_STATE", key: "mode", value: "off" }, function() {
                window.location.reload()
            })
        })
    }

}

function injectNewLook() {

}

function createElementFromHtml(html) {
    var div = document.createElement('div')
    div.innerHTML = html.trim()

    return div.firstChild
}


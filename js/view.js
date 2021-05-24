function getViews(url) {
    var request = new XMLHttpRequest()
    var fullUrl = 'https://sitestats.azurewebsites.net/api/HttpTrigger1?code=wKjxZlUWEU49uwftjzx8DOFDh4NyaAmVHdS73IYMESYFyFrOGRdcwQ==&url=' + url
    request.open('POST', fullUrl, true)

    request.onload = function (e) {
        if (request.readyState === 4) {
            if (request.status === 200) {
                var data = JSON.parse(this.response)
                document.getElementById("views").innerHTML = data.views
                //console.log(data.views);
            } else {
                console.error(request.statusText);
            }
        }
    };

    request.onerror = function (e) {
        console.error(request.statusText);
    };

    request.send(null);
}
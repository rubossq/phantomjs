phantom.injectJs("classes/Constant.js");
phantom.injectJs("lib/jquery-3.1.0.min.js");
phantom.injectJs("lib/base.js");
phantom.injectJs("classes/Loader.js");

var params = new Array();
var check_time = true;

// count of completed tasks
var completeTasks = 0;

var page = require('webpage').create();
page.settings.userAgent = 'WebKit/534.46 Mobile/9A405 Safari/7534.48.3';
page.settings.loadImages = false;
page.settings.javascriptEnabled = false;
// block css load
page.onResourceRequested = function(requestData, request){
	if ((/http:\/\/.+?\.css$/gi).test(requestData['url'])){
		request.abort();
	}
};
page.onError = function(msg, trace){
	var msgStack = ['ERROR: ' + msg];

	if(trace && trace.length){
		msgStack.push('TRACE:');
		trace.forEach(function(t){
			msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function +'")' : ''));
		});
	}
	if(Constant.MODE == Constant.DEBUG_MODE){
		console.error(msgStack.join('\n'));
	}

	phantom.exit();
};

// run time timeout
runTime();

// get pageses params from server
getParams();

function getParams(){

	najax(Constant.REQUEST_LINK, "POST", null, function(response){
		if(response.status != 200){
			if(Constant.MODE == Constant.DEBUG_MODE){
				console.log("Response error: " + response.status);
			}
			phantom.exit();
		}else{
			var parseResponse = response.data;
			if(Constant.MODE == Constant.DEBUG_MODE){
				console.log(JSON.stringify(parseResponse));
			}
			switch(parseResponse.response.status){
				case Constant.OK_STATUS:
					params = parseResponse.response.object.frozens;
					nextPage();
					break;
				case Constant.ERR_STATUS:
					if(Constant.MODE == Constant.DEBUG_MODE){
						console.log("Server error: " + parseResponse.response.message);
					}
					phantom.exit();
			}
		}
	});
	
}

function nextPage(){
	if(check_time){
		var param = params.shift();
		if(!param){
			if(Constant.MODE == Constant.DEBUG_MODE){
				console.log("Completed tasks: " + completeTasks);
			}
			phantom.exit();
		}

		completeTasks++;

		var loader = new Loader();

		loader.setId(param.id);
		loader.setType(param.type);

		// set target id of post to data
		loader.setData("target_id", param.target_id);

		switch(loader.getType()){
			case Constant.LIKE_TYPE:
				loader.setUrl(Constant.INSTA_HOME + "p/" + param.real_id);
			break;
			case Constant.SUBSCRIBE_TYPE:
				loader.setUrl(Constant.INSTA_HOME + param.real_id);
			break;
		}
		
		openPage(loader);
	}else{
		if(Constant.MODE == Constant.DEBUG_MODE){
			console.log("Completed tasks: " + completeTasks);
		}
		phantom.exit();
	}
}

function openPage(loader){
	page.open(loader.getUrl(), function(status){
		if(Constant.MODE == Constant.DEBUG_MODE){
			console.log("Status: " + status);
		}

		if(status === 'success'){
			var bodyLink = "";
			var content = page.content;

			// get object of page
			var data = loader.getPageData(content);

			switch(loader.getType()){
				case Constant.LIKE_TYPE:
					// check is page exist
					if(!loader.isObjEmpty(data.entry_data)){
						loader.setIsExist(true);

						// parse page info
						var parseData = loader.parsePageData(Constant.LIKE_TYPE, data);
						loader.setIsPrivate(parseData.is_private);

						// check is target id for post of this post
						if(loader.getData().target_id != parseData.target_id){
							loader.setWrongType(true);

							loader.setData("target_id", parseData.target_id);
							loader.setData("display_src", parseData.display_src);
						}else{
							loader.setWrongType(false);

							loader.setData("display_src", parseData.display_src);
						}
					}else{
						loader.setIsExist(false);
					}

					// params of url's body
					bodyLink = "cancel_secure=1&id=" + loader.getId() + "&type=" + loader.getType() + "&target_id=" + loader.getData().target_id + "&src=" + loader.getData().display_src
                    + "&suspicion=" +  Constant.CHECK_PRIVATE + "," + Constant.CHECK_SWITCH_TYPE + "," + Constant.CHECK_FROZEN
                        + "&verdict=" + (loader.getIsPrivate() ? "err" : "ok") + "," + (loader.getWrongType() ? "ok" : "err") + ","  + (loader.getIsExist() ? "ok" : "err");
					break;
				case Constant.SUBSCRIBE_TYPE:
					// check is page exist
					if(!loader.isObjEmpty(data.entry_data)){
						loader.setIsExist(true);

						// parse page info
						var parseData = loader.parsePageData(Constant.SUBSCRIBE_TYPE, data);

						// check is target id for post of this post
						if(loader.getData().target_id != parseData.target_id){
							loader.setWrongType(true);

							loader.setData("target_id", parseData.target_id);
							loader.setData("profile_src", parseData.profile_src);
						}else{
							loader.setWrongType(false);

							loader.setData("profile_src", parseData.profile_src);
						}
					}else{
						loader.setIsExist(false);
					}

					// params of url's body
					bodyLink = "cancel_secure=1&id=" + loader.getId() + "&type=" + loader.getType()  + "&target_id=" + loader.getData().target_id + "&src=" + loader.getData().profile_src
							+ "&suspicion="  + Constant.CHECK_SWITCH_TYPE + "," + Constant.CHECK_FROZEN
							+ "&verdict=" + (loader.getWrongType() ? "ok" : "err")  + "," + (loader.getIsExist() ? "ok" : "err");
					break;
			}

			if(Constant.MODE == Constant.DEBUG_MODE){
				console.log(bodyLink);
			}

			// send info to the server
			najax(Constant.RESPONSE_LINK, "POST", bodyLink, nextPage);
		}else{
			nextPage();
		}
	});
}

function najax(url, method, param, callback){
	$.ajax({
		url: url,
		cache: false,
		type: method,
		crossDomain: true,
		xhrFields: { withCredentials: true },
		dataType: 'json',
		data: param,
		success: function(response){
			if(Constant.MODE == Constant.DEBUG_MODE){
				console.log(JSON.stringify(response));
			}
			callback({status: 200, data: response});
		},
		error: function(response){
			if(Constant.MODE == Constant.DEBUG_MODE){
				console.log(JSON.stringify(response));
			}
			callback({status: 400, data: response});
		}
	});

	// test request
	//callback({status: 200, data: {"response":{"action":"getFrozens","status":"ok","message":"","object":{"frozens":[{"id":"7","real_id":"BJ8SxxVjG33","type": 1, "target_id":"3857956242"},{"id":"5","real_id":"taeyeonhee_","type": 2, "target_id":"1108651340791132565"}]},"time":0.029398918151855}}});
}

function runTime(){
	setTimeout(function(){
		check_time = false;
		setTimeout(function(){
			phantom.exit();
		}, Constant.FORCE_EXIT_TIME);
	}, Constant.RUN_TIME);
}
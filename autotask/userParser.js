phantom.injectJs("classes/Constant.js");
phantom.injectJs("lib/jquery-3.1.0.min.js");
phantom.injectJs("lib/base.js");
phantom.injectJs("classes/Loader.js");

var params = new Array();
var check_time = true;

// count of completed tasks
var completeUsers = 0;

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
					params = parseResponse.response.object.users;
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
				console.log("Users checked: " + completeUsers);
			}
			phantom.exit();
		}

		completeUsers++;

		var loader = new Loader();

		loader.setUserId(param.user_id);
		loader.setRealId(param.real_id);
		loader.setUrl(Constant.INSTA_HOME + loader.getRealId());
		
		openPage(loader);
	}else{
		if(Constant.MODE == Constant.DEBUG_MODE){
			console.log("Completed tasks: " + completeUsers);
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
			var content = page.content;

			// get object of page
			var data = loader.getPageData(content);
			
			// check is page exist
			if(!loader.isObjEmpty(data.entry_data)){
				loader.setIsExist(true);

				// parse page info
				var parseData = loader.parsePageData(data);

				var user = {head: parseData.profile_src, meta: parseData.username, followed_by: parseData.followed_by,
					follows: parseData.follows, full_name: parseData.full_name, id: parseData.id, posts_count: parseData.posts_count};

				loader.setIsPrivate(parseData.is_private);
				if(!loader.getIsPrivate()){
					var posts = new Array();
					for(var i = 0; i < parseData.posts.length; i++){
						var postHead = parseData.posts[i].display_src;
						var postMeta = parseData.posts[i].code;
						var id = parseData.posts[i].id;
						posts[i] = {head: postHead, meta: postMeta, id: id};
					}
				}

				var getMetaHead = {user: user, posts: posts};
			}else{
				loader.setIsExist(false);
			}

			// params of url's body
			var bodyLink = "cancel_secure=1&user_id=" + loader.getUserId()  + "&real_id=" + loader.getRealId() + "&data=" + encodeURIComponent(JSON.stringify(getMetaHead))
					+ "&suspicion="  + Constant.CHECK_EXIST + "," + Constant.CHECK_PRIVATE
					+ "&verdict=" + (loader.getIsExist() ? "ok" : "err") + "," + (loader.getIsPrivate() ? "ok" : "err");

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
	//callback({status: 200, data: {"response":{"action":"getVeryUsers","status":"ok","message":"","object":{"users":[{"real_id":"iruboss12","user_id":"1"}]},"time":0.49165081977844}}});
}

function runTime(){
	setTimeout(function(){
		check_time = false;
	}, Constant.RUN_TIME);
}
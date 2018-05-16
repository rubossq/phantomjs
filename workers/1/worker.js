phantom.injectJs("classes/Constant.js");
phantom.injectJs("lib/jquery-3.1.0.min.js");
phantom.injectJs("lib/base.js");
phantom.injectJs("classes/Loader.js");

var tasks = new Array();
var timer = 0;


var WORK_STATUS = 1;
var READY_STATUS = 2;
var status = 2;

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

// RUN SCRIPT!!!!
getConfig();

function getConfig(){
	var params = "cancel_secure=1&phantom_id=" + Constant.PHANTOM_ID;
	najax(Constant.CONFIG_LINK, "POST", params, function(response){
		if(response.status != 200){
			phantom.exit();
		}else{
			var parseResponse = response.data;
			switch(parseResponse.response.status){
				case Constant.OK_STATUS:
					// get time of delay requests to the server
					getTasks(parseResponse.response.object.loop_time);
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

function getTasks(loop_time){
	// request new tasks every 'loop_time'
	setInterval(function(){
		var params = "cancel_secure=1&phantom_id=" + Constant.PHANTOM_ID;
		najax(Constant.TASKS_LINK, "POST", params, function(response){
			if(response.status != 200){
				phantom.exit();
			}else{
				var parseResponse = response.data;
				switch(parseResponse.response.status){
					case Constant.OK_STATUS:
						// write all tasks to array
						for(var i = 0; i < parseResponse.response.object.tasks.length; i++){
							tasks.push(parseResponse.response.object.tasks[i]);
						}
						
						stopExitTimer();
						nextPage();
						
						break;
					case Constant.ERR_STATUS:
						if(Constant.MODE == Constant.DEBUG_MODE){
							console.log("No tasks");
						}
						runExitTimer();
				}
			}
		});
	}, loop_time);
}

function nextPage(){
	if(tasks.length > 0 && status == READY_STATUS){
		var task = tasks.shift();
		startTask(task);
	}
}

function startTask(task){
	status = WORK_STATUS;
	var loader = new Loader();
	loader.setTaskId(task.id);
	loader.setRealId(task.params.split("=")[1]);
	loader.setUrl(Constant.INSTA_HOME + loader.getRealId());

	openPage(loader);
}

function endTask(){
	status = READY_STATUS;
	nextPage();
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
			var response = {};
			// check is page exist
			if(!loader.isObjEmpty(data.entry_data)){
				loader.setIsExist(true);

				// parse page info
				var parseData = loader.parsePageData(data);

				var user = {head: parseData.profile_src, meta: parseData.username, followed_by: parseData.followed_by,
					follows: parseData.follows, full_name: parseData.full_name, id: parseData.id, posts_count: parseData.posts_count,
					is_private: parseData.is_private};

				loader.setIsPrivate(parseData.is_private);
				if(!loader.getIsPrivate()){
					var posts = new Array();
					for(var i = 0; i < parseData.posts.length; i++){
						var postHead = parseData.posts[i].display_src;
						var postMeta = parseData.posts[i].code;
						var id = parseData.posts[i].id;
						var likes_count = parseData.posts[i].likes.count;
						posts[i] = {head: postHead, meta: postMeta, id: id, likes_count: likes_count};
					}
				}

				response = {user: user, posts: posts};
			}else{
				loader.setIsExist(false);
			}

			// params of url's body
			var bodyLink = "cancel_secure=1&phantom_id=" + Constant.PHANTOM_ID +
						   "&tid=" + loader.getTaskId() + "&response=" + encodeURIComponent(JSON.stringify(response));

			if(Constant.MODE == Constant.DEBUG_MODE){
				console.log(bodyLink);
			}

			// send info to the server
			najax(Constant.RESPONSE_LINK, "POST", bodyLink, function(res){
				endTask();
			});
		}else{
			endTask();
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
	//callback({status: 200, data: {"response":{"action":"getVeryUsers","status":"ok","message":"","object":{"tasks":[{"id":"1", "params":{"real_id":"iruboss"}}]},"time":0.49165081977844}}});
}

function runExitTimer(){
	timer = setTimeout(function(){
		phantom.exit();
	}, Constant.RUN_TIME);
}

function stopExitTimer(){
	clearTimeout(timer);
}
phantom.injectJs("classes/Constant.js");
phantom.injectJs("lib/jquery-3.1.0.min.js");
phantom.injectJs("lib/base.js");

var fs = require('fs');

var page = require('webpage').create();
page.viewportSize = {
	width: 1000,
	height: 500
};
page.settings.userAgent = "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.120 Safari/537.36";
//page.settings.loadImages = false;
//page.settings.javascriptEnabled = false;
// block css load
/*page.onResourceRequested = function(requestData, request){
	if ((/http:\/\/.+?\.css$/gi).test(requestData['url'])){
		request.abort();
	}
};)*/

page.onResourceError = function(resourceError) {
    system.stderr.writeLine('= onResourceError()');
    system.stderr.writeLine('  - unable to load url: "' + resourceError.url + '"');
    system.stderr.writeLine('  - error code: ' + resourceError.errorCode + ', description: ' + resourceError.errorString );
};
page.onError = function(msg, trace) {
    system.stderr.writeLine('= onError()');
    var msgStack = ['  ERROR: ' + msg];
    if (trace) {
        msgStack.push('  TRACE:');
        trace.forEach(function(t) {
            msgStack.push('    -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function + '")' : ''));
        });
    }
    system.stderr.writeLine(msgStack.join('\n'));
};
page.onConsoleMessage = function(msg) {
	console.log(msg);
}

var WORK_STATUS = 1;
var READY_STATUS = 2;
var status = READY_STATUS;

var tasks = new Array();
var curTask = {};
var timer = 0;

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
					//getTasks(1000);
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
	// request new tasks every 'loop_time
	setInterval(function(){
		var params = "cancel_secure=1&phantom_id=" + Constant.PHANTOM_ID;
		najax(Constant.TASKS_LINK, "POST", params, function(response){
			if(response.status != 200){
				
				phantom.exit();
			}else{
				var parseResponse = response.data;
				switch(parseResponse.response.status){
					case Constant.OK_STATUS:

						for(var i = 0; i < parseResponse.response.object.tasks.length; i++){
							var task = parseResponse.response.object.tasks[i];

							var params = transformLink(task.params);
							tasks.push({company_id: params.company_id, task_id: task.id, market: null, market_package: params.market, store: null, store_id: params.itunes});
						}
						
						stopExitTimer();
						Start();
						
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

function Start(){
	if(tasks.length > 0 && status == READY_STATUS){
		curTask = tasks.shift();
		status = WORK_STATUS;
		Log("Current company= " + curTask.company_id);
		Execute(Constant.PLAY_MARKET);
	}
}

function End(){
	status = READY_STATUS;
	Start();
}

function Execute(target){
	var link = "";

	switch(target){
		case Constant.PLAY_MARKET:
			link = "https://play.google.com/store/apps/developer?id=" + curTask.market_package;
			//link = "https://play.google.com/store/apps/developer?id=Miniclip.com";
			parsePlayMarket(link);
			break;
		case Constant.APP_STORE:
			link = "https://itunes.apple.com/us/developer/" + curTask.store_id;
			//link = "https://itunes.apple.com/us/developer/id528065807";
			parseAppStore(link);
			break;
		case Constant.RELEASE:
			var games = new Array();
			for(var i = 0; i < curTask.market.length; i++){
				games.push({package: curTask.market[i].package, type: Constant.PLAY_MARKET, name: curTask.market[i].name});
			}
			for(var i = 0; i < curTask.store.length; i++){
				games.push({package: curTask.store[i].package, type: Constant.APP_STORE, name: curTask.store[i].name});
			}

			var response = {company_id: curTask.company_id, games: games};
			// params of url's body
			var bodyLink = "cancel_secure=1&phantom_id=" + Constant.PHANTOM_ID + "&tid=" + curTask.task_id +
						   "&response=" + encodeURIComponent(JSON.stringify(response));

			if(Constant.MODE == Constant.DEBUG_MODE){
				console.log(bodyLink);
			}

			// send info to the server
			najax(Constant.RESPONSE_LINK, "POST", bodyLink, function(res){
				End();
			});
			break;
		default:
			break;
	}
}

function parsePlayMarket(link){

	var isMore = true;
	var pageApps = 0;

	openPage(link, function(){

		setTimeout(function(){
			checkPage();
		}, 4000);

	});

	function checkPage(){

		var curApps = page.evaluate(function(){
			return document.querySelectorAll('div.id-card-list div.small').length;
		});

		if(pageApps != curApps){
			pageApps = curApps;

			page.evaluate(function(){
				document.body.scrollTop = document.body.scrollHeight;
			});

			setTimeout(function(){
				checkPage();
			}, 7000);
		}else{
			getInfo();
		}
	}

	function getInfo(){
		var response = page.evaluate(function() {
			var result = new Array();

			var packages = document.querySelectorAll('div.id-card-list div.small');
			var names = document.querySelectorAll('div.id-card-list div.small a.title');

			for(var i = 0; i < packages.length; i++){
				result[i] = {package: packages[i].getAttribute("data-docid"), name: names[i].getAttribute("title")};
			}

			return result;
		});
		if(response.length == 0){
			Log("0 games founded; " + "company: " + curTask.company_id + "; type: " + Constant.PLAY_MARKET);
		}

		curTask.market = response;
		Execute(Constant.APP_STORE);
	}
}

function parseAppStore(link){

	var games = new Array();
	var pageCounter = 0;

	nextPage(link);

	function nextPage(link){
		pageCounter++;
		var curLink = link + "?iPhoneSoftwarePage=" + pageCounter;
		openPage(curLink, function(){
			var response = page.evaluate(function() {
				var result = new Array();

				var albums = document.querySelectorAll('div.top-albums');
				for(var i = 0; i < albums.length; i++){
					if(albums[i].getAttribute("metrics-loc") == "Titledbox_iPhone Apps"){

						var apps = albums[i].querySelectorAll("div.application");
						for(var i = 0; i < apps.length; i++){
							result[i] = {package: "id"+apps[i].getAttribute("adam-id"), name: apps[i].getAttribute("preview-title")};
						}
					}
				}

			    return result;
			});

			games = games.concat(response);

			var next = page.evaluate(function(pageCounter){

				var albums = document.querySelectorAll('div.top-albums');
				for(var i = 0; i < albums.length; i++){
					if(albums[i].getAttribute("metrics-loc") == "Titledbox_iPhone Apps"){

						var links = albums[i].querySelectorAll("ul.paginate li a");
						for(var i = 0; i < links.length; i++){
							if(parseInt(links[i].innerText) == (pageCounter + 1)){
								return true;
							}
						}
						return false;

					}
				}
			}, pageCounter);

			if(next){
				nextPage(link);
			}else{
				//console.log(JSON.stringify(games));

				if(games.length == 0){
					Log("0 games founded; " + "company: " + curTask.company_id + "; type: " + Constant.APP_STORE);
				}

				curTask.store = games;
				Execute(Constant.RELEASE);
			}
		});
	}
}

function openPage(link, callback){
	page.open(link, function(status){

		if(Constant.MODE == Constant.DEBUG_MODE){
			console.log("Status: " + status);
		}
		if(status === 'success'){

			callback();

		}else{
			Log("Cannot open the page: " + link);
			setTimeout(function(){
				openPage(link, callback);
			}, 5000);
		}
	});
}

function najax(url, method, param, callback){
	if(Constant.MODE == Constant.DEBUG_MODE){
		console.log("request to "  + url + " with params:");
		console.log(param);
	}
	
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
			Log("Bad AJAX response= " + JSON.stringify(response));
			callback({status: 400, data: response});
		}
	});

	// test request
	//callback({status: 200, data: {response:{action:"getVeryUsers", status:"ok",message:"",object:{tasks:[{id:"1", params: "company_id=1&market=Miniclip.com&itunes=id528065807"}]},time:0.49165081977844}}});
}

function runExitTimer(){
	timer = setTimeout(function(){
		Log("End time of execute");
		phantom.exit();
	}, Constant.RUN_TIME);
}

function stopExitTimer(){
	clearTimeout(timer);
}

function transformLink(str){
	var result = {};

	var params = str.split("&");
	for(var i = 0; i < params.length; i++){
		var tmp = params[i].split("=");
		result[tmp[0]] = tmp[1];
	}

	return result;
}

function Log(str){
	/*
	var stream = fs.open('log.txt', 'w');
	stream.writeLine("------------------");
	stream.writeLine('-- ' + str);
	stream.close();*/
}
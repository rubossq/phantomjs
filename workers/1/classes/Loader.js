String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

var Loader = Base.extend({
	task_id: null,
	real_id: null,
	url: null,
	isExist: false,
	isPrivate: false,

	constructor: function(){
	
	},

	setTaskId: function(task_id){
		this.task_id = task_id;
	},

	getTaskId: function(){
		return this.task_id;
	},

	setRealId: function(real_id){
		this.real_id = real_id;
	},

	getRealId: function(){
		return this.real_id;
	},

	setUrl: function(url){
		this.url = url;
	},

	getUrl: function(){
		return this.url;
	},

	setIsExist: function(isExist){
		this.isExist = isExist;
	},

	getIsExist: function(){
		return this.isExist;
	},

	setIsPrivate: function(isPrivate){
		this.isPrivate = isPrivate;
	},

	getIsPrivate: function(){
		return this.isPrivate;
	},

	getPageData: function(data){
		// parse html content
		var scripts = data.match(/<script type="text\/javascript">(.*?)<\/script>/ig);
		var sharedData = null;
		for(var index in scripts){
			var script = scripts[index];
			if(script.indexOf("_sharedData") > -1){
				sharedData = script.replace("window._sharedData =", "");
				sharedData = sharedData.replaceAll(';', "");
				sharedData = sharedData.replace(/<script type="text\/javascript">/g, '');
				sharedData = sharedData.replace(/<\/script>/g, '');
				try{
					sharedData = JSON.parse(sharedData);
				}catch(e){
					sharedData = sharedData.replaceAll(';', "");
					sharedData = JSON.parse(sharedData);
				}
				
				break;
			}
		}
		return sharedData; 
	},

	parsePageData: function(sharedData){
		if(!sharedData) return {};

		var user = sharedData.entry_data.ProfilePage[0].user;

		// get num of followed_by
		var followed_by =  user.followed_by.count;
		// get num of you follows
		var follows = user.follows.count;
		// get full_name
		var full_name = user.full_name;
		// get id
		var id = user.id;
		// get is private account
		var is_private = sharedData.entry_data.ProfilePage[0].user.is_private;
		// get avatar
		var profile_src = user.profile_pic_url;
		// get username
		var username = user.username;
		// get num of posts
		var posts_count = user.media.count;
		

		// get links on posts
		var posts = new Array();
		if(!is_private){
			for(var i = 0; i < Constant.LAST_LINKS_COUNT; i++){
				if(!user.media.nodes[i]) break;
				posts.push(user.media.nodes[i]);
			}
		}
		
		return {followed_by: followed_by, follows: follows, full_name: full_name, id: id, is_private: is_private, 
			 profile_src: profile_src, username: username, posts_count: posts_count, posts: posts};
	},

	isObjEmpty: function(obj){

		// null and undefined are "empty"
		if (obj == null) return true;

		// Assume if it has a length property with a non-zero value
		// that that property is correct.
		if (obj.length > 0)    return false;
		if (obj.length === 0)  return true;

		// If it isn't an object at this point
		// it is empty, but it can't be anything *but* empty
		// Is it empty?  Depends on your application.
		if (typeof obj !== "object") return true;

		// Otherwise, does it have any properties of its own?
		// Note that this doesn't handle
		// toString and valueOf enumeration bugs in IE < 9
		for (var key in obj){
			if(hasOwnProperty.call(obj, key)) return false;
		}

		return true;
	}
});
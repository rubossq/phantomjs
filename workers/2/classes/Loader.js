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
				sharedData = sharedData.replace(";", "");
				sharedData = sharedData.replace(/<script type="text\/javascript">/g, '');
				sharedData = sharedData.replace(/<\/script>/g, '');
				sharedData = sharedData.replace(";", "");
				sharedData = JSON.parse(sharedData);
				break;
			}
		}
		return sharedData;
	},

	parsePageData: function(sharedData){
		if(!sharedData) return {};

		var post = sharedData.entry_data.PostPage[0].media;

		// get post's image
		var head =  post.display_src;
		// get post's code
		var meta = post.code;
		// get id
		var id = post.id;
		// get post's likes_count
		var likes_count = post.likes.count;
		// get post's owner's avatar
		var owner_head = post.owner.profile_pic_url;
		// get post's owner's nickname
		var owner_meta = post.owner.username;
		// get post's owner's private
		var owner_private = post.owner.is_private;
		
		return {head: head, meta: meta, id: id, likes_count: likes_count, 
			 owner_head: owner_head, owner_meta: owner_meta, owner_private: owner_private};
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
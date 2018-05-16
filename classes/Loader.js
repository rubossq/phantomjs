var Loader = Base.extend({
	id: null,
	url: null,
	type: null,
	data: {},
	isExist: false,
	isWrongType: false,
	isPrivate: false,

	constructor: function(){
	
	},

	setId: function(id){
		this.id = id;
	},

	getId: function(){
		return this.id;
	},

	setUrl: function(url){
		this.url = url;
	},

	getUrl: function(){
		return this.url;
	},

	setType: function(type){
		this.type = type;
	},

	getType: function(){
		return this.type;
	},

	setData: function(key, value){
		this.data[key] = value;
	},

	getData: function(){
		return this.data;
	},

	setIsExist: function(isExist){
		this.isExist = isExist;
	},

	getIsExist: function(){
		return this.isExist;
	},

	setWrongType: function(isWrongType){
		this.isWrongType = isWrongType;
	},

	getWrongType: function(){
		return this.isWrongType;
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

	parsePageData: function(type, sharedData){
		if(!sharedData) return {};

		switch(type){
			case Constant.LIKE_TYPE:
				var media = sharedData.entry_data.PostPage[0].graphql.shortcode_media;

				// get is private post
				var is_private = media.owner.is_private;

				// get target id of post
				var target_id = media.id;

				// get image of post
				var display_src = media.display_src;

				return {is_private: is_private, target_id: target_id, display_src: display_src};
			case Constant.SUBSCRIBE_TYPE:
				var user = sharedData.entry_data.ProfilePage[0].user;

				// get target_id
				var target_id = user.id;
				// get nickname
				var nickname = user.username;
				// get avatar
				var profile_src = user.profile_pic_url;
				// get num of followers
				var followers =  user.followed_by.count;
				// get num of you following
				var following = user.follows.count;
				// get num of posts
				var postsCount = user.media.count;
				// get is private account
				var is_private = sharedData.entry_data.ProfilePage[0].user.is_private;


				// get links on posts
				var postsLink = new Array();
				if(!is_private){
					for(var i = 0; i < Constant.LAST_LINKS_COUNT; i++){
						if(!user.media.nodes[i]) break;
						postsLink.push(user.media.nodes[i].thumbnail_src);
					}
				}
				
				return {target_id: target_id, nickname: nickname, profile_src: profile_src, followers: followers, following: following,
					postsCount: postsCount, is_private: is_private, posts: postsLink};
		}
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
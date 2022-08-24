var vlist = ['Tq4-IG2zE4E','i55tsAt4Hoo','cxsH6u6Ayw0','j4j301OHByg','k3ZYD5AliYU','CA3JoZxu804','EbZYtC6qv8s','h30tgQ1qffE','H6gN7qM4NOk','UTyNy3DfVzA','F9N6tcHL53c','LBhYzFW45V0', 'StCrsGbBqSQ'];
var vlist_current = [];

function shuffle(array) {
	var currentIndex = array.length, temporaryValue, randomIndex ;
	while (0 !== currentIndex) {
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}
	return array;
}

function playNext(player) {
	setTimeout(function(){
		if (vlist_current.length == 0) {
			vlist_current = vlist.slice(0);
			shuffle(vlist_current);
		}
		player.loadVideoById(vlist_current.pop());
	}, 5000 + Math.random() * 5000);
}

function onPlayerReady(event) {
	event.target.mute();
	event.target.playVideo();
}

function onPlayerStateChange(event) {
	if (event.data == 0) {
		event.target.getIframe().parentNode.classList.remove('active');
		playNext(event.target)
	} else if (event.data == 1) {
		event.target.getIframe().parentNode.classList.add('active');
	}
}

function onYouTubeIframeAPIReady() {
	var players = ['leftplayer', 'rightplayer']
	for (ii in players) {
		new YT.Player(players[ii], {
			videoId: vlist_current.pop(),
			playerVars: {
				'showinfo':0,
				'controls':0,
				'iv_load_policy':3,
				'modestbranding':1,
				'rel':0
			},
			events: {
				'onReady': onPlayerReady,
				'onStateChange': onPlayerStateChange
			}
		});
	}
}

vlist_current = vlist.slice(0);
shuffle(vlist_current);
window.onload = function(){

	document.getElementById('browserwarningclose').addEventListener('click', function(){
		document.getElementById('browserwarning').style.display="none";
		return false;
	});

	if(navigator.userAgent.indexOf("Chrome") == -1 && navigator.userAgent.indexOf("Firefox") == -1) {
		document.getElementById('browserwarning').style.display="block";
	}
};

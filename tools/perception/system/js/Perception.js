(function(global) {
	var $ = global.jQuery,
		PerceptualColor = global.PerceptualColor,
		requestAnimationFrame = global.requestAnimationFrame
			|| global.mozRequestAnimationFrame
			|| global.webkitRequestAnimationFrame;

	var appState = {
		colorModel:null,
		fixedDimension:null,
		selectedColor:null,
		convertedColor:null,
		renderedColor:null,
		gamutMappedColor:null,
		renderedGamutMappedColor:null,
		cvdProjection:null
	}

	var stateNotifiers = [],
		animators = [],
		Perception = {};

	var drawFrame = function() {
		for (var ii = 0, l = animators.length; ii < l; ii ++) {
			animators[ii]();
		}
		requestAnimationFrame(drawFrame);
	}

	Perception.setState = function(newState, origin) {
		$.extend(appState, newState, true);
		appState.convertedColor = new appState.colorModel(appState.selectedColor);
		appState.renderedColor = new PerceptualColor.SRGBColor(appState.selectedColor);
		if (appState.gamutMappedColor !== undefined && appState.gamutMappedColor !== null) {
			appState.renderedGamutMappedColor = new PerceptualColor.SRGBColor(appState.gamutMappedColor);
		} else {
			appState.renderedGamutMappedColor = null;
		}
		if (appState.cvdProjection !== undefined && appState.cvdProjection !== null) {
			$('.modeName').text('CVD');
		} else {
			$('.modeName').text(appState.colorModel.info.displayName);
		}
		for (var ii =0, l = stateNotifiers.length; ii< l; ii++) {
			if (stateNotifiers[ii](appState, origin)) break;
		}
	}

	Perception.getState = function() {
		return appState;
	}

	Perception.setSelectedColor = function(color, origin) {
		Perception.setState({selectedColor:color}, origin);
	}

	Perception.setColorModel = function(cm, origin) {
		Perception.setState({colorModel:cm}, origin);
	}

	Perception.setFixedDimension = function(dim, origin) {
		Perception.setState({fixedDimension:dim}, origin);
	}

	Perception.setGamutMappedColor = function(color, origin) {
		Perception.setState({gamutMappedColor:color}, origin);
	}

	Perception.setCVDProjection = function(proj, origin) {
		Perception.setState({cvdProjection:proj}, origin);
	}

	Perception.registerStateNotifier = function(callback) {
		stateNotifiers[stateNotifiers.length] = callback;
	}

	Perception.deregisterStateNotifier = function(callback) {
		stateNotifiers.remove(stateNotifiers.indexOf(callback));
	}

	Perception.registerAnimator = function(callback) {
		animators[animators.length] = callback;
	}

	Perception.deregisterAnimator = function(callback) {
		animators.remove(animators.indexOf(callback));
	}

	Perception.beginAnimation = function() {
		requestAnimationFrame(drawFrame);
	}

	Perception.modules = {};

	global.Perception = Perception;
})(window)
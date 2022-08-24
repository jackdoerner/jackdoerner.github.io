(function(global) {

	var	$ = global.jQuery,
		PerceptualColor = global.PerceptualColor,
		Perception = global.Perception;

	function getRandomId() {
		return new String(new Date().getTime()) + ((Math.random() * 999) | 0);
	}

	function gamutMapThree(origcolor, polarModel, cartesianModel) {
		var cartcolor = cartesianModel(origcolor);
		var outcolor = cartesianModel(cartcolor);
		var c = polarModel(cartcolor)[1];
		var delta = c;

		while (delta > 0.0005) {
			delta/=2.0;
			if (PerceptualColor.SRGBColor(outcolor).isDisplayable()) {
				c += delta;
			} else {
				c -= delta;
			}
			outcolor.set(cartcolor[0],cartcolor[1]*c, cartcolor[2]*c);
		}
		c -= delta;
		outcolor.set(cartcolor[0],cartcolor[1]*c, cartcolor[2]*c);

		return PerceptualColor.SRGBColor(outcolor).isDisplayable() ? outcolor : null;
	}

	var GamutMapper = function() {
		var uid = getRandomId();
		Perception.registerStateNotifier(function(newState, origin){
			if (origin !== uid) {
				if (newState.renderedColor.isDisplayable()) {
					if (newState.gamutMappedColor !== null) {
						Perception.setGamutMappedColor(null, uid);
						return true;
					}
				} else {
					if (newState.colorModel.info.name == "UCSHMJColor" || newState.colorModel.info.name == "UCSJABColor") {
						Perception.setGamutMappedColor(gamutMapThree(newState.selectedColor, PerceptualColor.UCSHMJColor, PerceptualColor.UCSJABColor), uid);
					} else {
						Perception.setGamutMappedColor(gamutMapThree(newState.selectedColor, PerceptualColor.HCLColor, PerceptualColor.LABColor), uid);
					}					
					return true;
				}
			}
		});
	}

	global.Perception.modules.GamutMapper = GamutMapper;
	
})(window);
(function(global) {

	var	$ = global.jQuery,
		PerceptualColor = global.PerceptualColor,
		Perception = global.Perception;

	function getRandomId() {
		return new String(new Date().getTime()) + ((Math.random() * 999) | 0);
	}

	var TrichromaticProjection = [1, 0, 0, 0, 1, 0, 0, 0, 1];

	var ProtanopicProjection = [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998];
	
	var DeuteranopicProjection = [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.011820, 0.042940, 0.968881];

	var TritanopicProjection= [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.303900];

	function setSwatch(appState, container, projection) {
		if (appState.renderedColor.isDisplayable()) {
			var rendered = appState.renderedColor.clampWithAlpha(projection);
			$('.mainSwatch', container).css({
				"background-color": "rgba("+rendered[0]+","+rendered[1]+","+rendered[2]+","+(rendered[3]/255)+")",
				"display":"block"
			});
			if (rendered[3] == 255) {
				container.attr('title', 'Post-projection: ' + appState.renderedColor.toString(projection));
			} else {
				container.attr('title', 'The selected color is not displayable under this CVD projection');
			}
			$('.gmSwatch', container).css({
				"display":"none"
			});
		} else if (appState.gamutMappedColor !== null && appState.gamutMappedColor !== undefined) {
			var rendered = appState.renderedGamutMappedColor.clampWithAlpha(projection);
			$('.gmSwatch', container).css({
				"background-color": "rgba("+rendered[0]+","+rendered[1]+","+rendered[2]+","+rendered[3]/255+")",
				"display":"block"
			});
			if (rendered[3] == 255) {
				container.attr('title', 'The selected color is undisplayable. Closest displayable color shown.');
			} else {
				container.attr('title', 'The selected color is undisplayable. Closest displayable color is not displayable under this CVD projection');
			}
			$('.mainSwatch', container).css({
				"display":"none"
			});
		} else {
			$('.gmSwatch', container).css({
				"display":"none"
			});
			$('.mainSwatch', container).css({
				"display":"none"
			});
			container.attr('title', 'The selected color is undisplayable and cannot be gamut mapped.');
		}
	}

	var CVDView = function(target) {
		
		var uid = getRandomId(),
			appState = null;

		$(target).html("<div class='CVDView' id='"+uid+"'>\
					<div class='trichromacy'><div class='swatch'><div class='mainSwatch'></div><div class='gmSwatch'></div></div><div class='swatchLabel'>Normal</div></div>\
					<div class='protanopia'><div class='swatch'><div class='mainSwatch'></div><div class='gmSwatch'></div></div><div class='swatchLabel'>Protanopia</div></div>\
					<div class='controls'>\
							<label title='Color Vision Deficiency Simulation'>\
								DALTONIZER\
							</label>\
							<div class='CVDSimMode btn-toolbar btn-group-toggle' data-toggle='buttons' role='toolbar'>\
								<div class='btn-group' role='group'>\
									<label class='btn btn-outline-secondary active' title='Normal'><input type='radio' class='mode_button trichromacy' checked>N</label>\
									<label class='btn btn-outline-secondary' title='Protanopia'><input type='radio' class='mode_button protanopia'>P</label>\
									<label class='btn btn-outline-secondary' title='Deuteranopia'><input type='radio' class='mode_button deuteranopia'>D</label>\
									<label class='btn btn-outline-secondary' title='Tritanopia'><input type='radio' class='mode_button tritanopia'>T</label>\
								</div>\
							</div>\
					</div>\
					<div class='deuteranopia'><div class ='swatch'><div class='mainSwatch'></div><div class='gmSwatch'></div></div><div class='swatchLabel'>Deuteranopia</div></div>\
					<div class='tritanopia'><div class ='swatch'><div class='mainSwatch'></div><div class='gmSwatch'></div></div><div class='swatchLabel'>Tritanopia</div></div>\
			</div>");
					
		var container = $('.CVDView', target)[0];

		$('.CVDSimMode .trichromacy', container).click(function(){
			Perception.setCVDProjection(null, uid);
		});
		$('.CVDSimMode .protanopia', container).click(function(){
			Perception.setCVDProjection(ProtanopicProjection, uid);
		});
		$('.CVDSimMode .deuteranopia', container).click(function(){
			Perception.setCVDProjection(DeuteranopicProjection, uid);
		});
		$('.CVDSimMode .tritanopia', container).click(function(){
			Perception.setCVDProjection(TritanopicProjection, uid);
		});

		Perception.registerStateNotifier(function(newState, origin) {
			var appState = Perception.getState();
			setSwatch(appState, $('.trichromacy .swatch', container), null);
			setSwatch(appState, $('.protanopia .swatch', container), ProtanopicProjection);
			setSwatch(appState, $('.deuteranopia .swatch', container), DeuteranopicProjection);
			setSwatch(appState, $('.tritanopia .swatch', container), TritanopicProjection);
		});

		$(target).append(container);

	}

	global.Perception.modules.CVDView = CVDView;
	
})(window);
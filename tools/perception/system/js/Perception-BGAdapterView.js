(function(global) {

	var	$ = global.jQuery,
		PerceptualColor = global.PerceptualColor,
		Perception = global.Perception,
		min_bg_lum = 0.0001;

	function getRandomId() {
		return new String(new Date().getTime()) + ((Math.random() * 999) | 0);
	}

	function setSwatch(appState, targetConfig, container, projection) {
		if(appState.localNoAdapt !== undefined) {
			var rendered = appState.localNoAdapt.toString()
			$('.mainSwatch', container).css({
				"background-color": rendered,
				"display":"block"
			});
			$('.gmSwatch', container).css({
				"display":"none"
			});
			container.attr('title', rendered);
		} else {
			var cam = new PerceptualColor.CAM16Color(appState.selectedColor);
			cam.setEnvFromConfig(targetConfig);
			var adaptedColor = new PerceptualColor.SRGBColor(cam);
			var adaptedGMColor = null;
			if (appState.gamutMappedColor !== null && appState.gamutMappedColor !== undefined && appState.renderedGamutMappedColor.isDisplayable()) {
				var cam = new PerceptualColor.CAM16Color(appState.gamutMappedColor);
				cam.setEnvFromConfig(targetConfig);
				adaptedGMColor = new PerceptualColor.SRGBColor(cam);
			}

			if(appState.renderedColor.isDisplayable()) {
				var rendered = adaptedColor.clampWithAlpha(projection, true);
				$('.mainSwatch', container).css({
					"background-color": "rgba("+rendered[0]+","+rendered[1]+","+rendered[2]+","+(rendered[3]/255)+")",
					"display":"block"
				});
				if (rendered[3] == 255) {
					container.attr('title', 'Post-adaptation: ' + adaptedColor.toString(projection));
				} else {
					container.attr('title', 'The equivalent color against this background is undisplayable.');
				}
				$('.gmSwatch', container).css({
					"display":"none"
				});
			} else if (adaptedGMColor !== null) {
				var rendered = adaptedGMColor.clampWithAlpha(projection, true);
				$('.gmSwatch', container).css({
					"background-color": "rgba("+rendered[0]+","+rendered[1]+","+rendered[2]+","+rendered[3]/255+")",
					"display":"block"
				});
				if (rendered[3] == 255) {
					container.attr('title', 'The selected color is undisplayable. Closest displayable color shown.');
				} else {
					container.attr('title', 'The selected color is undisplayable. The equivalent against this background to the closest displayable color is undisplayable.');
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
	}

	var BGAdapterView = function(target) {
		
		var uid = getRandomId(),
			appState = null,
			targetConfig = {"background_luminance":min_bg_lum},
			bg_color = new PerceptualColor.SRGBColor(0,0,0);

		$(target).html("<div class='BGAdapterView' id='"+uid+"'><div class='bg'>\
					<div class='title text-con'>BACKGROUND ADAPTER</div>\
					<div class='adapted'><div class='swatch border-con'><div class='mainSwatch'></div><div class='gmSwatch'></div></div><div class='swatchLabel text-con'>Equivalent</div></div>\
					<div class='controls form-inline input-group-sm'>\
						<label title='Equivalent color hex code' for='"+uid+"_hexinput' class='mr-2 text-con'>\
							Hex\
						</label>\
						<input class='form-control border-con text-highcon' id='"+uid+"_hexinput' type='text'>\
						<label title='Background color hex code' for='"+uid+"_bginput' class='mr-2 text-con ml-5'>\
							BG Hex\
						</label>\
						<input class='form-control border-con text-highcon' id='"+uid+"_bginput' type='text' value='#000000'>\
					</div>\
			</div></div>");

		var container = $('.BGAdapterView', target)[0];

		var renderbg = function() {
			var renderedbg = bg_color.clampWithAlpha(appState.cvdProjection);
			$('.bg', container).css({"background-color":"rgba("+renderedbg[0]+","+renderedbg[1]+","+renderedbg[2]+","+renderedbg[3]/255+")"});
			var lab = new PerceptualColor.LABColor(bg_color),
				con, highcon;
			if (renderedbg[3] < 255) {
				lab.set(50+0.5*lab[0]-45,0,0);
				con = new PerceptualColor.SRGBColor(lab);
				lab.set(Math.max(lab[0]-25,0),0,0);
				highcon = new PerceptualColor.SRGBColor(lab);
			} else if (lab[0] >= 50) {
				lab.set(lab[0]-45,0,0);
				con = new PerceptualColor.SRGBColor(lab);
				lab.set(Math.max(lab[0]-25,0),0,0);
				highcon = new PerceptualColor.SRGBColor(lab);
			} else {
				lab.set(lab[0]+45,0,0);
				con = new PerceptualColor.SRGBColor(lab);
				lab.set(Math.min(lab[0]+25,100),0,0);
				highcon = new PerceptualColor.SRGBColor(lab);
			}
			var renderedcon = con.toString();
			var renderedhighcon = highcon.toString();
			$('.border-con', container).css({"border-color":renderedcon});
			$('.text-con', container).css({"color":renderedcon});
			$('.text-highcon', container).css({"color":renderedhighcon});
		}

		$('input#'+uid+'_hexinput', target).change(function(ev){
			var rgb = new PerceptualColor.SRGBColor($(ev.target)[0].value);
			if (rgb !== null && rgb.length === 3) {
				var dummy = new PerceptualColor.CAM16Color(0,0,0);
				dummy.setEnvFromConfig(targetConfig);
				var cam = PerceptualColor.CAM16Color(rgb, null, null, dummy.env);
				cam.setEnvFromConfig({});
				setSwatch({"localNoAdapt":rgb}, targetConfig, $('.adapted .swatch', container), appState.cvdProjection);
				Perception.setSelectedColor(cam, uid);
			}
		});

		$('input#'+uid+'_hexinput', target).keyup(function(ev){
			$(ev.target).change();
		});

		$('input#'+uid+'_bginput', target).change(function(ev){
			var rgb = new PerceptualColor.SRGBColor($(ev.target)[0].value);
			if (rgb !== null && rgb.length === 3) {
				bg_color = rgb;
				renderbg();

				var lum = Math.max(bg_color.toXYZ()[1], min_bg_lum);
				targetConfig.background_luminance = lum;
				setSwatch(appState, targetConfig, $('.adapted .swatch', container), appState.cvdProjection);
				var cam = new PerceptualColor.CAM16Color(appState.selectedColor);
				cam.setEnvFromConfig(targetConfig);
				var srgb = new PerceptualColor.SRGBColor(cam);
				if (srgb.isDisplayable()) {
					$('input#'+uid+'_hexinput', container)[0].value = srgb.toString();
				} else {
					$('input#'+uid+'_hexinput', container)[0].value = null;
				}
			}
		});

		$('input#'+uid+'_bginput', target).keyup(function(ev){
			$(ev.target).change();
		});

		Perception.registerStateNotifier(function(newState, origin) {
			appState = newState;
			var cam = new PerceptualColor.CAM16Color(appState.selectedColor);
			cam.setEnvFromConfig(targetConfig);
			var srgb = new PerceptualColor.SRGBColor(cam);
			if (srgb.isDisplayable() && appState.renderedColor.isDisplayable()) {
				if (origin !== uid) $('input#'+uid+'_hexinput', container)[0].value = srgb.toString();
			} else {
				if (origin !== uid) $('input#'+uid+'_hexinput', container)[0].value = null;
			}

			if (origin !== uid) setSwatch(appState, targetConfig, $('.adapted .swatch', container), appState.cvdProjection);
			
			renderbg();
		});

		$(target).append(container);

	}

	global.Perception.modules.BGAdapterView = BGAdapterView;
	
})(window);
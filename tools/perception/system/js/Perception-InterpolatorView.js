(function(global) {

	var	$ = global.jQuery,
		PerceptualColor = global.PerceptualColor,
		Perception = global.Perception;

	function getRandomId() {
		return new String(new Date().getTime()) + ((Math.random() * 999) | 0);
	}

	function setSwatch(appState, container, projection) {
		if(appState.renderedColor.isDisplayable()) {
			var rendered = appState.renderedColor.clampWithAlpha(projection);
			$('.mainSwatch', container).css({
				"background-color": "rgba("+rendered[0]+","+rendered[1]+","+rendered[2]+","+(rendered[3]/255)+")",
				"display":"block"
			});
			container.attr('title', appState.renderedColor.toString());
			$('.gmSwatch', container).css({
				"display":"none"
			});
		} else if (appState.gamutMappedColor !== null && appState.gamutMappedColor !== undefined) {
			var rendered = appState.renderedGamutMappedColor.clampWithAlpha(projection);
			$('.gmSwatch', container).css({
				"background-color": "rgba("+rendered[0]+","+rendered[1]+","+rendered[2]+","+rendered[3]/255+")",
				"display":"block"
			});
			container.attr('title', 'The selected color is undisplayable. Closest displayable color shown.');
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

	function updateInterpolation(color1, color2, mode, steps, polarModel, cartesianModel, cvdprojection, container, uid){
		var interpolator = new PerceptualColor.ColorScale(color1, color2, polarModel, cartesianModel);
		container.empty();
		for (var ii = 0; ii < steps; ii++) {
			(function() {
				var thiscolor;
				if (mode == 'l') {
					thiscolor = interpolator.interpolateLeft((ii+1)/(1.0*(steps+1)));
				} else if (mode == 'r') {
					thiscolor = interpolator.interpolateRight((ii+1)/(1.0*(steps+1)));
				} else {
					thiscolor = interpolator.interpolate((ii+1)/(1.0*(steps+1)));
				}

				var displaycolor = PerceptualColor.SRGBColor(thiscolor);
				if (displaycolor.isDisplayable()) {
					var rendered = displaycolor.clampWithAlpha(cvdprojection);
					$("<div title='"+displaycolor.toString()+"' style='width:"+(100.0/steps)+"%;left:"+((100.0*ii)/steps)+"%;background-color:rgba("+rendered[0]+","+rendered[1]+","+rendered[2]+","+rendered[3]/255+");'></div>")
						.click(function(){
							Perception.setSelectedColor(thiscolor, uid);
						}).appendTo(container);
				}
			})();
		}
	}

	var InterpolatorView = function(target) {
		
		var uid = getRandomId(),
			appState = null,
			leftState = null,
			rightState = null,
			polarModel = PerceptualColor.HCLColor,
			cartesianModel = PerceptualColor.LABColor,
			mode = 'c',
			steps = 5;

		$(target).html("<div class='InterpolatorView' id='"+uid+"'>\
				<div class='left'><div class ='swatch'><div class='mainSwatch'></div><div class='gmSwatch'></div></div><div class='swatchLabel'><a class='set'>Set</a>&nbsp;&bull;&nbsp;<a class='rec'>Recall</a></div></div>\
				<div class ='middle'>INTERPOLATOR\
					<div class='interpolationOutput'>\
					</div>\
					<div class='controls'>\
						<label title='Style'>\
							Style\
						</label>\
						<div class='interpolatorMode btn-toolbar btn-group-toggle' data-toggle='buttons' role='toolbar'>\
							<div class='btn-group' role='group'>\
								<label class='btn btn-outline-secondary' title='Clockwise Polar Interpolation'><input type='radio' class='mode_button left_interp'><span>&larr;<span></label>\
								<label class='btn btn-outline-secondary active' title='Cartesian Interpolation'><input type='radio' class='mode_button lab_interp' checked><span>&nbsp;&#x2195&nbsp;</span></label>\
								<label class='btn btn-outline-secondary' title='Counterclockwise Polar Interpolation'><input type='radio' class='mode_button right_interp'><span>&rarr;</span></label>\
							</div>\
						</div>\
						<label title='Steps' for='"+uid+"_input_steps'>\
							Steps\
						</label>\
						<div class='interpolatorSteps'><div class='input-group'><input type='number' step='1' min='1' max='50' value='5' class='form-control' id='"+uid+"_input_steps' /></div></div>\
					</div>\
				</div>\
				<div class='right'><div class ='swatch'><div class='mainSwatch'></div><div class='gmSwatch'></div></div><div class='swatchLabel'><a class='set'>Set</a>&nbsp;&bull;&nbsp;<a class='rec'>Recall</a></div></div>\
			</div>");
					
		var container = $('.InterpolatorView', target)[0];
		$('.left .set', container).click(function(){
			leftState = $.extend(true, {}, Perception.getState());
			setSwatch(leftState, $('.left > .swatch', container), appState.cvdProjection);
			updateInterpolation(leftState.selectedColor, rightState.selectedColor, mode, steps, polarModel, cartesianModel, appState.cvdProjection, $(".interpolationOutput", container), uid);
		});
		$('.right .set', container).click(function(){
			rightState = $.extend(true, {}, Perception.getState());
			setSwatch(rightState, $('.right > .swatch', container), appState.cvdProjection);
			updateInterpolation(leftState.selectedColor, rightState.selectedColor, mode, steps, polarModel, cartesianModel, appState.cvdProjection, $(".interpolationOutput", container), uid);
		});
		$('.left .rec', container).click(function(){
			Perception.setSelectedColor(leftState.selectedColor, uid);
		});
		$('.right .rec', container).click(function(){
			Perception.setSelectedColor(rightState.selectedColor, uid);
		});
		$('.left_interp', container).click(function() {
			mode = 'l';
			updateInterpolation(leftState.selectedColor, rightState.selectedColor, mode, steps, polarModel, cartesianModel, appState.cvdProjection, $(".interpolationOutput", container), uid);
		});
		$('.lab_interp', container).click(function() {
			mode = 'c';
			updateInterpolation(leftState.selectedColor, rightState.selectedColor, mode, steps, polarModel, cartesianModel, appState.cvdProjection, $(".interpolationOutput", container), uid);
		});
		$('.right_interp', container).click(function() {
			mode = 'r';
			updateInterpolation(leftState.selectedColor, rightState.selectedColor, mode, steps, polarModel, cartesianModel, appState.cvdProjection, $(".interpolationOutput", container), uid);
		});


		var input = $('input#'+uid+"_input_steps", container);

		input.change(function(ev){
			steps = +ev.target.value;
			updateInterpolation(leftState.selectedColor, rightState.selectedColor, mode, steps, polarModel, cartesianModel, appState.cvdProjection, $(".interpolationOutput", container), uid);
		});

		Perception.registerStateNotifier(function(newState, origin) {
			if (origin !== uid) {
				appState = newState;
				if (leftState === null) leftState = $.extend(true, {}, newState);
				if (rightState === null) rightState = $.extend(true, {}, newState);
				if (appState.colorModel.info.name == "UCSJABColor" || appState.colorModel.info.name == "UCSHMJColor") {
					polarModel = PerceptualColor.UCSHMJColor;
					cartesianModel = PerceptualColor.UCSJABColor;
				} else {
					polarModel = PerceptualColor.HCLColor;
					cartesianModel = PerceptualColor.LABColor;
				}
				setSwatch(leftState, $('.left > .swatch', container), appState.cvdProjection);
				setSwatch(rightState, $('.right > .swatch', container), appState.cvdProjection);
				updateInterpolation(leftState.selectedColor, rightState.selectedColor, mode, steps, polarModel, cartesianModel, appState.cvdProjection, $(".interpolationOutput", container));
			}
		});

		$(target).append(container);

	}

	global.Perception.modules.InterpolatorView = InterpolatorView;
	
})(window);
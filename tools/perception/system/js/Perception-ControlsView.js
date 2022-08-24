(function(global){

	var zRange = 500,
		$ = global.jQuery,
		PerceptualColor = global.PerceptualColor,
		Perception = global.Perception;

	function getRandomId() {
		return new String(new Date().getTime()) + ((Math.random() * 999) | 0);
	}

	// Returns a function, that, when invoked, will only be triggered at most once
	// during a given window of time. Normally, the throttled function will run
	// as much as it can, without ever going more than once per `wait` duration;
	// but if you'd like to disable the execution on the leading edge, pass
	// `{leading: false}`. To disable execution on the trailing edge, ditto.
	function throttle(func, wait, options) {
	  var context, args, result;
	  var timeout = null;
	  var previous = 0;
	  if (!options) options = {};
	  var later = function() {
	    previous = options.leading === false ? 0 : Date.now();
	    timeout = null;
	    result = func.apply(context, args);
	    if (!timeout) context = args = null;
	  };
	  return function() {
	    var now = Date.now();
	    if (!previous && options.leading === false) previous = now;
	    var remaining = wait - (now - previous);
	    context = this;
	    args = arguments;
	    if (remaining <= 0 || remaining > wait) {
	      if (timeout) {
	        clearTimeout(timeout);
	        timeout = null;
	      }
	      previous = now;
	      result = func.apply(context, args);
	      if (!timeout) context = args = null;
	    } else if (!timeout && options.trailing !== false) {
	      timeout = setTimeout(later, remaining);
	    }
	    return result;
	  };
	};

	function getColorValue(ColorModel, fixedDim, oldColor, zPos) {
		var color;
		switch (fixedDim) {
			case 0:
				var dim0Range = Math.abs(ColorModel.info.dimensions[0].bounds[1]) + Math.abs(ColorModel.info.dimensions[0].bounds[0]);
				color = [
					((zPos / zRange) * dim0Range) + ColorModel.info.dimensions[0].bounds[0],
					//((xPos / renderWidth) * dim1Range) + ColorModel.info.dimensions[1].bounds[0],
					//((yPos / renderHeight) * dim2Range) + ColorModel.info.dimensions[2].bounds[0]
					oldColor[1],
					oldColor[2]
				];
				break;
			case 1:
				var dim1Range = Math.abs(ColorModel.info.dimensions[1].bounds[1]) + Math.abs(ColorModel.info.dimensions[1].bounds[0]);
				color = [
					//((xPos / renderWidth) * dim0Range) + ColorModel.info.dimensions[0].bounds[0],
					oldColor[0],
					((zPos / zRange) * dim1Range) + ColorModel.info.dimensions[1].bounds[0],
					//((yPos / renderHeight) * dim2Range) + ColorModel.info.dimensions[2].bounds[0]
					oldColor[2]
				];
				break;
			case 2:
				var dim2Range = Math.abs(ColorModel.info.dimensions[2].bounds[1]) + Math.abs(ColorModel.info.dimensions[2].bounds[0]);
				color = [
					//((xPos / renderWidth) * dim0Range) + ColorModel.info.dimensions[0].bounds[0],
					//((yPos / renderHeight) * dim1Range) + ColorModel.info.dimensions[1].bounds[0],
					oldColor[0],
					oldColor[1],
					((zPos / zRange) * dim2Range) + ColorModel.info.dimensions[2].bounds[0]
				];
				break;
		}
		return new ColorModel(color);
	}

	function getColorZPosition(ColorModel, fixedDim, val) {
		return zRange * (val - ColorModel.info.dimensions[fixedDim].bounds[0]) / (ColorModel.info.dimensions[fixedDim].bounds[1] - ColorModel.info.dimensions[fixedDim].bounds[0]);
	}
	
	ControlsView = function(target) {
		var uid = getRandomId(),
			appState = null;

		$(target).html("<div class='ControlsView' id='"+uid+"'>\
				<div class ='swatch'><div class='mainSwatch'></div><div class='gmSwatch'></div></div>\
				<div class='fixedDimSlider'>\
					<input type='range' class='fixedDimSliderInput form-control-range' min='0' max='"+zRange+"' value='"+zRange/2+"' step='1'/>\
				</div>\
				<div class='dimensionControls'><div class='btn-group-toggle btn-group mr-2' data-toggle='buttons' role='group'>\
					<label class='btn btn-outline-secondary' title='CIELab Color Model'><input type='radio' class='lab_model'>Lab</label>\
					<label class='btn btn-outline-secondary active' title='CIECAM16-UCS Color Model'><input type='radio' class='ucs_model' checked>UCS</label>\
				</div><div class='btn-toolbar btn-group-toggle' data-toggle='buttons' role='toolbar'>\
					<div class='btn-group ucs_button_group mr-2' role='group'>\
						<label class='btn btn-outline-secondary' title='Hue'><input type='radio' class='hmj_0'>h</label>\
						<label class='btn btn-outline-secondary' title='Colorfulness'><input type='radio' class='hmj_1'>M</label>\
						<label class='btn btn-outline-secondary active' title='Lightness'><input type='radio' class='hmj_2' checked>J</label>\
					</div>\
					<div class='btn-group ucs_button_group' role='group'>\
						<label class='btn btn-outline-secondary' title='Lightness'><input type='radio' class='jab_0'>J</label>\
						<label class='btn btn-outline-secondary' title='Red/Green'><input type='radio' class='jab_1'>a</label>\
						<label class='btn btn-outline-secondary' title='Yellow/Blue'><input type='radio' class='jab_2'>b</label>\
					</div>\
					<div class='btn-group lab_button_group mr-2 hide' role='group'>\
						<label class='btn btn-outline-secondary' title='Hue'><input type='radio' class='hcl_0'>h</label>\
						<label class='btn btn-outline-secondary' title='Chroma'><input type='radio' class='hcl_1'>C</label>\
						<label class='btn btn-outline-secondary' title='Luminance'><input type='radio' class='hcl_2'>L</label>\
					</div>\
					<div class='btn-group lab_button_group hide' role='group'>\
						<label class='btn btn-outline-secondary' title='Luminance'><input type='radio' class='lab_0'>L</label>\
						<label class='btn btn-outline-secondary' title='Red/Green'><input type='radio' class='lab_1'>a</label>\
						<label class='btn btn-outline-secondary' title='Yellow/Blue'><input type='radio' class='lab_2'>b</label>\
					</div>\
				</div></div>\
				<!--<div class='dimensionText'></div>-->\
		</div>");

		var container = $('#' + uid)[0];

		$('.fixedDimSliderInput', container).on('input', throttle(function(ev){
			var newColor = getColorValue(appState.colorModel, appState.fixedDimension, appState.convertedColor, ev.target.value);
			Perception.setSelectedColor(newColor, uid);
		},50));

		$('.lab_model', container).click(function(){
			$('.lab_button_group', container).removeClass('hide');
			$('.ucs_button_group', container).addClass('hide');
		});

		$('.ucs_model', container).click(function(){
			$('.lab_button_group', container).addClass('hide');
			$('.ucs_button_group', container).removeClass('hide');
		});

		$('.hmj_0', container).click(function(){
			Perception.setState({
				colorModel: PerceptualColor.UCSHMJColor,
				fixedDimension: 0
			});
		});

		$('.hmj_1', container).click(function(){
			Perception.setState({
				colorModel: PerceptualColor.UCSHMJColor,
				fixedDimension: 1
			});
		});

		$('.hmj_2', container).click(function(){
			Perception.setState({
				colorModel: PerceptualColor.UCSHMJColor,
				fixedDimension: 2
			});
		});

		$('.jab_0', container).click(function(){
			Perception.setState({
				colorModel: PerceptualColor.UCSJABColor,
				fixedDimension: 0
			});
		});

		$('.jab_1', container).click(function(){
			Perception.setState({
				colorModel: PerceptualColor.UCSJABColor,
				fixedDimension: 1
			});
		});

		$('.jab_2', container).click(function(){
			Perception.setState({
				colorModel: PerceptualColor.UCSJABColor,
				fixedDimension: 2
			});
		});

		$('.hcl_0', container).click(function(){
			Perception.setState({
				colorModel: PerceptualColor.HCLColor,
				fixedDimension: 0
			});
		});

		$('.hcl_1', container).click(function(){
			Perception.setState({
				colorModel: PerceptualColor.HCLColor,
				fixedDimension: 1
			});
		});

		$('.hcl_2', container).click(function(){
			Perception.setState({
				colorModel: PerceptualColor.HCLColor,
				fixedDimension: 2
			});
		});

		$('.lab_0', container).click(function(){
			Perception.setState({
				colorModel: PerceptualColor.LABColor,
				fixedDimension: 0
			});
		});

		$('.lab_1', container).click(function(){
			Perception.setState({
				colorModel: PerceptualColor.LABColor,
				fixedDimension: 1
			});
		});

		$('.lab_2', container).click(function(){
			Perception.setState({
				colorModel: PerceptualColor.LABColor,
				fixedDimension: 2
			});
		});

		Perception.registerStateNotifier(function(newState, origin) {
			appState = newState;
			if(appState.renderedColor.isDisplayable()) {
				var rendered = appState.renderedColor.clampWithAlpha(appState.cvdProjection);
				$('.mainSwatch', container).css({
					"background-color": "rgba("+rendered[0]+","+rendered[1]+","+rendered[2]+","+(rendered[3]/255)+")",
					"display":"block"
				});
				$('.gmSwatch', container).css({
					"display":"none"
				});
				$('.swatch', container).attr('title', appState.renderedColor.toString());
			} else if (appState.gamutMappedColor !== null && appState.gamutMappedColor !== undefined) {
				var rendered = appState.renderedGamutMappedColor.clampWithAlpha(appState.cvdProjection);
				$('.gmSwatch', container).css({
					"background-color": "rgba("+rendered[0]+","+rendered[1]+","+rendered[2]+","+(rendered[3]/255)+")",
					"display":"block"
				});
				$('.mainSwatch', container).css({
					"display":"none"
				});
				$('.swatch', container).attr('title', 'The selected color is undisplayable. Closest displayable color shown.');
			}  else {
				$('.gmSwatch', container).css({
					"display":"none"
				});
				$('.mainSwatch', container).css({
					"display":"none"
				});
				$('.swatch', container).attr('title', 'The selected color is undisplayable and cannot be gamut mapped.');
			}
			$('.fixedDimSliderInput', container)[0].value = getColorZPosition(appState.colorModel, appState.fixedDimension, appState.convertedColor[appState.fixedDimension]);
			//$('.dimensionText').text(appState.colorModel.info.dimensions[appState.fixedDimension].desc);
			//$('.dim_button', container).removeClass('active');
			//$('.dim_button.'+appState.colorModel.info.shortName+'_'+appState.fixedDimension).addClass('active');
		});
	}

	global.Perception.modules.ControlsView = ControlsView;

})(window);
(function(global) {

	var	$ = global.jQuery,
		PerceptualColor = global.PerceptualColor,
		Perception = global.Perception;

	function getRandomId() {
		return new String(new Date().getTime()) + ((Math.random() * 999) | 0);
	}

	var NumericView = function(target) {
		var uid = getRandomId(),
			container = $("<div class='NumericView' id='"+uid+"'></div>"),
			colorModels = [
				[PerceptualColor.HCLColor, PerceptualColor.LABColor],
				[PerceptualColor.UCSHMJColor, PerceptualColor.UCSJABColor],
				PerceptualColor.SRGBColor
			],
			ii, jj, tempContainer;

		$(target).append('<div class="HexView">\
				<div class="form-inline input-group-sm">\
					<label title="Hex color code" for="'+uid+'_input" class="w-25">\
						Hex\
					</label>\
					<input class="form-control w-75" id="'+uid+'_input" type="text">\
				</div>\
				<div class="imaginaryWarning text-error">Closest Displayable Color:&nbsp;&nbsp;<a class="gamutmapped"></a></div>\
				<div class="gamutMapWarning text-error">Gamut mapping failed for this color</div>\
			</div>');

		var hexcontainer = $('.HexView', target)[0];
		$('.gamutmapped', hexcontainer).click(function(){
			var lastGMColor = Perception.getState().gamutMappedColor;
			if (lastGMColor !== null) Perception.setSelectedColor(lastGMColor, uid);
		});

		Perception.registerStateNotifier(function(newState, origin){
			if (newState.renderedColor.isDisplayable()) {
				if (origin !== uid) $('input#'+uid+'_input', hexcontainer)[0].value = newState.renderedColor.toString();
				$('.imaginaryWarning', hexcontainer).hide();
				$('.gamutMapWarning', hexcontainer).hide();
			} else if (newState.gamutMappedColor !== null && newState.gamutMappedColor !== undefined) {
				if (origin !== uid) $('input#'+uid+'_input', hexcontainer)[0].value = null;
				$('.gamutmapped', hexcontainer).text(newState.renderedGamutMappedColor.toString());
				$('.imaginaryWarning', hexcontainer).show();
				$('.gamutMapWarning', hexcontainer).hide();
			} else {
				if (origin !== uid) $('input#'+uid+'_input', hexcontainer)[0].value = null;
				$('.imaginaryWarning', hexcontainer).hide();
				$('.gamutMapWarning', hexcontainer).show();
			}
		});

		$('input#'+uid+'_input', hexcontainer).change(function(ev){
			var rgb = new PerceptualColor.SRGBColor($(ev.target)[0].value);
			if (rgb !== null && rgb.length === 3) {
				Perception.setSelectedColor(rgb, uid);
			}
		});

		$('input#'+uid+'_input', hexcontainer).keyup(function(ev){
			$(ev.target).change();
		});


		for (ii = 0; ii < colorModels.length; ii ++) {
			tempContainer = $('<div>');
			var builder = function(ii, jj, model) {
					var uid = getRandomId();
					$(tempContainer).append("<div class='form-inline input-group-sm w-100'><label title='"+model.info.dimensions[jj].desc+"' for='"+uid+"_input_"+model.info.shortName+"_"+model.info.dimensions[jj].name+"'>\
						"+model.info.dimensions[jj].displayName+"\
					</label><input type='number' step='any' min='"+model.info.dimensions[jj].bounds[0]+"' max='"+model.info.dimensions[jj].bounds[1]+"' class='form-control w-75' id='"+uid+"_input_"+model.info.shortName+"_"+model.info.dimensions[jj].name+"' placeholder='"+model.info.dimensions[jj].desc+"' />\
					</div>");
					var input = $('input#'+uid+"_input_"+model.info.shortName+"_"+model.info.dimensions[jj].name, tempContainer);
					Perception.registerStateNotifier(function(newState, origin) {
						if (origin !== uid) {
							var tempColor = new model(newState.selectedColor);
							input[0].value=tempColor[jj].toFixed(2);	
						}
					});	
					input.change(function(ev){
						var color = new model(Perception.getState().selectedColor);
						color[jj] = +ev.target.value;
						Perception.setSelectedColor(color, uid);
					});
					input.keyup(function(ev){
						input.change();
					});
				};

			if (colorModels[ii] instanceof Array) {
				for (jj=0; jj < colorModels[ii][0].info.dimensions.length; jj++) {
					builder(ii, jj, colorModels[ii][0]);
				} 
				for (kk=1; kk<colorModels[ii].length; kk++) {
					for (jj=1; jj < colorModels[ii][kk].info.dimensions.length; jj++) {
						builder(ii, jj, colorModels[ii][kk]);
					} 
				}
			} else {
				for (jj=0; jj < colorModels[ii].info.dimensions.length; jj++) {
					builder(ii, jj, colorModels[ii]);
				}
			}
			tempContainer.appendTo(container);
		}

		$(target).append(container);

	}

	global.Perception.modules.NumericView = NumericView;
	
})(window);
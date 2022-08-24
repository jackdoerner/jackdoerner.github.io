(function(global){

	var	threads = 4,
		$ = global.jQuery,
		PerceptualColor = global.PerceptualColor,
		Perception = global.Perception;

	function getRandomId() {
		return new String(new Date().getTime()) + ((Math.random() * 999) | 0);
	}

	function getColorValue(ColorModel, fixedDim, xPos, yPos, zVal) {
		var color,
			dim0Range = Math.abs(ColorModel.info.dimensions[0].bounds[1]) + Math.abs(ColorModel.info.dimensions[0].bounds[0]),
			dim1Range = Math.abs(ColorModel.info.dimensions[1].bounds[1]) + Math.abs(ColorModel.info.dimensions[1].bounds[0]),
			dim2Range = Math.abs(ColorModel.info.dimensions[2].bounds[1]) + Math.abs(ColorModel.info.dimensions[2].bounds[0]);
		switch (fixedDim) {
			case 0:
				color = [
					//((zPos / zRange) * dim0Range) + ColorModel.info.dimensions[0].bounds[0],
					zVal,
					((xPos / renderWidth) * dim1Range) + ColorModel.info.dimensions[1].bounds[0],
					(((renderHeight - yPos) / renderHeight) * dim2Range) + ColorModel.info.dimensions[2].bounds[0]
				];
				break;
			case 1:
				color = [
					((xPos / renderWidth) * dim0Range) + ColorModel.info.dimensions[0].bounds[0],
					//((zPos / zRange) * dim1Range) + ColorModel.info.dimensions[1].bounds[0],
					zVal,
					(((renderHeight - yPos) / renderHeight) * dim2Range) + ColorModel.info.dimensions[2].bounds[0]
				];
				break;
			case 2:
				color = [
					((xPos / renderWidth) * dim0Range) + ColorModel.info.dimensions[0].bounds[0],
					(((renderHeight - yPos) / renderHeight) * dim1Range) + ColorModel.info.dimensions[1].bounds[0],
					//((zPos / zRange) * dim2Range) + ColorModel.info.dimensions[2].bounds[0]
					zVal
				];
				break;
		}
		return new ColorModel(color);
	}

	function getColorXYPosition(ColorModel, fixedDim, color) {
		color = new ColorModel(color);
		var xPos, yPos, // zPos,
			dim0Range = Math.abs(ColorModel.info.dimensions[0].bounds[1]) + Math.abs(ColorModel.info.dimensions[0].bounds[0]),
			dim1Range = Math.abs(ColorModel.info.dimensions[1].bounds[1]) + Math.abs(ColorModel.info.dimensions[1].bounds[0]),
			dim2Range = Math.abs(ColorModel.info.dimensions[2].bounds[1]) + Math.abs(ColorModel.info.dimensions[2].bounds[0]);
		switch (fixedDim) {
			case 0:
				//zPos = ((color[0] - ColorModel.info.dimensions[0].bounds[0]) / dim0Range) * zRange;
				xPos = ((color[1] - ColorModel.info.dimensions[1].bounds[0]) / dim1Range) * renderWidth;
				yPos = renderHeight - ((color[2] - ColorModel.info.dimensions[2].bounds[0]) / dim2Range) * renderHeight;
				break;
			case 1:
				xPos = ((color[0] - ColorModel.info.dimensions[0].bounds[0]) / dim0Range) * renderWidth;
				//zPos = ((color[1] - ColorModel.info.dimensions[1].bounds[0]) / dim1Range) * zRange;
				yPos = renderHeight - ((color[2] - ColorModel.info.dimensions[2].bounds[0]) / dim2Range) * renderHeight;
				break;
			case 2:
				xPos = ((color[0] - ColorModel.info.dimensions[0].bounds[0]) / dim0Range) * renderWidth;
				yPos = renderHeight - ((color[1] - ColorModel.info.dimensions[1].bounds[0]) / dim1Range) * renderHeight;
				//zPos = ((color[2] - ColorModel.info.dimensions[2].bounds[0]) / dim2Range) * zRange;
				break;
		}
		
		return {
			x: xPos,
			y: yPos
		}
	}

	SpaceView2D = function(target, w, h) {
		var	uid = getRandomId();
			renderWidth = w,
			renderHeight = h,
			selectedPt = [renderWidth/2, renderHeight/2],
			lastFrameId = null,
			thisFrameId = null,
			nextFrameId = null,
			thisFrame = [],
			nextFrame = [],
			workers = [],
			appState = null;

		$(target).html("<div id='"+uid+"' class='SpaceView2D'>\
				<div class='canvas'>\
					<div class='crosshair'></div>\
					<canvas></canvas>\
				</div>\
				<div class='xAxis'>\
					<svg height='12' width='512'><g>\
						<line x1='1px' y1='1px' x2='1px' y2='11px' />\
						<line x1='4px' y1='6px' x2='8px' y2='2px' />\
						<line x1='4px' y1='6px' x2='8px' y2='10px' />\
						\
						<line x1='4px' y1='6px' x2='236px' y2='6px' />\
						<line x1='276px' y1='6px' x2='508px' y2='6px' />\
						\
						<line x1='511px' y1='1px' x2='511px' y2='11px' />\
						<line x1='508px' y1='6px' x2='504px' y2='2px' />\
						<line x1='508px' y1='6px' x2='504px' y2='10px' />\
					</g></svg>\
					<div class='axislabel'></div>\
				</div>\
				<div class='yAxis'>\
					<svg width='12' height='512'><g>\
						<line y1='1px' x1='1px' y2='1px' x2='11px' />\
						<line y1='4px' x1='6px' y2='8px' x2='2px' />\
						<line y1='4px' x1='6px' y2='8px' x2='10px' />\
						\
						<line y1='4px' x1='6px' y2='236px' x2='6px' />\
						<line y1='276px' x1='6px' y2='508px' x2='6px' />\
						\
						<line y1='511px' x1='1px' y2='511px' x2='11px' />\
						<line y1='508px' x1='6px' y2='504px' x2='2px' />\
						<line y1='508px' x1='6px' y2='504px' x2='10px' />\
					</g></svg>\
					<div class='axislabel'></div>\
					...........\
				</div>\
			</div>");
		var container = $('#' + uid)[0],
			canvas = $('canvas', container)[0],
			ctx = canvas.getContext('2d');

		canvas.width = renderWidth;
		canvas.height = renderHeight;
		ctx.clearRect(0,0,renderWidth, renderHeight);

		for (var ii = 0; ii < threads; ii++) {

			(function(ii){
				var workerXOffset = ii % 2 == 0?Math.floor(ii * renderWidth / threads):Math.ceil(ii * renderWidth / threads),
					workerWidth = ii %2 == 0?Math.ceil(renderWidth/threads):Math.floor(renderWidth/threads),
					imageData = ctx.createImageData(workerWidth, renderHeight),
					worker = new Worker('system/js/workers/worker_renderSpace.js');

				workers[ii] = {
					x: workerXOffset,
					width: workerWidth,
					imageData: imageData,
					worker: worker,
					active:false,
					queuedMessage:null,
					queue: function(message) {
						if (workers[ii].active) {
							workers[ii].queuedMessage = message;
						} else {
							workers[ii].active = true;
							worker.postMessage(message);
						}
					}
				}

				worker.addEventListener('message', function(e){
					if (e.data.databuffer !== undefined) {
						dirty = true;
						if (e.data.frameId !== nextFrameId) {
							nextFrameId = e.data.frameId;
							nextFrame = [];
						}
						nextFrame[ii] = e.data.databuffer
						var frameReady = true;
						for (var jj=0; jj < threads; jj++) {
							if (nextFrame[jj] === undefined) frameReady &= false;
						}
						if (frameReady) {
							thisFrame = nextFrame;
							thisFrameId = nextFrameId;
						}
					}
					if (e.data.free !== undefined && e.data.free) {
						if (workers[ii].queuedMessage !== null) {
							worker.postMessage(workers[ii].queuedMessage);
							workers[ii].queuedMessage = null;
						} else {
							workers[ii].active = false;
						}
					}
				});
				
				workers[ii].queue({
					workerWidth:workerWidth,
					workerXOffset:workerXOffset,
					renderWidth:renderWidth,
					height:renderHeight
				});
			})(ii);
		}

		Perception.registerAnimator(function(){
			if (thisFrameId !== lastFrameId) {
				lastFrameId = thisFrameId;
				ctx.clearRect(0, 0, renderWidth, renderHeight);
				var tempBuf;
				for (var ii = 0; ii < threads; ii++) {
					tempBuf = new Uint8ClampedArray(thisFrame[ii]);
					workers[ii].imageData.data.set(tempBuf);
					ctx.putImageData(workers[ii].imageData, workers[ii].x, 0, 0, 0, workers[ii].width, renderHeight);
				}
			}
		});

		Perception.registerStateNotifier(function(newState, origin) {
			if (origin !== uid) {
				appState = newState;
				var	pos = getColorXYPosition(appState.colorModel, appState.fixedDimension, appState.convertedColor);
				selectedPt = [pos.x, pos.y];
				$('.crosshair', container).css({
					'left':pos.x + 'px',
					'top':pos.y + 'px'
				});
				$('.xAxis .axislabel', container).text(appState.colorModel.info.dimensions[appState.fixedDimension === 0 ? 1:0].displayName);
				$('.yAxis .axislabel', container).text(appState.colorModel.info.dimensions[appState.fixedDimension === 2 ? 1:2].displayName);
				$('.xAxis').attr('title', appState.colorModel.info.dimensions[appState.fixedDimension === 0 ? 1:0].desc);
				$('.yAxis').attr('title', appState.colorModel.info.dimensions[appState.fixedDimension === 2 ? 1:2].desc);
				var fId = getRandomId();
				for (var ii = 0; ii < workers.length; ii++) {
					workers[ii].queue({
						ColorModel:appState.colorModel.info.name,
						fixedDim:appState.fixedDimension,
						fixedVal:appState.convertedColor[appState.fixedDimension],
						frameId:fId,
						proj: appState.cvdProjection,
						render:true
					});
				}
			}
		});

		function clickHandler(e){
			var x = (e.pageX - $(e.target).offset().left - 1) | 0,
				y = (e.pageY - $(e.target).offset().top) | 0;
			selectedPt = [x, y];
			$('.crosshair', container).css({
				'left':x + 1 + 'px',
				'top':y +1 + 'px'
			});
			var selectedColor = getColorValue(
				appState.colorModel,
				appState.fixedDimension, x, y,
				appState.convertedColor[appState.fixedDimension]
			);
			Perception.setSelectedColor(selectedColor, uid);
		}
	

		$(canvas).bind("click", clickHandler);
		//$(canvas).bind("touchstart", clickHandler);

	}

	global.Perception.modules.SpaceView2D = SpaceView2D;

})(window);
importScripts("../PerceptualColor.js");

var workerWidth = 0,
	height = 0,
	renderWidth = 0,
	workerXOffset = 0,
	ColorModel = PerceptualColor.LABColor,
	ColorInstance = new PerceptualColor.LABColor(0,0,0),
	fixedDim = 0,
	fixedVal = 50,
	bufferlength = 0,
	date = new Date(),
	buf,
	data32;

function setPixelRGB(data32,x,y,r,g,b) {
	data32[y * workerWidth + x] =
		(255   << 24) |    // alpha
		(b << 16) |    // blue
		(g <<  8) |    // green
		 r;            // red
}

function setPixelRGBA(data32,x,y,r,g,b,a) {
	data32[y * workerWidth + x] =
		(a << 24) |    // alpha
		(b << 16) |    // blue
		(g <<  8) |    // green
		 r;            // red
}

function setRegion(data32, x, y, size, r, g ,b ,a) {
	var ii = 0,
		jj;
	for (; ii < size; ii++) {
		for (jj = 0; jj< size; jj++) {
			setPixelRGBA(data32, x+ii, y+jj, r, g, b, a);
		}
	}
}

function drawSpace2D(data32, ColorModel, ColorInstance, fixedDim, fixedVal, proj) {
	var tempColor, rgba,
		ii, jj,
		dim0W = (ColorModel.info.dimensions[0].bounds[1] - ColorModel.info.dimensions[0].bounds[0]) / renderWidth,
		dim1W = (ColorModel.info.dimensions[1].bounds[1] - ColorModel.info.dimensions[1].bounds[0]) / renderWidth,
		dim1H = (ColorModel.info.dimensions[1].bounds[1] - ColorModel.info.dimensions[1].bounds[0]) / height,
		dim2H = (ColorModel.info.dimensions[2].bounds[1] - ColorModel.info.dimensions[2].bounds[0]) / height,
		colorSetters = [
			function(ii, jj, ColorInstance) {
				return ColorInstance.set(
					fixedVal,
					ColorModel.info.dimensions[1].bounds[0] + (ii*dim1W),
					ColorModel.info.dimensions[2].bounds[0] + (jj*dim2H)
				);
			},
			function(ii, jj, ColorInstance) {
				return ColorInstance.set(
					ColorModel.info.dimensions[0].bounds[0] + (ii*dim0W),
					fixedVal,
					ColorModel.info.dimensions[2].bounds[0] + (jj*dim2H)
				);
			},
			function(ii, jj, ColorInstance) {
				return ColorInstance.set(
					ColorModel.info.dimensions[0].bounds[0] + (ii*dim0W),
					ColorModel.info.dimensions[1].bounds[0] + (jj*dim1H),
					fixedVal
				);
			}
		],
		setColor = colorSetters[fixedDim];

	for (ii = workerXOffset; ii <  workerXOffset + workerWidth; ii++) {
		for (jj = 0; jj < height; jj++) {
			setColor(ii, jj, ColorInstance);
			rgba = PerceptualColor.SRGBColor(ColorInstance).clampWithAlpha(proj);
			setPixelRGBA(data32,ii - workerXOffset, height - jj - 1, rgba[0], rgba[1], rgba[2], rgba[3]);
		}
	}
}

self.addEventListener('message', function(e){
	if (e.data.workerWidth !== undefined) workerWidth = +e.data.workerWidth;
	if (e.data.renderWidth !== undefined) renderWidth = +e.data.renderWidth;
	if (e.data.workerXOffset !== undefined) workerXOffset = +e.data.workerXOffset;
	if (e.data.height !== undefined) height = +e.data.height;
	if ((e.data.workerWidth !== undefined || e.data.height !== undefined) && workerWidth && height) {
		bufferlength = workerWidth * height * 4;
	}
	if (e.data.fixedVal !== undefined) fixedVal = +e.data.fixedVal;
	if (e.data.fixedDim !== undefined) fixedDim = +e.data.fixedDim;
	if (e.data.ColorModel !== undefined) {
		switch(e.data.ColorModel) {
			case "HCLColor":
				ColorModel = PerceptualColor.HCLColor;
				ColorInstance = new PerceptualColor.HCLColor(0,0,0);
				break;
			case "LABColor":
				ColorModel = PerceptualColor.LABColor;
				ColorInstance = new PerceptualColor.LABColor(0,0,0);
				break;
			case "CAM16Color":
				ColorModel = PerceptualColor.CAM16Color;
				ColorInstance = new PerceptualColor.CAM16Color(0,0,0);
				break;
			case "UCSHMJColor":
				ColorModel = PerceptualColor.UCSHMJColor;
				ColorInstance = new PerceptualColor.UCSHMJColor(0,0,0);
				break;
			case "UCSJABColor":
				ColorModel = PerceptualColor.UCSJABColor;
				ColorInstance = new PerceptualColor.UCSJABColor(0,0,0);
				break;
		}
	}

	if (e.data.render === true) {
		buf = new ArrayBuffer(bufferlength);
		data32 = new Uint32Array(buf);
		drawSpace2D(data32, ColorModel, ColorInstance, fixedDim, fixedVal, e.data.proj);
		self.postMessage({
			frameId: e.data.frameId,
			databuffer:buf,
			free:true
		}, [buf]);
	} else {
		self.postMessage({
			free:true
		});
	}
});
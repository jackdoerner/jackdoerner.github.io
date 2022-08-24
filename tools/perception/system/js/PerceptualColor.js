/**********

PerceptualColor.js
Tools for working with perceptually oriented colorspaces in javascript
Derived from code by Heather Arthur: https://github.com/harthur/color-convert

Copyright (C) 2013 Jack Doerner

Provided under the MIT License:

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*********/

(function(global){
	"use strict";

	/**********************
	 **********************
	 **
	 ** Constants
	 **
	 **********************
	 **********************/

	var default_whitepoint = [95.047, 100, 108.883]; //D65 in XYZ coords
	var default_background_luminance = 100;
	var default_adapting_luminance = 40;
	var default_surround = 2;

	// lab constants
	var clab2xyz1 = 6/29,
		clab2xyz2 = 3*Math.pow(6/29, 2),
		clab2xyz3 = 4/29,

		cxyz2lab1 = Math.pow(6/29, 3),
		cxyz2lab2 = Math.pow(29/6, 2)/3,
		cxyz2lab3 = 4/29;


	/**********************
	 **********************
	 **
	 ** Some general helper functions for later
	 **
	 **********************
	 **********************/

	var project = function(color, projection) {
		return [projection[0] * color [0] + projection[1] * color[1] + projection[2] * color[2],
				projection[3] * color [0] + projection[4] * color[1] + projection[5] * color[2],
				projection[6] * color [0] + projection[7] * color[1] + projection[8] * color[2]];
	}

	var linterp = function(a, b, t) {
		return (1 - t) * a + t * b;
	}

	var hcl2lab = function(hcl) {
		var hRad = (hcl[0] > 360 ? hcl[0] % 360 : hcl[0]) *Math.PI/180;
		return [hcl[2], Math.cos(hRad) * hcl[1], Math.sin(hRad) * hcl[1]];
	}

	var lab2hcl = function(lab) {
		var h = Math.atan2(lab[2],lab[1]) * 180 / Math.PI;
		return [h < 0? h+360:h, Math.sqrt(Math.pow(lab[1], 2) + Math.pow(lab[2], 2)) , lab[0]];
	}

	var lab2xyz = function (lab, whitepoint) {
		var l = lab[0],
			a = lab[1],
			b = lab[2],
			x, y, z;

		if (whitepoint === undefined || whitepoint === null) whitepoint = default_whitepoint

		y = (l + 16) / 116;
		x = y + a / 500;
		z = y - b / 200;

		y = y  > clab2xyz1 ? Math.pow(y, 3) : clab2xyz2 * (y - clab2xyz3);
		x = x  > clab2xyz1 ? Math.pow(x, 3) : clab2xyz2 * (x - clab2xyz3);
		z = z  > clab2xyz1 ? Math.pow(z, 3) : clab2xyz2 * (z - clab2xyz3);

		y *= whitepoint[1];
		x *= whitepoint[0];
		z *= whitepoint[2];

		return [x, y, z];
	}

	var xyz2lab = function(xyz, whitepoint) {
		var x = xyz[0],
			y = xyz[1],
			z = xyz[2],
			l, a, b;

		if (whitepoint === undefined || whitepoint === null) whitepoint = default_whitepoint

		x /= whitepoint[0];
		y /= whitepoint[1];
		z /= whitepoint[2];

		x = x > cxyz2lab1 ? Math.pow(x, 1/3) : (cxyz2lab2 * x) + cxyz2lab3;
		y = y > cxyz2lab1 ? Math.pow(y, 1/3) : (cxyz2lab2 * y) + cxyz2lab3;
		z = z > cxyz2lab1 ? Math.pow(z, 1/3) : (cxyz2lab2 * z) + cxyz2lab3;

		l = (116 * y) - 16;
		a = 500 * (x - y);
		b = 200 * (y - z);
	  
		return [l, a, b];
	}

	var cam16_m16mul = function(xyz) {
		var x = xyz[0],
			y = xyz[1],
			z = xyz[2],
			r, g, b;

		r = (x * 0.401288) + (y * 0.650173) + (z * -0.051461);
  		g = (x * -0.250268) + (y * 1.204414) + (z * 0.045854);
  		b = (x * -0.002079) + (y * 0.048952) + (z * 0.953127);

  		return [r,g,b];
	}

	var cam16_m16invmul = function(rgb) {
		var r = rgb[0],
			g = rgb[1],
			b = rgb[2],
			x, y, z;

		x = (r * 1.862067855087233) + (g * -1.011254630531685) + (b * 0.1491867754444518);
    	y = (r * 3.8752654323613723e-1) + (g * 6.214474419314753e-1) + (b * -8.973985167612518e-3);
    	z = (r * -1.584149884933386e-2) + (g * -3.412293802851557e-2) + (b * 1.049964436877850);

    	return [x,y,z];
	}

	var cam16_env_from_config = function(config) {
		// config parameters:
		// adapting_luminance
		// background_luminance
		// surround
		// whitepoint
		// fully_adapted

		var env = {
				adapting_luminance: null,
				background_luminance: null,
				surround: null,
				whitepoint: null,
				F_L: null,
				F_L_4: null,
				n: null,
				z: null,
				c: null,
				N_c: null,
				N_bb: null,
				N_cb: null,
				D_rgb: null,
				A_w: null
			};

		if (config === undefined || config === null || config.adapting_luminance === undefined || config.adapting_luminance === null) {
			env.adapting_luminance = default_adapting_luminance;
		} else {
			env.adapting_luminance = config.adapting_luminance;
		}

    	if (config === undefined || config === null || config.background_luminance === undefined || config.background_luminance === null) {
    		env.background_luminance = default_background_luminance;
    	} else {
    		env.background_luminance = config.background_luminance;
    	}

    	if (config === undefined || config === null || config.surround === undefined || config.surround === null) {
    		env.surround = default_surround;
    	} else {
    		env.surround = config.surround;
    	}

    	if (config === undefined || config === null || config.whitepoint === undefined || config.whitepoint === null) {
    		env.whitepoint = default_whitepoint;
    	} else {
    		env.whitepoint = config.whitepoint;
    	}

    	var whitepoint_luminance = env.whitepoint[1];
    	var whitepoint_rgb = cam16_m16mul(env.whitepoint);

    	var k = 1 / (5*env.adapting_luminance + 1);
		var k4 = k*k*k*k;
  		env.F_L = (k4 * env.adapting_luminance + 0.1 * (1 - k4)*(1 - k4) * Math.pow(5 * env.adapting_luminance, 1/3));
  		env.F_L_4 = Math.pow(env.F_L, 0.25);

  		env.n = env.background_luminance / whitepoint_luminance;
    	env.z = 1.48 + Math.sqrt(env.n);
    	env.c = (env.surround >= 1)
  			? linterp(0.59, 0.69, env.surround - 1)
  			: linterp(0.525, 0.59, env.surround);

  		var F = (env.c >= 0.59) ? linterp(0.9, 1.0, (env.c - 0.59)/.1) : linterp(0.8, 0.9, (env.c - 0.525)/0.065);
  		env.N_c = F;

    	env.N_bb = 0.725 * Math.pow(env.n, -0.2);
    	env.N_cb = env.N_bb;

    	var D;
    	if (config === undefined || config === null || config.fully_adapted !== true) {
    		D = Math.max(0, Math.min(1, F * (1 - 1 / 3.6 * Math.exp((-env.adapting_luminance - 42)/92))));
    	} else {
    		D = 1;
    	}
		env.D_rgb = whitepoint_rgb.map( x => linterp(1, whitepoint_luminance/x, D));

    	var adapted_whitepoint = xyz2cam16rgb(env.whitepoint, env);
    	env.A_w = env.N_bb * (2*adapted_whitepoint[0] + adapted_whitepoint[1] + 0.05*adapted_whitepoint[2]);

		return env;
	}

	var cam16_adapt = function(component, env) {
		var x = Math.pow(env.F_L * Math.abs(component) * 0.01, 0.42);
  		return ((component > 0) - (component < 0)) * 400 * x / (x + 27.13);
	}

	var cam16_unadapt = function(component, env) {
  		var cabs = Math.abs(component);
  		var csgn = ((component > 0) - (component < 0));
  		return csgn * (100/env.F_L * Math.pow(27.13, 1/0.42)) * Math.pow( cabs / (400-cabs), 1/0.42);
	}
 
	var cam16rgb2xyz = function(rgb, env) {
		var r = rgb[0],
			g = rgb[1],
			b = rgb[2];

		r = cam16_unadapt(r, env)/env.D_rgb[0];
		g = cam16_unadapt(g, env)/env.D_rgb[1];
		b = cam16_unadapt(b, env)/env.D_rgb[2];

    	return cam16_m16invmul([r,g,b]);
	}

	var xyz2cam16rgb = function(xyz, env) {
		var rgb=cam16_m16mul(xyz),
			r, g, b;

  		r = cam16_adapt(rgb[0]*env.D_rgb[0], env);
		g = cam16_adapt(rgb[1]*env.D_rgb[1], env);
		b = cam16_adapt(rgb[2]*env.D_rgb[2], env);

  		return [r,g,b];
	}

	var cam16rgb2cam16jab = function(rgb, env) {
		var ra = rgb[0],
			ga = rgb[1],
			ba = rgb[2],
			J, a, b, h, J_root, A;

		if (env === undefined || env === null) env = cam16_env_from_config();

		a = ra + (-12*ga + ba) / 11;
    	b = (ra + ga - 2 * ba) / 9;
    	h = Math.atan2(b, a);

    	A = env.N_bb * (2*ra + ga + 0.05*ba);
    	J_root = Math.pow(A / env.A_w, 0.5 * env.c * env.z);
    	J = 100 * J_root*J_root;

  		return [J,a,b];
	}

	var cam16jab2cam16rgb = function(jab, env) {
		var J = jab[0],
			a = jab[1],
			b = jab[2],
			ra, ga, ba, J_root, A, p_2;

		if (env === undefined || env === null) env = cam16_env_from_config();

    	J_root = Math.sqrt(J)*0.1;

    	A = env.A_w * Math.pow(J_root, (2 / env.c) / env.z);

    	p_2 = A / env.N_bb;

    	ra = (460*p_2 + 451*a +  288*b)/1403;
    	ga = (460*p_2 - 891*a -  261*b)/1403;
    	ba = (460*p_2 - 220*a - 6300*b)/1403;

  		return [ra,ga,ba];
	}

	var cam16jab2ucsjab = function(jab, env) {
		var hmj = cam16jab2ucshmj(jab, env);
		var h_rad = hmj[0] * Math.PI / 180;
		return[hmj[2] , hmj[1] * Math.cos(h_rad), hmj[1] * Math.sin(h_rad)];
	}

	var ucsjab2cam16jab = function(jab, env) {
		var M = Math.sqrt(jab[1]*jab[1] + jab[2]*jab[2]);
		var	h = Math.atan2(jab[2], jab[1]) * 180/Math.PI;
		return ucshmj2cam16jab([h < 0? h+360:h, M, jab[0]], env);
	}

	var cam16jab2ucshmj = function(jab, env) {
		var J = jab[0],
			a = jab[1],
			b = jab[2],
			J_root, h_rad, h, e_t, t, alpha, C, M, ra, ga, ba, A, p_2;

		if (env === undefined || env === null) env = cam16_env_from_config();

    	J_root = Math.sqrt(J)*0.1;

		h_rad = Math.atan2(b, a);
		e_t = 0.25 * (Math.cos(h_rad + 2) + 3.8);

		A = env.A_w * Math.pow(J_root, 2 / env.c / env.z);
		p_2 = A / env.N_bb;

		ra = (460*p_2 + 451*a +  288*b)/ 1403;
        ga = (460*p_2 - 891*a -  261*b)/ 1403;
        ba = (460*p_2 - 220*a - 6300*b)/ 1403;

		t = (5e4 / 13 * env.N_c * env.N_cb * e_t * Math.sqrt(a*a + b*b) / (ra + ga + 1.05 * ba + 0.305));
	    alpha = Math.pow(t, 0.9) * Math.pow(1.64 - Math.pow(0.29, env.n), 0.73);
	    C = alpha * J_root;
	    M = Math.log(1 + 0.0228 * C * env.F_L_4) / 0.0228;

		h = h_rad * 180 / Math.PI;

	    return [h < 0? h+360:h, M, 1.7 * J / (1 + 0.007 * J)];
	}

	var ucshmj2cam16jab = function(hmj, env) {
		var h_rad = (hmj[0] > 360 ? hmj[0] % 360 : hmj[0]) * Math.PI/180,
			M = (Math.exp( hmj[1] * 0.0228) - 1) / 0.0228,
  			J = hmj[2] / (1.7 - 0.007 * hmj[2]),
  			cos_h, sin_h, J_root, alpha, t, e_t, A, p_1, p_2, r, a, b;

  		if (env === undefined || env === null) env = cam16_env_from_config();

  		cos_h = Math.cos(h_rad);
    	sin_h = Math.sin(h_rad);
    	J_root = Math.sqrt(J)*0.1;
    	alpha = J_root === 0 ? 0 : (M / env.F_L_4) / J_root;
    	t = Math.pow(alpha * Math.pow(1.64 - Math.pow(0.29, env.n), -0.73), 10 / 9);
    	e_t = 0.25 * (Math.cos(h_rad + 2) + 3.8);
    	A = env.A_w * Math.pow(J/100, 1 / (env.c * env.z));
    	p_1 = 5e4 / 13 * env.N_c * env.N_cb * e_t;
    	p_2 = A / env.N_bb;
    	r = 23 * (p_2 + 0.305) * t / (23*p_1 + t * (11*cos_h + 108*sin_h));
    	a = r * cos_h;
    	b = r * sin_h;

  		return [J, a, b];
	}

	var rgb2xyz = function(rgb) {
		// D65 normalization baked into RGB space
		var r = rgb[0],
			g = rgb[1],
			b = rgb[2];

		var x = (r * 0.41239080) + (g * 0.35758434) + (b * 0.18048079);
		var y = (r * 0.21263901) + (g * 0.71516868) + (b * 0.07219232);
		var z = (r * 0.01933082) + (g * 0.11919478) + (b * 0.95053215);

		return [x, y, z];
	}

	var xyz2rgb = function(xyz) {
		// D65 normalization baked into RGB space
		var x = xyz[0],
    		y = xyz[1],
    		z = xyz[2],
    		r, g, b;

		r = (x * 3.24096994) + (y * -1.53738318) + (z * -0.49861076);
		g = (x * -0.96924364) + (y * 1.8759675) + (z * 0.04155506);
		b = (x * 0.05563008) + (y * -0.20397696) + (z * 1.05697151);

		return [r,g,b];
	}

	var rgb2srgb = function(rgb) {
		var r = rgb[0] / 100,
			g = rgb[1] / 100,
			b = rgb[2] / 100;

		r = r > 0.0031308 ? ((1.055 * Math.pow(r, 1.0 / 2.4)) - 0.055) : r = (r * 12.92);

		g = g > 0.0031308 ? ((1.055 * Math.pow(g, 1.0 / 2.4)) - 0.055) : g = (g * 12.92);

		b = b > 0.0031308 ? ((1.055 * Math.pow(b, 1.0 / 2.4)) - 0.055) : b = (b * 12.92);

		return [r * 255, g * 255, b * 255];
	}

	var srgb2rgb = function(srgb) {
		var r = srgb[0] / 255,
			g = srgb[1] / 255,
			b = srgb[2] / 255;

		r = r > 0.04045 ? Math.pow(((r + 0.055) / 1.055), 2.4) : (r / 12.92);
		g = g > 0.04045 ? Math.pow(((g + 0.055) / 1.055), 2.4) : (g / 12.92);
		b = b > 0.04045 ? Math.pow(((b + 0.055) / 1.055), 2.4) : (b / 12.92);
	  
		return [r * 100, g * 100, b * 100];
	}

	var srgb2hex = function(rgb) {
	    return "#" + ((1 << 24) + ((rgb[0]|0) << 16) + ((rgb[1]|0) << 8) + (rgb[2]|0)).toString(16).slice(1, 7);
	}

	var hex2srgb = function(hex) {
		// Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
		//var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
		//hex = hex.replace(shorthandRegex, function(m, r, g, b) {
		//	return r + r + g + g + b + b;
		//});

		var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? [
			parseInt(result[1], 16),
			parseInt(result[2], 16),
			parseInt(result[3], 16)
		] : null;
	}

	var is_color_object = function(x) {
		return (x instanceof SRGBColor
			 || x instanceof LABColor
			 || x instanceof HCLColor
			 || x instanceof CAM16Color
			 || x instanceof UCSJABColor
			 || x instanceof UCSHMJColor);
	}



	/**********************
	 **********************
	 **
	 ** Hue, Chroma, Luminance
	 **
	 ** HCL color is a perceptual color space like Lab,
	 ** but it is represented in polar coordinates.
	 **
	 ** Essentially, it is to Lab as HSL is to RGB.
	 **
	 **********************
	 **********************/



	var HCLColor = function(h, c, l) {
		if (h instanceof HCLColor) {
			return new HCLColor(h[0], h[1], h[2]);
		} else if (is_color_object(h)) {
			return new HCLColor(lab2hcl(xyz2lab(h.toXYZ())));
		} else {
			this.set(h, c, l);
		} 
	};
	HCLColor.prototype = new Array();
	Object.defineProperties(HCLColor.prototype, {
		'set' : {
			'ennumerable':false,
			'value':function(h,c,l){
				if (h !== undefined && c !== undefined && l !== undefined) {
					this[0] = (h > 360 ? h % 360 : h);
					this[1] = c;
					this[2] = l;
					this.length = 3;
				} else if (h instanceof Array && h.length === 3) {
					this[0] = (h[0] > 360 ? h[0] % 360 : h[0]);
					this[1] = h[1];
					this[2] = h[2];
					this.length = 3;
				}
			}
		},
		'toXYZ': {
			'ennumerable':false,
			'value':function(){
				return lab2xyz(hcl2lab(this));
			}
		},
		'h': {
			'ennumerable':false,
			'value': function() {
				return this[0];
			}
		},
		'c': {
			'ennumerable':false,
			'value': function() {
				return this[1];
			}
		},
		'l': {
			'ennumerable':false,
			'value': function() {
				return this[2];
			}
		}
	});

	var hcl_h = {
			bounds:[0,360],
			name:'h',
			displayName:'h',
			desc:'Hue'
		},
		hcl_c = {
			bounds:[0,135],
			name:'c',
			displayName:'C',
			desc:'Chroma'
		},
		hcl_l = {
			bounds:[0,100],
			name:'l',
			displayName:'L',
			desc:'Lightness'
		}

	HCLColor.info = {
		name:"HCLColor",
		shortName:'hcl',
		displayName:"HCL",
		dimensions: [
			hcl_h,
			hcl_c,
			hcl_l
		]
	};
	Object.defineProperties(HCLColor.info.dimensions, {
		h:hcl_h,
		c:hcl_c,
		l:hcl_l
	});





	/**********************
	 **********************
	 **
	 ** Lab
	 **
	 ** The standard Lab perceptual colorspace.
	 **
	 **********************
	 **********************/



	var LABColor = function(l,a,b) {
		if (l instanceof LABColor) {
			return new LABColor(l[0], l[1], l[2]);
		} else if (is_color_object(l)) {
			return new LABColor(xyz2lab(l.toXYZ()));
		} else {
			this.set(l,a,b);
		}
	};
	LABColor.prototype = new Array();
	Object.defineProperties(LABColor.prototype, {
		'set' : {
			'ennumerable':false,
			'value':function(l,a,b){
				if (l !== undefined && a !== undefined && b !== undefined) {
					this[0] = l;
					this[1] = a;
					this[2] = b;
					this.length = 3;
				} else if (l instanceof Array && l.length === 3) {
					this[0] = l[0];
					this[1] = l[1];
					this[2] = l[2];
					this.length = 3;
				}
			}
		},
		'toXYZ': {
			'ennumerable':false,
			'value':function(){
				return lab2xyz(this);
			}
		},
		'l': {
			'ennumerable':false,
			'value': function() {
				return this[0];
			}
		},
		'a': {
			'ennumerable':false,
			'value': function() {
				return this[1];
			}
		},
		'b': {
			'ennumerable':false,
			'value': function() {
				return this[2];
			}
		}
	});

	var lab_l = {
			bounds:[0,100],
			name:'l',
			displayName:'L',
			desc:'Lightness'
		},
		lab_a = {
			bounds:[-110, 105],
			name:'a',
			displayName:'a',
			desc:'Red/Green'
		},
		lab_b = {
			bounds:[-110,105],
			name:'b',
			displayName:'b',
			desc:'Yellow/Blue'
		}

	LABColor.info = {
		name:"LABColor",
		shortName:'lab',
		displayName:"Lab",
		dimensions:[
			lab_l,
			lab_a,
			lab_b
		]
	};
	Object.defineProperties(LABColor.info.dimensions, {
		l:lab_l,
		a:lab_a,
		b:lab_b
	});




	/**********************
	 **********************
	 **
	 ** CAM16 (the Color Appearance Model)
	 **
	 ** Special capabilities:
	 ** 	chromatic adaptation
	 ** 	appearance correlates
	 **
	 **********************
	 **********************/



	var CAM16Color = function(J, a, b, env) {
		if (J instanceof CAM16Color) {
			var envclone = Object.assign({}, J.env);
			return new CAM16Color(J[0], J[1], J[2], envclone);
		} else if (is_color_object(J)) {
			if (env === undefined || env === null) env = cam16_env_from_config();
			return new CAM16Color(cam16rgb2cam16jab(xyz2cam16rgb(J.toXYZ(env),env),env), null, null, env);
		} else {
			if (env === undefined || env === null) env = cam16_env_from_config();
			var envclone = Object.assign({}, env);
			this.set(J,a,b);
			this.env = envclone;
		}
	};
	CAM16Color.prototype = new Array();
	Object.defineProperties(CAM16Color.prototype, {
		'set' : {
			'ennumerable':false,
			'value':function(J,a,b){
				if (J !== undefined && a !== undefined && b !== undefined
					&& J !== null && a !== null && b !== null) {
					this[0] = J;
					this[1] = a;
					this[2] = b;
					this.length = 3;
				} else if (J instanceof Array && J.length === 3) {
					this[0] = J[0];
					this[1] = J[1];
					this[2] = J[2];
					this.length = 3;
				}
			}
		},
		'toXYZ': {
			'ennumerable':false,
			'value':function(env){
				if (env === undefined || env === null) env = this.env;
				return cam16rgb2xyz(cam16jab2cam16rgb(this, env), env);
			}
		},
		'env': {
			'ennumerable': false,
			'writable': true,
			'value': null
		},
		'setEnvFromConfig': {
			'ennumerable':false,
			'value':function(config) {
				this.env = cam16_env_from_config(config);
			}
		},
		'J': {
			'ennumerable':false,
			'value': function() {
				return this[0];
			}
		},
		'a': {
			'ennumerable':false,
			'value': function() {
				return this[1];
			}
		},
		'b': {
			'ennumerable':false,
			'value': function() {
				return this[2];
			}
		}
	});

	var cam16_J = {
			bounds:[0,100],
			name:'J',
			displayName:'J',
			desc:'Lightness'
		},
		cam16_a = {
			bounds:[-1.4, 1.7],
			name:'a',
			displayName:'a',
			desc:'Red/Green'
		},
		cam16_b = {
			bounds:[-1.4, 1.7],
			name:'b',
			displayName:'b',
			desc:'Yellow/Blue'
		}

	CAM16Color.info = {
		name:"CAM16Color",
		shortName:'cam16',
		displayName:"CAM16",
		dimensions:[
			cam16_J,
			cam16_a,
			cam16_b
		]
	};
	Object.defineProperties(CAM16Color.info.dimensions, {
		J:cam16_J,
		a:cam16_a,
		b:cam16_b
	});


	var UCSJABColor = function(J, a, b, env) {
		if (J instanceof UCSJABColor) {
			var envclone = Object.assign({}, J.env);
			return new UCSJABColor(J[0], J[1], J[2], envclone);
		} else if (is_color_object(J)) {
			if (env === undefined || env === null) env = cam16_env_from_config();
			return new UCSJABColor(cam16jab2ucsjab(cam16rgb2cam16jab(xyz2cam16rgb(J.toXYZ(env),env),env),env), null, null, env);
		} else {
			if (env === undefined || env === null) env = cam16_env_from_config();
			var envclone = Object.assign({}, env);
			this.set(J,a,b);
			this.env = envclone;
		}
	};
	UCSJABColor.prototype = new Array();
	Object.defineProperties(UCSJABColor.prototype, {
		'set' : {
			'ennumerable':false,
			'value':function(J,a,b){
				if (J !== undefined && a !== undefined && b !== undefined
					&& J !== null && a !== null && b !== null) {
					this[0] = J;
					this[1] = a;
					this[2] = b;
					this.length = 3;
				} else if (J instanceof Array && J.length === 3) {
					this[0] = J[0];
					this[1] = J[1];
					this[2] = J[2];
					this.length = 3;
				}
			}
		},
		'toXYZ': {
			'ennumerable':false,
			'value':function(env){
				if (env === undefined || env === null) env = this.env;
				return cam16rgb2xyz(cam16jab2cam16rgb(ucsjab2cam16jab(this,env),env),env);
			}
		},
		'env': {
			'ennumerable': false,
			'writable': true,
			'value': null
		},
		'setEnvFromConfig': {
			'ennumerable':false,
			'value':function(config) {
				this.env = cam16_env_from_config(config);
			}
		},
		'J': {
			'ennumerable':false,
			'value': function() {
				return this[0];
			}
		},
		'a': {
			'ennumerable':false,
			'value': function() {
				return this[1];
			}
		},
		'b': {
			'ennumerable':false,
			'value': function() {
				return this[2];
			}
		}
	});

	var ucsjab_J = {
			bounds:[0,100],
			name:'J',
			displayName:'J',
			desc:'Lightness'
		},
		ucsjab_a = {
			bounds:[-42, 48],
			name:'a',
			displayName:'a',
			desc:'Red/Green'
		},
		ucsjab_b = {
			bounds:[-42, 48],
			name:'b',
			displayName:'b',
			desc:'Yellow/Blue'
		}

	UCSJABColor.info = {
		name:"UCSJABColor",
		shortName:'ucsjab',
		displayName:"CAM16-UCS",
		dimensions:[
			ucsjab_J,
			ucsjab_a,
			ucsjab_b
		]
	};
	Object.defineProperties(UCSJABColor.info.dimensions, {
		J:ucsjab_J,
		a:ucsjab_a,
		b:ucsjab_b
	});

	var UCSHMJColor = function(h, M, J, env) {
		if (h instanceof UCSHMJColor) {
			var envclone = Object.assign({}, h.env);
			return new UCSHMJColor(h[0], h[1], h[2], envclone);
		} else if (is_color_object(h)) {
			if (env === undefined || env === null) env = cam16_env_from_config();
			return new UCSHMJColor(cam16jab2ucshmj(cam16rgb2cam16jab(xyz2cam16rgb(h.toXYZ(env),env),env),env), null, null, env);
		} else {
			if (env === undefined || env === null) env = cam16_env_from_config();
			var envclone = Object.assign({}, env);
			this.set(h,M,J);
			this.env = envclone;
		}
	};
	UCSHMJColor.prototype = new Array();
	Object.defineProperties(UCSHMJColor.prototype, {
		'set' : {
			'ennumerable':false,
			'value':function(h,M,J){
				if (h !== undefined && M !== undefined && J !== undefined
					&& h !== null && M !== null && J !== null) {
					this[0] = h;
					this[1] = M;
					this[2] = J;
					this.length = 3;
				} else if (h instanceof Array && h.length === 3) {
					this[0] = h[0];
					this[1] = h[1];
					this[2] = h[2];
					this.length = 3;
				}
			}
		},
		'toXYZ': {
			'ennumerable':false,
			'value':function(env){
				if (env === undefined || env === null) env = this.env;
				return cam16rgb2xyz(cam16jab2cam16rgb(ucshmj2cam16jab(this,env),env),env);
			}
		},
		'env': {
			'ennumerable': false,
			'writable': true,
			'value': null
		},
		'setEnvFromConfig': {
			'ennumerable':false,
			'value':function(config) {
				this.env = cam16_env_from_config(config);
			}
		},
		'h': {
			'ennumerable':false,
			'value': function() {
				return this[0];
			}
		},
		'M': {
			'ennumerable':false,
			'value': function() {
				return this[1];
			}
		},
		'J': {
			'ennumerable':false,
			'value': function() {
				return this[2];
			}
		}
	});

	var ucshmj_h = {
			bounds:[0,360],
			name:'h',
			displayName:'h',
			desc:'Hue'
		},
		ucshmj_M = {
			bounds:[0, 50],
			name:'M',
			displayName:'M',
			desc:'Colorfulness'
		},
		ucshmj_J = {
			bounds:[0, 100],
			name:'J',
			displayName:'J',
			desc:'Lightness'
		}

	UCSHMJColor.info = {
		name:"UCSHMJColor",
		shortName:'ucshmj',
		displayName:"CAM16-UCS",
		dimensions:[
			ucshmj_h,
			ucshmj_M,
			ucshmj_J
		]
	};
	Object.defineProperties(UCSHMJColor.info.dimensions, {
		h:ucshmj_h,
		M:ucshmj_M,
		J:ucshmj_J
	});




	/**********************
	 **********************
	 **
	 ** sRGB (not CIERGB)
	 **
	 ** A display colorspace.
	 ** Special capabilities:
	 ** 	Hex values can be fed to constructor
	 ** 	toString (produces hex)
	 ** 	isDisplayable (determines whether color can be displayed)
	 ** 	clampWithAlpha (clamps values and sets alpha to about half if color was undisplayable)
	 ** 	the above functions all have inputs for CIERGB projection matrices.
	 **
	 **********************
	 **********************/



	var SRGBColor = function(r, g, b) {
		if (r instanceof SRGBColor) {
			return new SRGBColor(r[0], r[1], r[2]);
		} else if (is_color_object(r)) {
			return new SRGBColor(rgb2srgb(xyz2rgb(r.toXYZ())));
		} else {
			this.set(r,g,b);
		}
	};
	SRGBColor.prototype = new Array();
	Object.defineProperties(SRGBColor.prototype, {
		'set' : {
			'ennumerable':false,
			'value':function(r,g,b){
				if (r !== undefined && g !== undefined && b !== undefined) {
					this[0] = r;
					this[1] = g;
					this[2] = b;
					this.length = 3;
				} else if (r instanceof Array && r.length === 3) {
					this[0] = r[0];
					this[1] = r[1];
					this[2] = r[2];
					this.length = 3;
				} else if (r instanceof String || typeof r === "string") {
					var rgb = hex2srgb(r);
					if (rgb === null) return null;
					this[0] = rgb[0];
					this[1] = rgb[1];
					this[2] = rgb[2];
					this.length = 3;
				}
			}
		},
		'toString': {
			'ennumerable':false,
			'value': function(cvdprojection){
				if (cvdprojection === undefined || cvdprojection === null) {
					return srgb2hex(this);
				} else {
					return srgb2hex(rgb2srgb(project(srgb2rgb(this),cvdprojection)));
				}
			}
		},
		'clampWithAlpha': {
			'ennumerable':false,
			'value':function(cvdprojection, ignore_displayability){
				if (!this.isDisplayable() && ignore_displayability !== true) {
					return [0, 0, 0, 0];
				} else {
					var proj;
					if (cvdprojection === undefined || cvdprojection === null) {
						proj = this;
					} else {
						proj = rgb2srgb(project(srgb2rgb(this), cvdprojection));
					}
					if (proj[0] === NaN || proj[1] === NaN || proj[2] === NaN) {
						return [0, 0, 0, 0];
					} else {
						var r = proj[0], //Math.round(proj[0], 5),
							g = proj[1], //Math.round(proj[1], 5),
							b = proj[2]; //Math.round(proj[2], 5);
						var alpha = (r >= 0 && g >= 0 && b >= 0 && r <= 255 && g <= 255 && b <= 255) ? 255 : 100;
						return [Math.max(Math.min(r,255),0),Math.max(Math.min(g,255),0),Math.max(Math.min(b,255),0), alpha];
					}
				}
			}
		},
		'isDisplayable': {
			'ennumerable':false,
			'value':function(cvdprojection){
				var proj;
				if (cvdprojection === undefined || cvdprojection === null) {
					proj = this;
				} else {
					proj = rgb2srgb(project(srgb2rgb(this), cvdprojection));
				}
				var r = proj[0], //Math.round(proj[0], 5),
					g = proj[1], //Math.round(proj[1], 5),
					b = proj[2]; //Math.round(proj[2], 5);
				return (r !== NaN && g !== NaN && b !== NaN
					&& r >= 0 && g >= 0 && b >= 0
					&& r <= 255 && g <= 255 && b <= 255);
			}
		},
		'toXYZ': {
			'ennumerable':false,
			'value':function(){
				return rgb2xyz(srgb2rgb(this));
			}
		},
		'r': {
			'ennumerable':false,
			'value': function() {
				return this[0];
			}
		},
		'g': {
			'ennumerable':false,
			'value': function() {
				return this[1];
			}
		},
		'b': {
			'ennumerable':false,
			'value': function() {
				return this[2];
			}
		}
	});

	var rgb_r = {
			bounds:[0,255],
			name:'r',
			displayName:'R',
			desc:'Red'
		},
		rgb_g = {
			bounds:[0,255],
			name:'g',
			displayName:'G',
			desc:'Green'
		},
		rgb_b = {
			bounds:[0,255],
			name:'b',
			displayName:'B',
			desc:'Blue'
		}

	SRGBColor.info = {
		name:"SRGBColor",
		shortName:'rgb',
		displayName:"RGB",
		dimensions:[
			rgb_r,
			rgb_g,
			rgb_b
		]
	};
	Object.defineProperties(SRGBColor.info.dimensions, {
		r:rgb_r,
		g:rgb_g,
		b:rgb_b
	});




	/**********************
	 **********************
	 **
	 ** ColorScale
	 **
	 ** Provides a way to smoothly interpolate
	 ** between two colors in the Lab colorspace
	 ** such that all interpolations are
	 ** perceptually uniform
	 **
	 **********************
	 **********************/




	var ColorScale = function(c1, c2, polarModel, cartesianModel){
		this.push(c1);
		this.push(c2);
		this.polarModel = polarModel;
		this.cartesianModel = cartesianModel;
	};
	ColorScale.prototype = new Array();
	Object.defineProperties(ColorScale.prototype, {
		'start': {
			'ennumerable':false,
			'value':function(){
				return this[0];
			}
		},
		'end': {
			'ennumerable':false,
			'value':function(){
				return this[1];
			}
		},
		'polarModel': {
			'ennumerable':false,
			'writable':true,
			'value':HCLColor
		},
		'cartesianModel': {
			'ennumerable':false,
			'writable':true,
			'value':LABColor
		},
		'interpolate': {
			'ennumerable':false,
			'value':function(val) {
				var scart = this.cartesianModel(this.start());
				var ecart = this.cartesianModel(this.end());
				var output = this.cartesianModel(this.start());
				output.set(
					scart[0] + val * (ecart[0] - scart[0]),
					scart[1] + val * (ecart[1] - scart[1]),
					scart[2] + val * (ecart[2] - scart[2])
				);
				return output;
			}
		},
		'interpolateLeft': {
			'ennumerable':false,
			'value':function(val) {
				var spolar = this.polarModel(this.start());
				var epolar = this.polarModel(this.end());
				var output = this.polarModel(this.start());
				var hend = epolar[0];
				if (hend > spolar[0]) hend -= 360;
				var dist = spolar[0] - hend;
				output.set(
					(spolar[0] - val * dist + 360) % 360,
					spolar[1] + val * (epolar[1] - spolar[1]),
					spolar[2] + val * (epolar[2] - spolar[2])					
				);
				return output;
			}
		},
		'interpolateRight': {
			'ennumerable':false,
			'value':function(val) {
				var spolar = this.polarModel(this.start());
				var epolar = this.polarModel(this.end());
				var output = this.polarModel(this.start());
				var hstart = spolar[0];
				if (hstart > epolar[0]) hstart -= 360;
				var dist = epolar[0] - hstart;
				output.set(
					(spolar[0] + val * dist) % 360,
					spolar[1] + val * (epolar[1] - spolar[1]),
					spolar[2] + val * (epolar[2] - spolar[2])					
				);
				return output;
			}
		}
	});

	var PerceptualColor = {
		HCLColor:HCLColor,
		LABColor:LABColor,
		CAM16Color:CAM16Color,
		UCSJABColor:UCSJABColor,
		UCSHMJColor:UCSHMJColor,
		SRGBColor:SRGBColor,
		ColorScale:ColorScale
	}

	global.PerceptualColor = PerceptualColor;

})(typeof window === 'undefined'? self : window);
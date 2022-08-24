/**********

array_extended.js
Common array functions that javascript has omitted

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

// Array Remove
if (!Array.prototype.remove) {
	Object.defineProperty(Array.prototype, 'remove', {
		ennumerable:false,
		writable:false,
		value: function(from, to) {
			var ii = from < 0 ? this.length + from : from,
				seglen = ((to !== undefined && to < 0) ? (this.length + to) : (to || ii)) - ii + 1,
				l = this.length - seglen;
			if (seglen > 0 && seglen <= this.length) {
				for (; ii <= l; ii++) {
					this[ii] = this[ii + seglen];
				}
				this.length = l;
			}
			return this;
		}
	});
}

// Array Unique Union
// runs in O(n + m)
if (!Array.prototype.uunion) {
	Object.defineProperty(Array.prototype, 'uunion', {
		ennumerable:false,
		writable:false,
		value: function(array2) {
	        var ii, hash = {}, union = [], l = this.length;
	        for ( ii = 0; ii < l; ii++ ) hash[this[ii]] = this[ii];
	        l = array2.length;
	        for ( ii = 0 ; ii < l; ii++ ) hash[array2[ii]] = array2[ii];
			for ( ii in hash ) union[union.length] = hash[ii];
	        return union;
	    }
	});
}

// Array Intersect
// causes both arrays to be sorted afterward
// runs in O(min(n, m))
if (!Array.prototype.intersection) {
	Object.defineProperty(Array.prototype, 'intersection', {
		ennumerable:false,
		writable:false,
		value: function(b) {
			var ai=0, bi=0, al=this.length, bl = b.length, intersection = [];
			this.sort();
			b.sort();
			while( ai < al && bi < bl ) {
		    	if (this[ai] < b[bi] ) ai++;
		    	else if (this[ai] > b[bi] ) bi++;
		    	else if (this[ai] === b[bi]) {
		    		intersection[intersection.length] = this[ai];
		    		ai++;
		    		bi++;
		    	}
			}
			return intersection;
	    }
	});
}

// Array Difference
// runs in O(n + m)
if (!Array.prototype.difference) {
	Object.defineProperty(Array.prototype, 'difference', {
		ennumerable:false,
		writable:false,
		value: function(array2) {
	        var ii, hash = {}, difference = [], l = array2.length;
	        for ( ii = 0; ii < l; ii++ ) hash[array2[ii]] = array2[ii];
	        l = this.length;
	        for ( ii = 0 ; ii < l; ii++ ) {
	        	if (!(this[ii] in hash)) difference[difference.length] = this[ii];
	        }
	        return difference;
	    }
	});
}
/*global variables*/
var theCanvasState;

var splinePaths = [];//new Array() /*splinePaths*/
var linePaths = [];//new Array() /*linePaths*/
var knots = [];//new Array() /*control knots for splines*/
var editableKnotRadius = 2;

var fromEnd = false;
var fromStart = false;
var ActiveSplineIndex = -1;

var DebugCircles = [];
var DebugLines = [];

function WhichButton(event) 
{
    if (event.which == null)
       /* IE case */
       return (event.button < 2) ? "LEFT" : ((event.button == 4) ? "MIDDLE" : "RIGHT");
    else
       /* All others */
       return (event.which < 2) ? "LEFT" : ((event.which == 2) ? "MIDDLE" : "RIGHT");
}

function SetEditingSegment(truefalse)
{
	theCanvasState.editingSegment = truefalse;
}

// CanvasState http://simonsarris.com/blog/510-making-html5-canvas-useful
function CanvasState(canvas) 
{
    // **** First some setup! ****

    this.canvas = canvas;
    this.width = canvas.width;
    this.height = canvas.height;
    this.ctx = canvas.getContext('2d');
    
    this.canvasWidth = canvas.width;
    this.canvasHeight =  canvas.height;
    this.canvasHalfWidth = this.canvasWidth / 2;
    this.canvasHalfHeight = this.canvasHeight / 2;
    
    // This complicates things a little but but fixes mouse co-ordinate problems
    // when there's a border or padding. See getMouse for more detail
    var stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop;
    if (document.defaultView && document.defaultView.getComputedStyle) {
        this.stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingLeft'], 10)      || 0;
        this.stylePaddingTop  = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingTop'], 10)       || 0;
        this.styleBorderLeft  = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderLeftWidth'], 10)  || 0;
        this.styleBorderTop   = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderTopWidth'], 10)   || 0;
    }
    // Some pages have fixed-position bars (like the stumbleupon bar) at the top or left of the page
    // They will mess up mouse coordinates and this fixes that
    var html = document.body.parentNode;
    this.htmlTop = html.offsetTop;
    this.htmlLeft = html.offsetLeft;

    // **** Keep track of state! ****

    this.valid = false; // when set to false, the canvas will redraw everything
    this.dragging = false; // Keep track of when we are dragging
    // the current selected object. In the future we could turn this into an array for multiple selection
    this.selection = null;
    this.activity = null;
	this.editingSegment = false;
    this.dragoffx = 0; // See mousedown and mousemove events for explanation
    this.dragoffy = 0;
    this.lastmouseposX = 0;
    this.lastmouseposY = 0;
	lastX = canvas.width/2;
	lastY = canvas.height/2;
	var dragStart,dragged;

    // **** Then events! ****

    // This is an example of a closure!
    // Right here "this" means the CanvasState. But we are making events on the Canvas itself,
    // and when the events are fired on the canvas the variable "this" is going to mean the canvas!
    // Since we still want to use this particular CanvasState in the events we have to save a reference to it.
    // This is our reference!
    var myState = this;

	trackTransforms(this.ctx);
	this.ctx.save();

    //fixes a problem where double clicking causes text to get selected on the canvas
    canvas.addEventListener('selectstart', function(e) { e.preventDefault(); return false; }, false);
  
    // Up, down, and move are for dragging
    canvas.addEventListener('mousedown', function(e) {

		var mouse = myState.getMouse(e);
		
		var transPoint = myState.ctx.transformedPoint(mouse.x, mouse.y);
		var tp2 = myState.ctx.transformedPoint(mouse.x + 20, mouse.y);
		var pickTolerance = tp2.x - transPoint.x;
		var options = handleMouseDown(transPoint.x, transPoint.y, pickTolerance);

        if (WhichButton(e) == "LEFT" && !myState.editingSegment) {
			if (options == null) {
				myState.valid = true;
				myState.dragging = false;

				//pz
				document.body.style.mozUserSelect = document.body.style.webkitUserSelect = document.body.style.userSelect = 'none';
				lastX = e.offsetX || (e.pageX - canvas.offsetLeft);
				lastY = e.offsetY || (e.pageY - canvas.offsetTop);
				dragStart = myState.ctx.transformedPoint(lastX,lastY);
				dragged = false;
			}
			else {
				if (e.shiftKey) {
					/*
						shift key is down, we are to move the spline
					*/
					myState.selection = splinePaths[options.closestSplineIndex];
					myState.activity = "move";
					var elem = document.getElementById("splinesDiv");
					if (elem.style) elem.style.cursor = "move";                
				}
				else if (e.ctrlKey) {
					/*
						ctrl key is down, we are to rotate the spline
					*/
					var spline = splinePaths[options.closestSplineIndex];
					myState.selection = spline
					myState.activity = "rotate";
					spline.rotateBegin();
				}
				else {
					/*
						no key modifiers, we create a new knot
					*/
					myState.selection = insertNewKnot(options);
					myState.activity = "modify";
					var elem = document.getElementById("splinesDiv");
					if (elem.style) elem.style.cursor = "move";                
				}
				
				myState.valid = false;
				myState.dragging = true;
				myState.dragoffx = 0;
				myState.dragoffy = 0;
			}
        }
		myState.lastmouseposX = transPoint.x;
        myState.lastmouseposY = transPoint.y;
            
		//var mySel = knots[i];
		// Keep track of where in the object we clicked
		// so we can move it smoothly (see mousemove)
		//myState.dragoffx = mx - mySel.x;
		//myState.dragoffy = my - mySel.y;
		//myState.dragging = true;
		//myState.selection = mySel;

     }, true);
  
    canvas.addEventListener('mousemove', function(e) {
        if (WhichButton(e) == "LEFT" && !myState.editingSegment) {
			var mouse = myState.getMouse(e);
			var transPoint = myState.ctx.transformedPoint(mouse.x, mouse.y)

			if (myState.dragging){
				myState.valid = false; // Something's dragging so we must redraw

				// We don't want to drag the object by its top-left corner, we want to drag it
				// from where we clicked. Thats why we saved the offset and use it here

			   if (myState.activity == "modify") {
					var knot = myState.selection;
					knot.move(transPoint.x - myState.dragoffx, transPoint.y - myState.dragoffy);
					if (typeof updateCoordsDisplay == "function") { 
						updateCoordsDisplay(transPoint.x - myState.dragoffx, transPoint.y - myState.dragoffy);
					}
					updatePath(ActiveSplineIndex);
				}
				else if (myState.activity == "move") {
					var splinePath = myState.selection;
					var mx = transPoint.x - myState.lastmouseposX;
					var my = transPoint.y - myState.lastmouseposY;
					splinePath.move(mx, my);
				}
				else if (myState.activity == "rotate") {
					var splinePath = myState.selection;
					var mx = transPoint.x;
					var my = transPoint.y;
					splinePath.rotate(mx, my, myState.lastmouseposX, myState.lastmouseposY);
				}
				myState.lastmouseposX = transPoint.x;
				myState.lastmouseposY = transPoint.y;
			}
			else {
				var tp2 = myState.ctx.transformedPoint(mouse.x + 20, mouse.y);
				var pickTolerance = tp2.x - transPoint.x;
				var options = handleMouseDown(transPoint.x, transPoint.y, pickTolerance);

				if (options == null) {
					var elem = document.getElementById("splinesDiv");
					if (elem.style) elem.style.cursor = "default";                
					document.getElementById('info').style.visibility='hidden';
				}
				else {        
					var elem = document.getElementById("splinesDiv");
					if (elem.style) elem.style.cursor = "pointer";                

					if (typeof showNodeInfo == "function") { 
						// safe to use the function
						showNodeInfo(options);
					}
					document.getElementById('info').style.visibility='visible';
				}
				
				if (typeof showMouseInfo === 'function') { 
					// safe to use the function
					showMouseInfo(transPoint);
					document.getElementById('info').style.visibility='visible';
				}
				
				//pz
				lastX = e.offsetX || (e.pageX - canvas.offsetLeft);
				lastY = e.offsetY || (e.pageY - canvas.offsetTop);
				dragged = true;
				if (dragStart){
					var pt = myState.ctx.transformedPoint(lastX,lastY);
					myState.ctx.translate(pt.x-dragStart.x,pt.y-dragStart.y);
					myState.valid = false; // Something's dragging so we must redraw

				}
				
			}
		}
    }, true);
  
    canvas.addEventListener('mouseup', function(e) {
        if (WhichButton(e) == "LEFT" && !myState.editingSegment) {
			if (myState.selection) {
				myState.selection = null;
			}
			myState.dragging = false;
			var elem = document.getElementById("splinesDiv");
			if (elem.style) elem.style.cursor = "default";

			//pz
			dragStart = null;
			if (!dragged) zoom(e.shiftKey ? -1 : 1 );
		}
    }, true);
   
	
	canvas.addEventListener('contextmenu', function(e) {
		var mouse = myState.getMouse(e);
		
		var transPoint = myState.ctx.transformedPoint(mouse.x, mouse.y);
		var tp2 = myState.ctx.transformedPoint(mouse.x + 20, mouse.y);
		var pickTolerance = tp2.x - transPoint.x;
		var options = handleMouseDown(transPoint.x, transPoint.y, pickTolerance);

		if (options && options.existingKnot && typeof startEditToSegmentData == "function") { 
			//a knot is selected
			e.preventDefault();
			
			startEditToSegmentData(options);
		}
    }, true);
	
	
	//pz
	var scaleFactor = 1.1;
	var zoom = function(clicks){
		var pt = myState.ctx.transformedPoint(lastX,lastY);
		myState.ctx.translate(pt.x,pt.y);
		var factor = Math.pow(scaleFactor,clicks);
		myState.ctx.scale(factor,factor);
		myState.ctx.translate(-pt.x,-pt.y);
		myState.valid = false; // Something's dragging so we must redraw

	}
	var handleScroll = function(e){
		var delta = e.wheelDelta ? e.wheelDelta/40 : e.detail ? -e.detail : 0;
		if (delta) zoom(delta);
		return e.preventDefault() && false;
	};
	canvas.addEventListener('DOMMouseScroll',handleScroll,false);
	canvas.addEventListener('mousewheel',handleScroll,false);

    // **** Options! ****
    this.interval = 30;
    setInterval(function() { myState.draw(); }, myState.interval);
}

CanvasState.prototype.clear = function() {
	// Clear the entire canvas
	var p1 = this.ctx.transformedPoint(0,0);
	var p2 = this.ctx.transformedPoint(this.width,this.height);
	this.ctx.clearRect(p1.x,p1.y,p2.x-p1.x,p2.y-p1.y);
	if (img) this.ctx.drawImage(img, -1500, -2000);
}

// While draw is called as often as the INTERVAL variable demands,
// It only ever does something if the canvas gets invalidated by our code
CanvasState.prototype.draw = function() 
{
    // if our state is invalid, redraw and validate!
    if (!this.valid) {
        var ctx = this.ctx;
        this.clear();

        // ** Add stuff you want drawn in the background all the time here **

        // draw all linePaths
        var l = linePaths.length;
        for (var i = 0; i < l; i++) {
            linePaths[i].draw(ctx);
        }
        // draw all splinePaths
        var l = splinePaths.length;
        for (var i = 0; i < l; i++) {
            splinePaths[i].draw(ctx);
        }
        // draw all knots
        var l = knots.length;
        for (var i = 0; i < l; i++) {
            knots[i].draw(ctx);
        }

		for (var i = 0; i < DebugCircles.length; i++) {
			DebugCircles[i].draw(ctx);
		}
		
		for (var i = 0; i < DebugLines.length; i++) {
			DebugLines[i].draw(ctx);
		}
		
            // We can skip the drawing of elements that have moved off the screen:
            //if (knot.cx > this.width || knot.cy > this.height ||
            //knot.cx + knot.r < 0 || knot.cy + knot.r < 0) continue;
            //knots[i].draw(ctx);
            
        // ** Add stuff you want drawn on top all the time here **

        this.valid = true;
    }
}


// Creates an object with x and y defined, set to the mouse position relative to the state's canvas
// If you wanna be super-correct this can be tricky, we have to worry about padding and borders
CanvasState.prototype.getMouse = function(e) 
{
  var element = this.canvas, offsetX = 0, offsetY = 0, mx, my;
  
  // Compute the total offset
  if (element.offsetParent !== undefined) {
    do {
      offsetX += element.offsetLeft;
      offsetY += element.offsetTop;
    } while ((element = element.offsetParent));
  }

  // Add padding and border style widths to offset
  // Also add the <html> offsets in case there's a position:fixed bar
  offsetX += this.stylePaddingLeft + this.styleBorderLeft + this.htmlLeft;
  offsetY += this.stylePaddingTop + this.styleBorderTop + this.htmlTop;

  mx = e.pageX - offsetX;
  my = e.pageY - offsetY;
  
  // We return a simple javascript object (a hash) with x and y defined
  return {x: mx, y: my};
}

// trackTransforms from http://phrogz.net/tmp/canvas_zoom_to_cursor.html
function trackTransforms(ctx)
{
	var svg = document.createElementNS("http://www.w3.org/2000/svg",'svg');
	var xform = svg.createSVGMatrix();
	ctx.getTransform = function(){ return xform; };
	
	var savedTransforms = [];
	var save = ctx.save;
	ctx.save = function(){
		savedTransforms.push(xform.translate(0,0));
		return save.call(ctx);
	};
	var restore = ctx.restore;
	ctx.restore = function(){
		xform = savedTransforms.pop();
		return restore.call(ctx);
	};

	var scale = ctx.scale;
	ctx.scale = function(sx,sy){
		xform = xform.scaleNonUniform(sx,sy);
		return scale.call(ctx,sx,sy);
	};
	var rotate = ctx.rotate;
	ctx.rotate = function(radians){
		xform = xform.rotate(radians*180/Math.PI);
		return rotate.call(ctx,radians);
	};
	var translate = ctx.translate;
	ctx.translate = function(dx,dy){
		xform = xform.translate(dx,dy);
		return translate.call(ctx,dx,dy);
	};
	var transform = ctx.transform;
	ctx.transform = function(a,b,c,d,e,f){
		var m2 = svg.createSVGMatrix();
		m2.a=a; m2.b=b; m2.c=c; m2.d=d; m2.e=e; m2.f=f;
		xform = xform.multiply(m2);
		return transform.call(ctx,a,b,c,d,e,f);
	};
	var setTransform = ctx.setTransform;
	ctx.setTransform = function(a,b,c,d,e,f){
		xform.a = a;
		xform.b = b;
		xform.c = c;
		xform.d = d;
		xform.e = e;
		xform.f = f;
		return setTransform.call(ctx,a,b,c,d,e,f);
	};
	var pt  = svg.createSVGPoint();
	ctx.transformedPoint = function(x,y){
		pt.x=x; pt.y=y;
		return pt.matrixTransform(xform.inverse());
	}
}


//====================================================================================
function InitialiseSplineEditor(canvas)
{
	theCanvasState = new CanvasState(canvas);
}

function updateDisplay()
{
	//re-initialize
	theCanvasState.ctx.restore();
	theCanvasState.ctx.save();

	var trans = GetDisplayTranslationForSplineFiles();
	
	//theCanvasState.ctx.scale(-1.0,-1.0);
	//theCanvasState.ctx.translate(-theCanvasState.canvasWidth-trans[0],-theCanvasState.canvasHeight-trans[1]);
	var xScale = trans[2];
	var yScale = trans[3];
	theCanvasState.ctx.scale(xScale,yScale);
	theCanvasState.ctx.translate(xScale * (theCanvasState.canvasWidth + trans[0]), yScale * (theCanvasState.canvasHeight + trans[1]));
	theCanvasState.valid = false;
}

function AddSplineToEditor(splineReferenceIndex, splinePoints, numSplinePoints, isClosed, xi, yi, width, splineColor, knotRadius, values, isEditable, channelIndices, timeChannelIndices, closeStyle)
{
    var fillColor = 'rgba(200,200,200,0.5)';
    var theNewSpline = createSolidPath(splineReferenceIndex, splinePoints, numSplinePoints, isClosed, xi, yi, width, splineColor, fillColor, knotRadius, values, isEditable, channelIndices, timeChannelIndices, closeStyle);

    updatePaths();
	
	return theNewSpline;
}

function AddLinePathToEditor(linePoints, numlinePoints, isClosed, xi, yi, width, lineColor)
{
    var fillColor = "undefined";
    var lineIndex = linePaths.length;
    linePaths[lineIndex] = new LinePath(linePoints, numlinePoints, isClosed, xi, yi, width, lineColor, fillColor);

    theCanvasState.valid = false;
}

function RemoveLinePathsFromEditor()
{
	linePaths = [];
}

function createSolidPath(splineReferenceIndex, pointList, numPoints, isClosed, xi, yi, width, splineColor, splineFillColor, knotRadius, values, isEditable, channelIndices, timeChannelIndices, closeStyle)
{
    var firstKnotIndex = knotsIndex = knots.length;
	for (i = 0; i < numPoints; i++) {
		var fillColor = "gold";
		if (i == 0) {
			fillColor = "black";
		}
		if (values && values[i]) {
			fillColor = "red";
		}
		knots[knotsIndex] = new Knot(fillColor, [pointList[i][xi], pointList[i][yi]], knotRadius, i, i);
		knotsIndex++;
	}
	//knots[knotsIndex] = knots[0];
	
    /*spline objects, hold the spline definition*/
    var splineIndex = splinePaths.length;
    splinePaths[splineIndex] = new SplinePath(splineReferenceIndex, firstKnotIndex, numPoints, isClosed, width, splineColor, splineFillColor, isEditable, channelIndices, timeChannelIndices, closeStyle);
    
    if (isEditable) setActiveSpline(splineIndex);
    updatePaths();
	return splinePaths[splineIndex];
}

function createOpenPath()
{
}

/*Javascript "structure" to hold polyline definition*/
function LinePath(pointList, numPoints, isClosed, xi, yi, width, lineColor, fillColor)
{
	this.width = width;
    this.lineColor = lineColor;
    this.fillColor = fillColor;
    this.points = new Array();

    for (var i = 0; i < numPoints; i++) {
		this.points[i] = [pointList[i][xi], pointList[i][yi]];
	}
	if (isClosed) this.points[numPoints] = [pointList[0][xi], pointList[0][yi]];
	this.isClosed = isClosed;
    return this;
}

// Draws this LinePath to a given context
LinePath.prototype.draw = function(ctx, width, lineColor, fillColor) 
{
    if (typeof width === "undefined") width = this.width;
    if (typeof lineColor === "undefined") lineColor = this.lineColor;
    if (typeof fillColor === "undefined") fillColor = this.fillColor;

    ctx.beginPath();
    /*
        draw the line
    */
    var length = this.points.length;
	var points = this.points;
    if (length > 1) {
        ctx.moveTo(points[0][0], points[0][1]);
        for (i = 1; i < length; i++) {
            ctx.lineTo(points[i][0], points[i][1]);
        }
    }
    if (this.isClosed) {
		if (fillColor === "undefined") {
		}
		else {
			ctx.fillStyle = fillColor;
			ctx.fill();
		}
    }
	ctx.lineWidth = width;
    ctx.strokeStyle = lineColor;
    ctx.stroke();
}

/*Javascript "structure" to hold spline definition*/
function SplinePath(splineReferenceIndex, firstKnotIndex, numPoints, isClosed, width, lineColor, fillColor, isEditable, channelIndices, timeChannelIndices, closeStyle)
{
    this.splineReferenceIndex = splineReferenceIndex;
	this.width = width;
    this.lineColor = lineColor;
    this.fillColor = fillColor;
    this.K = new Array();
    this.minx = 0;
    this.miny = 0;
    this.maxx = 0;
    this.maxy = 0;
    this.cx = 0;
    this.cy = 0;
	this.isEditable = isEditable;

    for (var i = 0; i < numPoints; i++) {
		this.K[i] = knots[firstKnotIndex + i];
	}
	if (isClosed) this.K[numPoints] = knots[firstKnotIndex];
	this.isClosed = isClosed;
    this.catmullRomSpline = null;
	this.closeStyle = closeStyle;
	this.channelIndices = channelIndices;
	this.timeChannelIndices = timeChannelIndices;
    return this;
}

// Draws this SplinePath to a given context
SplinePath.prototype.draw = function(ctx, width, lineColor, fillColor) 
{
    if (typeof width === "undefined") width = this.width;
    if (typeof lineColor === "undefined") lineColor = this.lineColor;
    if (typeof fillColor === "undefined") fillColor = this.fillColor;

    ctx.beginPath();
    /*
        draw the spline
    */
    var points = this.catmullRomSpline.GetInterpolatedPoints();
    var length = points.length;

    if (length > 1) {
        ctx.moveTo(points[0][0], points[0][1]);
        for (i = 1; i < length; i++) {
            ctx.lineTo(points[i][0], points[i][1]);
        }
    }
	if (this.isClosed) {
		if (fillColor === "undefined") {
		}
		else {
			ctx.fillStyle = fillColor;
			ctx.fill();
		}
    }
	ctx.lineWidth = width;
    ctx.strokeStyle = lineColor;
    ctx.stroke();
}

SplinePath.prototype.move = function(mx, my)
{
    var logThisFunction = false 
    if (logThisFunction) console.log("------------enter SplinePath.prototype.move");
    var K = this.K;

    /*
        get the coordinates from the the knots of the spline
    */
    for (var j = 0; j < K.length; j++) {
        if (j == 0 && this.isClosed) {
            /*
                this spline is closed, ignore the first point, it will be updated as the last point 
            */
        }
        else {
            /*
                get the knot coordinates, ignoring duplicate points
            */
            if (logThisFunction) console.log("before move j = " + j + " " + K[j].point[0] + " " + K[j].point[1]);
            K[j].point[0] += mx;
            K[j].point[1] += my;
            if (logThisFunction) console.log("after move j = " + j + " " + K[j].point[0] + " " + K[j].point[1]);
        }
    }

    /*
        update the interpolated catmull rom spline
    */
    updateSplineCoordinates(this);
    if (logThisFunction) console.log("------------exit SplinePath.prototype.move");
}

SplinePath.prototype.rotateBegin = function()
{
    /*
        calculate cx, cy
    */
    this.cx = (this.maxx + this.minx) / 2;
    this.cy = (this.maxy + this.miny) / 2;
}

SplinePath.prototype.rotate = function(mx, my, mx1, my1)
{
    var logThisFunction = false 
    if (logThisFunction) console.log("------------enter SplinePath.prototype.move");
    var K = this.K;

    /*
        calculate the rotation angle NEED cx cy WHEN THE ROTATION BEGAN
    */
    var dx1 = mx1 - this.cx;
    var dy1 = my1 - this.cy;
    var dx = mx - this.cx;
    var dy = my - this.cy;
    var a1 = Math.atan2(dy1, dx1);
    var a = Math.atan2(dy, dx);
    a = a - a1;
    
    /*
        get the coordinates from the the knots of the spline
    */
    for (var j = 0; j < K.length; j++) {
        if (j == 0 && this.isClosed) {
            /*
                this spline is closed, ignore the first point, it will be updated as the last point 
            */
        }
        else {
            /*
                get the knot coordinates, ignoring duplicate points
            */
            var x = K[j].point[0] - this.cx;
            var y = K[j].point[1] - this.cy;
            
            K[j].point[0] = x * Math.cos(a) - y * Math.sin(a) + this.cx;
            K[j].point[1] = x * Math.sin(a) + y * Math.cos(a) + this.cy;
        }
    }

    /*
        update the interpolated catmull rom spline
    */
    updateSplineCoordinates(this);
    if (logThisFunction) console.log("------------exit SplinePath.prototype.move");
}


function Knot(color, point, radius, referenceIndex, currentIndex)
{
    this.point = point;
    this.color = color;
    this.radius = radius;
	this.referenceIndex = referenceIndex;
	this.currentIndex = currentIndex;
    return this;
}

// Draws this knot to a given context
Knot.prototype.draw = function(ctx) 
{
    ctx.beginPath();
    ctx.arc(this.point[0], this.point[1], this.radius, 0, 2 * Math.PI);
    ctx.fillStyle=this.color;
    ctx.fill();
    ctx.lineWidth=0.2;
    ctx.strokeStyle="black";
    ctx.stroke();
}

Knot.prototype.move = function(mx, my)
{
    this.point[0] = mx;
    this.point[1] = my;
	KnotBeingDragged = this;
}

Knot.prototype.setColor = function(color)
{
    this.color = color;
	theCanvasState.valid = false;
}

function DebugCircle(pointX, pointY, radius, color, fill, width)
{
	this.point = [pointX, pointY];
	this.radius = radius;
	this.color = color;
	this.fill = fill;
	this.width = width;
}

DebugCircle.prototype.draw = function(ctx)
{
    ctx.beginPath();
    ctx.arc(this.point[0], this.point[1], this.radius, 0, 2 * Math.PI);
    ctx.fillStyle=this.fill;
    ctx.fill();
    ctx.lineWidth=this.width;
    ctx.strokeStyle=this.color;
    ctx.stroke();
}

function AddDebugCircle(pointX, pointY, radius, color, fill, width)
{
	var debugCircle = new DebugCircle(pointX, pointY, radius, color, fill, width);
	DebugCircles.push(debugCircle);
}

function DebugLine(x1, y1, x2, y2, color, width)
{
	this.x1 = x1;
	this.y1 = y1;
	this.x2 = x2;
	this.y2 = y2;
	this.color = color;
	this.width = width;
}

DebugLine.prototype.draw = function(ctx)
{
    ctx.moveTo(this.x1, this.y1);
    ctx.lineTo(this.x2, this.y2);
    ctx.lineWidth = this.width;
    ctx.strokeStyle = this.color;
    ctx.stroke();
}

function AddDebugLine(x1, y1, x2, y2, color, width)
{
	var debugLine = new DebugLine(x1, y1, x2, y2, color, width);
	DebugLines.push(debugLine);
}

function handleMouseDown(mx, my, pickTolerance) 
{
    if (splinePaths.length == 0) return;
	var point = [mx, my];
	var pickToleranceSquared = pickTolerance*pickTolerance;
    
    var logThisFunction = false;
    if (logThisFunction) console.log("handleMouseDown");
    
    var minDistSquared = Number.MAX_VALUE;
    var minIndex = -1;
    var closestSpline;
    var closestSplineIndex = -1;
    
    /*
        search all the splinePaths to find the closest control point
    */
    for (var i = 0; i < splinePaths.length; i++) {
        var skip = 0;
        var spline = splinePaths[i];
        if (spline.isEditable) {
			if (spline.isClosed) skip = 1;

			for (var j = 0; j < spline.K.length - skip; j++) {
				var knotPoint = spline.K[j].point;
				var dx = point[0] - knotPoint[0];
				var dy = point[1] - knotPoint[1];
				var distSquared = dx * dx + dy * dy;
				if (distSquared < minDistSquared) {
					minDistSquared = distSquared;
					minIndex = j;
					closestSplineIndex = i;
				}
			}
		}
	}
    fromEnd = false;
    fromStart = false;
    
    if (minDistSquared < pickToleranceSquared) {
        /*
            we are close enough to an existing control point
        */
        closestSpline = splinePaths[closestSplineIndex];
		splineReferenceIndex = closestSpline.splineReferenceIndex;
        setActiveSpline(closestSplineIndex);
        
        if (closestSpline.isClosed) {
            if (logThisFunction) console.log("selecting existing point ");
            return {
                existingKnot: closestSpline.K[minIndex],
				knotIndex: minIndex,
                splineReferenceIndex: splineReferenceIndex,
				closestSplineIndex: closestSplineIndex,
                closestOnSpline: null,
                fromStart: fromStart,
                fromEnd: fromEnd
            };
        }
        else {
            /*
                an open spline, check if we are at one of the ends
            */
            if (minIndex == 0) {
                /*
                    extend out of the start
                */
                if (logThisFunction) console.log("fromStart");
                fromStart = true;
            }
            else if (minIndex == closestSpline.K.length - 1) {
                /*
                    extend out of the end
                */
                if (logThisFunction) console.log("fromEnd");
                fromEnd = true;
            }
            else {
                /*
                    an intermediate point, just return, we don't need to add any spline control points
                */
                return {
                    existingKnot: closestSpline.K[minIndex],
					knotIndex: minIndex,
					splineReferenceIndex: splineReferenceIndex,
                    closestSplineIndex: closestSplineIndex,
                    closestOnSpline: closestOnSpline,
                    fromStart: fromStart,
                    fromEnd: fromEnd
                };
            }
        }
    }

    var closestOnSpline = null;

    if (fromStart || fromEnd) {
        closestOnSpline = closestSpline.catmullRomSpline.DropPointOnSpline(point);
    }
    else {
        /*
            we weren't close to an existing control point, check if we are close to one of the actual splinePaths
        */           
        for (var i = 0; i < splinePaths.length; i++) {
            var spline = splinePaths[i];
            if (spline.isEditable) {
				var closestOnThisSpline = spline.catmullRomSpline.DropPointOnSpline(point);
				if (closestOnSpline == null || closestOnThisSpline.minDistSquared < closestOnSpline.minDistSquared) {
					closestSplineIndex = i;
					closestSpline = spline;
					closestOnSpline = closestOnThisSpline;
					if (logThisFunction) console.log("closestOnSpline " + closestOnSpline.segment + " = " + Math.sqrt(closestOnSpline.minDistSquared));
				}
			}
        }
        if (closestSplineIndex == -1 || closestOnSpline.minDistSquared > pickToleranceSquared) {
            /*
                not close to an existing spline either, nothing is selected, just return
            */
            return null;
        }
    }
	splineReferenceIndex = closestSpline.splineReferenceIndex;
    return {
        existingKnot: null,
		knotIndex: -1,
		splineReferenceIndex: splineReferenceIndex,
        closestSplineIndex: closestSplineIndex,
        closestOnSpline: closestOnSpline,
        fromStart: fromStart,
        fromEnd: fromEnd
    };
}
    
function insertNewKnot(options)
{
    var logThisFunction = false;
    if (logThisFunction) console.log("insertNewKnot");
    
    var existingKnot = options.existingKnot;
    if (existingKnot != null) return existingKnot;
    
    var closestSplineIndex = options.closestSplineIndex;
    var closestOnSpline = options.closestOnSpline;
    var fromStart = options.fromStart;
    var fromEnd = options.fromEnd;
    var closestSpline = splinePaths[closestSplineIndex];
    
    /*
        determine insert position in the spline
    */
	var insertAt;
    if (fromStart) {
        insertAt = 0;
    }
    else if (fromEnd) {
		insertAt = closestSpline.K.length;
     }
    else {
        insertAt = closestOnSpline.segment + 1
    }

    /*
        create a new knot, it's either on an existing spline or being pulled out from the end
    */
    var knotColor = (fromEnd || fromStart) ? "green" : "blue"; 
    if (logThisFunction) console.log("creating new point ");
	
    var newKnot = new Knot(knotColor, closestOnSpline.point, editableKnotRadius, -1, insertAt);

    /*
        add it to our array of knots
    */
    knots.push(newKnot);
    if (logThisFunction) console.log("created knots.length = " + knots.length);
		
	closestSpline.K.splice(insertAt, 0, newKnot);
	
	/*
		fix up the current indices after the splice
	*/
	for (var i = 0; i < closestSpline.K.length; i++) {
		closestSpline.K[i].currentIndex = i;
	}
	
	/*
		and add the data point 
	*/
	AddNewPoint(closestSpline, insertAt)
    
    /*
        update the spline path now that it contains the new point
    */
    updatePath(closestSplineIndex);
    
    /*
        set the activeSpline color
    */
    setActiveSpline(closestSplineIndex);

    return newKnot;
}

function RemoveDuplicatePointsFromSpline (spline)
{
    var logThisFunction = false;
    if (logThisFunction) console.log("BEFORE knots.length = " + knots.length);

    for (var j = 0; j < spline.K.length - 1; j++) {
        var knotPointThis = spline.K[j].point;
        var knotPointNext = spline.K[j + 1].point;
        var dx = knotPointNext[0] - knotPointThis[0];
        var dy = knotPointNext[1] - knotPointThis[1];
        var distSquared = dx * dx + dy * dy;
        if (distSquared <= 4) {
            /*
                this knot is duplicated
            */
            if (j == spline.K.length - 2) {
				/*
					trying to remove the last knot, don't do this, remove the next to last
				*/
				var knotToRemove = spline.K[j];
				var point = knotToRemove.point;
				knots.splice(knots.indexOf(knotToRemove), 1);
				
				/*
					and remove it from our spline and be done
				*/
				spline.K.splice(j, 1);
				RemovePoint(spline, j, point);
			}
			else {
				/*
					find the knot in our array of knots and remove it
				*/
				var indexToRemove = (theCanvasState.selection == spline.K[j]) ? j + 1 : j;
				var knotToRemove = spline.K[indexToRemove];
				var point = knotToRemove.point;
	
				knots.splice(knots.indexOf(knotToRemove), 1);
				
				/*
					and remove it from our spline
				*/
				spline.K.splice(indexToRemove, 1);
				RemovePoint(spline, indexToRemove, point);
				j--;
			}
			if (logThisFunction) console.log("removed knot spline.K.length = " + spline.K.length + " removed = " + j + " " + knotToRemove.color);

			/*
				fix up the current indices after the splice
			*/
			for (var i = 0; i < spline.K.length; i++) {
				spline.K[i].currentIndex = i;
			}
        }
    }
    if (logThisFunction) console.log("AFTER knots.length = " + knots.length);
}
    
function setActiveSpline(activeSplineIndex) 
{
    ActiveSplineIndex = activeSplineIndex;
    
    /*
        change color of this path to green and all others to gray
    */
    for (var i = 0; i < splinePaths.length; i++) {
        splinePaths[i].color = "gray";
    }
    if (activeSplineIndex >= 0) splinePaths[activeSplineIndex].color = "green";
}

function tryToBacktrackPath (spline, a, b, c, segmentIndex)
{
    /*
        constructing from the start of the path, check if we are far away enough from the start point
        our current point is on the first segment
    */
    var logThisFunction = false;
    if (logThisFunction) console.log("tryToBacktrackPath a,b,c = " + a + " " + b + " " + c);
    var knotPointA = spline.K[a].point;
    var knotPointB = spline.K[b].point;
    var knotPointC = spline.K[c].point;
    var dx = knotPointC[0] - knotPointA[0];
    var dy = knotPointC[1] - knotPointA[1];
    var distSquaredAC = dx * dx + dy * dy;

    var dx = knotPointC[0] - knotPointB[0];
    var dy = knotPointC[1] - knotPointB[1];
    var distSquaredBC = dx * dx + dy * dy;
    if (logThisFunction) console.log("distSquaredAC = " + distSquaredAC);
    if (logThisFunction) console.log("distSquaredBC = " + distSquaredBC);

    if (distSquaredAC < distSquaredBC) {
        if (logThisFunction) console.log("distSquared > 20*20");
        /*
            far enough away from the start, is the knot close to the existing spline itself
        */
        var closestOnSpline = spline.catmullRomSpline.DropPointOnSplineSegment(knotPointA, segmentIndex);
        if (logThisFunction) console.log("closestOnSpline = " + closestOnSpline);
        if (closestOnSpline.minDistSquared < 15*15) {
            if (logThisFunction) console.log("closestOnSpline.minDistSquared = " + closestOnSpline.minDistSquared);
            /*
                it is, remove the first knot from the spline so we can erase back along the curve
            */
            var knotToRemove = spline.K[b];
            if (logThisFunction) console.log("removing knot " + b);
            
            /*
                find the knot in our array of knots and remove it
            */
            knots.splice(knots.indexOf(knotToRemove), 1);
            
            /*
                and remove it from our spline
            */
            spline.K.splice(b, 1);
			
 			/*
				fix up the current indices after the splice
			*/
			for (var i = 0; i < spline.K.length; i++) {
				spline.K[i].currentIndex = i;
			}
        }
    }
}

function updatePath(splineIndex)
{ 
    if (splineIndex < 0) return;
    
    var logThisFunction = false 
    if (logThisFunction) console.log("------------enter UpdatePath");
    var spline = splinePaths[splineIndex];
    var K = spline.K;
	var updateCoordinates = true;
	
    if (fromStart && K.length > 2) {
        tryToBacktrackPath (spline, 0, 1, 2, 1);    
    }
    else if (fromEnd && K.length > 2) {
        var lastIndex = spline.K.length - 1;
        tryToBacktrackPath (spline, lastIndex, lastIndex - 1, lastIndex - 2, lastIndex - 2);    
    }
    else {
        RemoveDuplicatePointsFromSpline(spline);
        if (spline.isClosed) {
            if (K.length == 2) {
                if (logThisFunction) console.log("removing degenerate polygon");
                /*
                    the last knot is a repeat of the first, remove the two remaining knots
                    from our knots array
                */
                knots.splice(knots.indexOf(K[1]), 1);
                knots.splice(knots.indexOf(K[0]), 1);
                
                /*
                    remove the spline
                */
                splinePaths.splice(splineIndex, 1);
                setActiveSpline(splinePaths.length - 1)
				updateCoordinates = false;
            }
        }
        else if (K.length == 1) {
            if (logThisFunction) console.log("removing last knot");

            /*
                find the knot in our array of knots and remove it
            */
            knots.splice(knots.indexOf(K[0]), 1);
            
            /*
                remove the spline
            */
            splinePaths.splice(splineIndex, 1);
            setActiveSpline(splinePaths.length - 1)
            updateCoordinates = false;
        }
    }

    if (updateCoordinates) {
		/*
			update the interpolated catmull rom spline
		*/
		if (typeof NotifySplineCoordinatesUpdated == "function") { 
			/*
				but first notify the owner of the data to give a chance to modify 
			*/
			NotifySplineCoordinatesUpdated(splinePaths[splineIndex]);
		}
		updateSplineCoordinates(spline);
	}
    if (logThisFunction) console.log("------------exit UpdatePath");
}

/*
    interpolate the spline into a set of points using CatmullRom
*/
function updateSplineCoordinates(spline) 
{
    var logThisFunction = false;
    /*
        get the coordinates from the the knots of the spline
    */
    var K = spline.K;
    var coordinates = new Array();
    var index = 0;
    if (logThisFunction) console.log(spline.K);
    for (var j = 0; j < K.length; j++) {
        /*
            get the knot coordinates, ignoring duplicate points
        */
        var knotPoint = K[j].point;
        if (logThisFunction) console.log("j = " + j + " " + knotPoint[0] + " " + knotPoint[1]);
        if (j == 0 || coordinates[index - 1][0] != knotPoint[0] || coordinates[index - 1][1] != knotPoint[1]) {
            if (logThisFunction) console.log("knot coordinates[" + index + "] = " + knotPoint);
            coordinates[index++] = knotPoint;
        }
    }

    spline.catmullRomSpline = new CatmullRom(coordinates, [0,1], [0,1], spline.closeStyle);

    /*
        interpolate the spline into a set of points using CatmullRom
		chordal is smoother than centripetal. centripetal is too stiff
    */
//    spline.catmullRomSpline.InterpolateSplineToTolerance(0.05, "CatmullRomTypeCentripetal");
    spline.catmullRomSpline.InterpolateSplineToTolerance(0.05, "CatmullRomTypeChordal");
    
    var minmax = spline.catmullRomSpline.GetMinMax();
    spline.minx = minmax.minx;
    spline.miny = minmax.miny;
    spline.maxx = minmax.maxx;
    spline.maxy = minmax.maxy;
}

function updatePaths()
{ 
    for (var i = 0; i < splinePaths.length; i++) {
        updatePath(i);
    }
    theCanvasState.valid = false;
}


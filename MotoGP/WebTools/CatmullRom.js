(function (module) {

    function distanceSquaredBetweenPoints(P1, P2) 
    { 
        var dx = P2[0] - P1[0];
        var dy = P2[1] - P1[1];
        return dx * dx + dy * dy;
    }

    function dropPointToLineSegment(p, P1, P2) 
    {
        var distPlP2 = distanceSquaredBetweenPoints(P1, P2);
        
        if (distPlP2 == 0) {
            return P1;
        }

        var t = ((p[0] - P1[0]) * (P2[0] - P1[0]) + (p[1] - P1[1]) * (P2[1] - P1[1])) / distPlP2;

        if (t < 0) {
            return P1;
        }
        else if (t > 1) {
            return P2;
        }
        else {
            return [P1[0] + t * (P2[0] - P1[0]), P1[1] + t * (P2[1] - P1[1])];
        }
    }

	function dropXToLineSegment(p, v, w) 
    {
		var d = w[0] - v[0];
		var t = p[0] - v[0];
		if (d == 0 ||
		    d > 0 && (p[0] < v[0] || p[0] > w[0]) ||
			d < 0 && (p[0] > v[0] || p[0] < w[0])) {
			return "undefined";
		}
		return v[1] + (w[1] - v[1]) * t / d;
    }
	
    function distSquaredToLineSegment(p, P1, P2)
    {
        return distanceSquaredBetweenPoints(p, dropPointToLineSegment(p, P1, P2));
    }

    function distToLineSegment(p, P1, P2) { 
        return Math.sqrt(distToLineSegmentSquared(p, P1, P2)); 
    }

    function InterpolateWithParameterizedt(p, time, t) 
    {
        /*
            this computation is used to calculate the same values but
            intoduces the ability to "parameterize" the t values used in the
            calculation. This is based on Figure 3 from
            http://www.cemyuksel.com/research/catmullrom_param/catmullrom.pdf

            p An array of int values of length 4, where interpolation occurs from p1 to p2.
        
            time An array of time measures of length 4, corresponding to each p value.
            t the actual interpolation ratio from 0 to 1 representing the * position between p1 and p2 to 
            interpolate the value.
        */
        var L01 = p[0] * (time[1] - t) / (time[1] - time[0]) + p[1] * (t - time[0]) / (time[1] - time[0]);
        var L12 = p[1] * (time[2] - t) / (time[2] - time[1]) + p[2] * (t - time[1]) / (time[2] - time[1]);
        var L23 = p[2] * (time[3] - t) / (time[3] - time[2]) + p[3] * (t - time[2]) / (time[3] - time[2]);
        var L012 = L01 * (time[2] - t) / (time[2] - time[0]) + L12 * (t - time[0]) / (time[2] - time[0]);
        var L123 = L12 * (time[3] - t) / (time[3] - time[1]) + L23 * (t - time[1]) / (time[3] - time[1]);
        var C12 = L012 * (time[2] - t) / (time[2] - time[1]) + L123 * (t - time[1]) / (time[2] - time[1]);
        return C12;
    }
	
    function InterpolateWithParameterizedt(p, time, t, index) 
    {
        var L01 = p[0][index] * (time[1] - t) / (time[1] - time[0]) + p[1][index] * (t - time[0]) / (time[1] - time[0]);
        var L12 = p[1][index] * (time[2] - t) / (time[2] - time[1]) + p[2][index] * (t - time[1]) / (time[2] - time[1]);
        var L23 = p[2][index] * (time[3] - t) / (time[3] - time[2]) + p[3][index] * (t - time[2]) / (time[3] - time[2]);
        var L012 = L01 * (time[2] - t) / (time[2] - time[0]) + L12 * (t - time[0]) / (time[2] - time[0]);
        var L123 = L12 * (time[3] - t) / (time[3] - time[1]) + L23 * (t - time[1]) / (time[3] - time[1]);
        var C12 = L012 * (time[2] - t) / (time[2] - time[1]) + L123 * (t - time[1]) / (time[2] - time[1]);
        return C12;
    }

    /*
        This module will calculate the Catmull-Rom interpolation curve, returning
        it as a list of Coord coordinate objects.  This method in particular
        adds the first and last control points which are not visible, but required
        for calculating the spline. If the first and last point are the same then a loop 
        is constructed

        coordinates: The list of original points through which to pass the spline

        pointsPerSegment: The number of equally spaced points to return along each curve
        segment. The actual distance between each point will depend on the spacing 
        between the original points.
        
        curveType: three ways to interpolate the Catmull Rom spline:
        "CatmullRomTypeChordal" (stiff)
        "CatmullRomTypeUniform" (floppy)
        "CatmullRomTypeCentripetal" (medium)

        returns: Array of interpolated coordinates.
		
		each coordinate in the array coordinates is a array of values, e.g. [x,y,z,f]
		each is considered as a channel of data		
		
		channelIndices indicates which channels in that array are relevant in terms of what 
		needs to be interpolated.
		
		timeChannelIndices indicates which channels are relevant in the time dimension, i.e.
		which channels are used to parameterize the spline
    */
    var CatmullRom = function (coordinates, channelIndices, timeChannelIndices, closeType) {
        this.controlPoints = new Array();
        this.isClosed = false;
        this.interpolatedPoints = new Array();
        this.numSegments = 0;
        this.numPointsThisSegment = new Array();

        var numCoordinates = coordinates.length;

        this.numSegments = numCoordinates - 1;

		this.channelIndices = (typeof channelIndices === "undefined") ? [0, 1] : channelIndices;
		this.timeChannelIndices = (typeof timeChannelIndices == "undefined") ? [0, 1] : timeChannelIndices;
		this.closeType = (typeof closeType === "undefined") ? "detect" : closeType;
		
        /*
            copy the coordinates into our controlPoints array leaving the start and end 
            values empty
        */
        for (var i = 0; i < numCoordinates; i++) {
            this.controlPoints[i + 1] = coordinates[i];
        }
        if (numCoordinates < 3) {
            /*
                a point or a straight line segment, just return;
            */
            return this;
        }

        if (this.closeType == "detect") {
			/*
				check if the spline is closed
			*/
			if (this.CoordinatesEqual(coordinates[0], coordinates[numCoordinates - 1])) {
				/*
					the last point repeats the first point, the spline is closed
				*/
				this.closeType = "closed";
			}
			else {
				this.closeType = "open";
			}
		}
        if (this.closeType == "closed") {
			/*
                put the second to last point at the beginning of our array as a control point
            */
            this.controlPoints[0] = coordinates[numCoordinates - 2];

            /*
                now add the second point at the end of our array as a control point
            */
            this.controlPoints[numCoordinates + 1] = coordinates[1];
            this.isClosed = true;
        }
        else if (this.closeType == "open") {
			/*
                the spline is open, use control points that simply extend the first and last segments
                get the change in x and y between the first and second coordinates.
                and extrapolate backwards to create a control point.
                insert it at the start of the list of controlPoints
            */
            this.controlPoints[0] = this.GetExtrapolatedPoint(coordinates[1], coordinates[0]); // coordinate[0] - (coordinate[1] - coordinate[0])

            /*
                same for end control point
            */
            this.controlPoints[numCoordinates + 1] = this.GetExtrapolatedPoint(coordinates[numCoordinates - 2], coordinates[numCoordinates - 1]); 
        }
		else {
			/*
				this.closeType assumed to be "wrapped"
            */
            this.controlPoints[0] = this.GetWrappedPoint(coordinates[numCoordinates - 1], coordinates[numCoordinates - 2], coordinates[0]); // coordinates[0] - coordinates(numCoordinates - 1] - coordinates[numCoordinates - 2])

            /*
                same for end control point
            */
            this.controlPoints[numCoordinates + 1] = this.GetWrappedPoint(coordinates[0], coordinates[1], coordinates[numCoordinates - 1]); // coordinates[numCoordinates - 1] - (coordinates[0] - coordinates[1])
		}
        return this;
    };

    CatmullRom.prototype = {

		CoordinatesEqual: function (coordA, coordB) 
        {
			for (var i = 0; i < this.channelIndices.length; i++) {
				var index = this.channelIndices[i];
				if (coordA[index] != coordB[index]) return false; 
			}
			return true;
		},
		
        GetExtrapolatedPoint: function (coord, coordBase) // coordBase - (coord - coordBase)
		{
			var point = [];
			for (var i = 0; i < coord.length; i++) {
				point[i] = coordBase[i] - (coord[i] - coordBase[i]);
			}
			return point;
		},

		
        GetWrappedPoint: function (coordA, coordB, coordBase) // coordBase - (coordA - coordB)
		{
			var point = [];
			for (var i = 0; i < coordA.length; i++) {
				var wrapThisChannel = false;
				for (var j = 0; j < this.timeChannelIndices.length; j++) {
					var index = this.timeChannelIndices[j];
					if (index == i) {
						wrapThisChannel = true;
						break;
					}
				}
				if (wrapThisChannel) {
					point[i] = coordBase[i] - (coordA[i] - coordB[i]);
				}
				else {
					point[i] = coordB[i];
				}
			}
			return point;
		},

		CalcTime: function (coordA, coordB)
		{
			var tSquared = 0;
			if (typeof coordA === "undefined" || typeof coordB === "undefined") {
				tSquared += 0;
			}
			for (var i = 0; i < this.timeChannelIndices.length; i++) {
				var index = this.timeChannelIndices[i];
				var tPart = coordA[index] - coordB[index];
				tSquared += tPart * tPart;
			}
			return Math.sqrt(tSquared);
		},
		
		InterpolateWithParameterizedt: function (coords4, time, t) 
		{
			var interpolatedCoord = [];
			for (var i = 0; i < coords4[0].length; i++) { // for every channel
				interpolatedCoord[i] = 0;
				var channelSelected = false;
				for (var j = 0; j < this.channelIndices.length; j++) {
					if (this.channelIndices[j] == i) {
						channelSelected = true;
					}
				}
				if (channelSelected) {
					interpolatedCoord[i] = InterpolateWithParameterizedt(coords4, time, t, i) 
				}
			}
			return interpolatedCoord;
		},
		
        InterpolateSplineUniform: function (pointsPerSegment, curveType) 
        {
            var logThisFunction = false;
            this.interpolatedPoints = new Array();
            var numInterpolatedPoints = 0;

            if (this.numSegments == 0) {
                this.interpolatedPoints[0] = this.controlPoints[1];
                this.numPointsThisSegment[0] = 1;
                if (logThisFunction) console.log("numSegments == 0 " + this.interpolatedPoints);
                return;
            }
            else if (this.numSegments == 1) {
                this.interpolatedPoints[0] = this.controlPoints[1];
                this.interpolatedPoints[1] = this.controlPoints[2];
                this.numPointsThisSegment[0] = 2;
                if (logThisFunction) console.log("numSegments == 1 " + this.interpolatedPoints);
                return;
            }
            /*
                now loop through each segment of the spline interpolating pointsPerSegment points
                on each iteration. Catmull Rom interpolates from the current point to the next point
                using the previous point and the point following the next point as control points
                since we added a control point at the beginning and end our first segment uses indices
                0, 1, 2, 3 
            */
            for (var i = 0; i < this.numSegments; i++) {
                /*
                    interpolate pointsPerSegment points for this segment
                */
                var segmentPoints = this.InterpolateSegmentUniform(i, curveType, pointsPerSegment);

                /*
                    copy the segmentPoints to interpolatedPoints which we will return
                    note for all but the last segment we ignore the last point because it will  
                    repeat repeat in the first point in the next segment
                */
                var pointsThisSegment = segmentPoints.length;
                for (var j = 0; j < pointsPerSegment - 1; j++) {
                    this.interpolatedPoints[numInterpolatedPoints++] = segmentPoints[j];
                }
                this.numPointsThisSegment[i] = pointsPerSegment - 1;
                if (i == this.numSegments - 1) {
					this.interpolatedPoints[numInterpolatedPoints++] = segmentPoints[pointsPerSegment - 1];
				}
            }
        },
        InterpolateSplineToTolerance: function (tolerance, curveType) 
        {
            var logThisFunction = false;
            this.interpolatedPoints = new Array();
            var numInterpolatedPoints = 0;

            if (this.numSegments == 0) {
                this.interpolatedPoints[0] = this.controlPoints[1];
                this.numPointsThisSegment[0] = 1;
                if (logThisFunction) console.log("numSegments == 0 " + this.interpolatedPoints);
                return;
            }
            else if (this.numSegments == 1) {
                this.interpolatedPoints[0] = this.controlPoints[1];
                this.interpolatedPoints[1] = this.controlPoints[2];
                this.numPointsThisSegment[0] = 2;
                if (logThisFunction) console.log("numSegments == 1 " + this.interpolatedPoints);
                return;
            }
            /*
                now loop through each segment of the spline interpolating pointsPerSegment points
                on each iteration. Catmull Rom interpolates from the current point to the next point
                using the previous point and the point following the next point as control points
                since we added a control point at the beginning and end our first segment uses indices
                0, 1, 2, 3 
            */
            for (var i = 0; i < this.numSegments; i++) {
                /*
                    interpolate points for this segment according to the tolerance
                */
                var segmentPoints = this.InterpolateSegmentToTolerance(i, curveType, tolerance);

                /*
                    copy the segmentPoints to interpolatedPoints which we will return
                    note for all but the last segment we ignore the last point because it will  
                    repeat repeat in the first point in the next segment
                */
                var pointsThisSegment = segmentPoints.length;
                for (var j = 0; j < pointsThisSegment - 1; j++) {
                    this.interpolatedPoints[numInterpolatedPoints++] = segmentPoints[j];
                }
                this.numPointsThisSegment[i] = pointsThisSegment - 1;
                if (i == this.numSegments - 1) {
					this.interpolatedPoints[numInterpolatedPoints++] = segmentPoints[pointsThisSegment - 1];
				}
            }
            //console.log("TOTAL POINTS IN SPLINE = " + this.interpolatedPoints.length);
        },

        GetInterpolatedPoints: function () 
        {
            return this.interpolatedPoints;
        },

        /*
            Create a list of pointsPerSegment points spaced uniformly along the resulting 
            Catmull-Rom curve.
    
            index: the index of control point p0, where p0, p1, p2, and p3 are
            used in order to create a curve between p1 and p2.
            
            pointsPerSegment: The total number of uniformly spaced interpolated
            points to calculate for each segment. The larger this number, the
            smoother the resulting curve.
            
            curveType: Clarifies whether the curve should use uniform, chordal
            or centripetal curve types. Uniform can produce loops, chordal can
            produce large distortions from the original lines, and centripetal is an
            optimal balance without spaces.
            
            returns the list of interpolated points that define the CatmullRom curve
            between the points defined by index+1 and index+2.
        */
        InterpolateSegmentUniform: function (index, curveType, pointsPerSegment) 
        {
            resultPoints = new Array();
            var coords4 = new Array();
            var time = new Array();
            for (var i = 0; i < 4; i++) {
                coords4[i] = this.controlPoints[index + i];
                time[i] = i;
            }

            var tstart = 1;
            var tend = 2;
            if (curveType != "CatmullRomTypeUniform") {
                var total = 0;
                for (var i = 1; i < 4; i++) {
                    var t = this.CalcTime(coords4[i], coords4[i - 1]);
                    if (curveType == "CatmullRomTypeCentripetal") {
                        t = sqrt(t);
                    }
                    total += t;
                    time[i] = total;
                }
                tstart = time[1];
                tend = time[2];
            }

            var numLineSegments = pointsPerSegment - 1;
            resultPoints[0] = this.controlPoints[index + 1];
            for (var i = 1; i < numLineSegments; i++) {
                var t = tstart + (i * (tend - tstart)) / numLineSegments;
                resultPoints[i] = this.InterpolateWithParameterizedt(coords4, time, t);
            }
            resultPoints[i] = this.controlPoints[index + 2];

            return resultPoints;
        },
        
        /*
            Create a list of pointsPerSegment points spaced uniformly along the resulting 
            Catmull-Rom curve.
    
            index: the index of control point p0, where p0, p1, p2, and p3 are
            used in order to create a curve between p1 and p2.
            
            pointsPerSegment: The total number of uniformly spaced interpolated
            points to calculate for each segment. The larger this number, the
            smoother the resulting curve.
            
            curveType: Clarifies whether the curve should use uniform, chordal
            or centripetal curve types. Uniform can produce loops, chordal can
            produce large distortions from the original lines, and centripetal is an
            optimal balance without spaces.
            
            returns the list of interpolated points that define the CatmullRom curve
            between the points defined by index+1 and index+2.
        */
        InterpolateSegmentToTolerance: function (index, curveType, tolerance) 
        {
            resultPoints = new Array();
            var coords4 = new Array();
            var time = new Array();
            for (var i = 0; i < 4; i++) {
                coords4[i] = this.controlPoints[index + i];
                time[i] = i;
            }

            var tstart = 1;
            var tend = 2;
            if (curveType != "CatmullRomTypeUniform") {
                var total = 0;
                for (var i = 1; i < 4; i++) {
                    var t = this.CalcTime(coords4[i], coords4[i - 1]);
                    if (curveType == "CatmullRomTypeCentripetal") {
                        t = sqrt(t);
                    }
                    total += t;
                    time[i] = total;
                }
                tstart = time[1];
                tend = time[2];
            }
            
            //console.log("InterpolateSegment tolerance = " + tolerance);

            var toleranceSquared = tolerance * tolerance;

            /*
               add the control point at the start of this segment
            */
            resultPoints.push(this.controlPoints[index + 1]);

            /*
                recursively interpolate the points
            */
            recur(this, tstart, tend, this.controlPoints[index + 1], this.controlPoints[index + 2]);

            function recur(cr, tstart, tend, startPoint, endPoint) {
                /*
                    now we find the mid value of t and interpolate x and y at that value of t
                */
                //console.log("enter recur tstart = " + tstart + "tend = " + tend);
                var tmid = (tstart + tend) / 2;
     
                var midPoint = cr.InterpolateWithParameterizedt(coords4, time, tmid);
                
                /*
                    drop the midPoint onto the line segment from startPoint to EndPoint
                    and compare the distance with the tolerance
                */
                var droppedPoint = dropPointToLineSegment(midPoint, startPoint, endPoint)            
                var distSquared = distanceSquaredBetweenPoints(droppedPoint, midPoint);    
                //console.log("distSquared = " + distSquared);
                if (distSquared < toleranceSquared) {
                    /*
                        we think we're done but check for s curve
                    */
                    var tmid2 = (tstart + tmid) / 2;
     
                    var midPoint2 = cr.InterpolateWithParameterizedt(coords4, time, tmid2);

                    if (distSquaredToLineSegment(midPoint2, startPoint, midPoint) <= distSquared) {
                        /*
                            ok, not an s curve, we are done
                        */
                        //console.log("we're done");
                        return;
                    }
                }
                /*
                    recur into the first half of this segment
                */
                recur(cr, tstart, tmid, startPoint, midPoint);
                
                /*
                    add this point since we need it
                */
                //console.log("add midPoint [" + midPoint[0] + ", " + midPoint[1] + "]");
                resultPoints.push(midPoint);
                
                /*
                    recur into the second half of this segment
                */
                recur(cr, tmid, tend, midPoint, endPoint);
            };
            
            
            /*
                and control point at the end of this segment
            */
            resultPoints.push(this.controlPoints[index + 2]);

            return resultPoints;
        },

        DropPointOnSpline: function (point) 
        {
            var minDistSquared = Number.MAX_VALUE;
            var closestPoint = [0, 0];
            var closestPointIndex = 0;

            /*
                find which of the interpolated line segments is closest to the point
            */
            var closestPoint = this.interpolatedPoints[0];
            for (var i = 0; i < this.interpolatedPoints.length - 1; i++) {
                var pt = dropPointToLineSegment(point, this.interpolatedPoints[i], this.interpolatedPoints[i+1]);
                var dx = point[0] - pt[0];
                var dy = point[1] - pt[1];
                var distSquared = dx * dx + dy * dy;

                if (distSquared < minDistSquared) {
                    minDistSquared = distSquared;
                    closestPointIndex = i;
                    closestPoint = pt;
                }
            }

            /*
                now find which segment the closest point is on
            */
            var closestSegment = 0;
            var firstPointIndexOfNextSegment = this.numPointsThisSegment[closestSegment];

            while (closestPointIndex >= firstPointIndexOfNextSegment) {
                closestSegment++;
                firstPointIndexOfNextSegment += this.numPointsThisSegment[closestSegment];
            }

            return {
                minDistSquared: minDistSquared,
                point: closestPoint,
                segment: closestSegment
            };
        },
        
        ProjectPointOnSpline: function (point) 
        {
            for (var i = 0; i < this.interpolatedPoints.length - 1; i++) {
                var val = dropXToLineSegment(point, this.interpolatedPoints[i], this.interpolatedPoints[i+1]);
                if (val != "undefined") return val;
            }
			return "undefined";
        },
        
        DropPointOnSplineSegment: function (point, segmentIndex) 
        {
            var logThisFunction = false;
            var minDistSquared = Number.MAX_VALUE;
            var closestPoint = [0, 0];
            var closestPointIndex = 0;

            /*
                find which of interpolatedPoints is closest to the point
            */
            var i = 0;
            var firstPointIndexOfSegment = 0;
            while (i < segmentIndex) {
                firstPointIndexOfSegment += this.numPointsThisSegment[i];
                i++;
            }

            var closestPoint = this.interpolatedPoints[0];
            for (i = 0; i < this.numPointsThisSegment[segmentIndex] - 1; i++) {
                var i1 = firstPointIndexOfSegment + i;
                var i2 = firstPointIndexOfSegment + i + 1;
                if (logThisFunction) console.log(i1 + " this.interpolatedPoints[" + i1 + "] = " + this.interpolatedPoints[i1]);
                if (logThisFunction) console.log(i2 + " this.interpolatedPoints[" + i2 + "] = " + this.interpolatedPoints[i2]);

                var pt = dropPointToLineSegment(point, this.interpolatedPoints[firstPointIndexOfSegment + i], this.interpolatedPoints[firstPointIndexOfSegment + i + 1]);
                var dx = point[0] - pt[0];
                var dy = point[1] - pt[1];
                var distSquared = dx * dx + dy * dy;

                if (distSquared < minDistSquared) {
                    minDistSquared = distSquared;
                    closestPoint = pt;
                }
            }

            return {
                minDistSquared: minDistSquared,
                point: closestPoint
            };
        },
        
        GetMinMax: function ()
        {
            var minx = this.interpolatedPoints[0][0];
            var miny = this.interpolatedPoints[0][1];
            var maxx = this.interpolatedPoints[0][0];
            var maxy = this.interpolatedPoints[0][1];
            
            for (var j = 0; j < this.interpolatedPoints.length; j++) {
                if (this.interpolatedPoints[j][0] < minx) minx = this.interpolatedPoints[j][0];
                if (this.interpolatedPoints[j][1] < miny) miny = this.interpolatedPoints[j][1];
                if (this.interpolatedPoints[j][0] > maxx) maxx = this.interpolatedPoints[j][0];
                if (this.interpolatedPoints[j][1] > maxy) maxy = this.interpolatedPoints[j][1];
            }
            return {
                minx: minx,
                miny: miny,
                maxx: maxx,
                maxy: maxy
            };
        }
    };
    module.CatmullRom = CatmullRom;
})(this);     //module to export to

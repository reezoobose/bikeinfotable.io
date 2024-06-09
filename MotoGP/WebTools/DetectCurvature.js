function Calculate2DCurvature(
	p1,
	p2,
	p3
)
{
	var v1 = [p2[0] - p1[0], p2[1] - p1[1]];
	var v2 = [p3[0] - p2[0], p3[1] - p2[1]];
	var v3 = [p3[0] - p1[0], p3[1] - p1[1]];


	var areaOfTriangleTimes4 = 2 * Math.abs(v1[0]*v3[1] - v3[0]*v1[1]);
	var dot1 = v1[0]*v1[0] + v1[1]*v1[1];
	var dot2 = v2[0]*v2[0] + v2[1]*v2[1];
	var dot3 = v3[0]*v3[0] + v3[1]*v3[1];
	var productOfSides = Math.sqrt(dot1 * dot2 * dot3);
	var curvature = areaOfTriangleTimes4 / productOfSides;

	return curvature;
}

function CalculateCurvatureValues(pointList)
{
	var numPoints = pointList.length;
	var curvatureValues = [];
	var changeIndices = [];

	var testDist = curvatureCompareDist;
	for (var j = 0; j < numPoints; j++) {
		var prevIndex = j - testDist;
		var nextIndex = j + testDist;
		if (prevIndex < 0) prevIndex += numPoints;
		if (nextIndex > numPoints - 1) nextIndex -= numPoints;

		curvatureValues[j] = Calculate2DCurvature(pointList[prevIndex][1], pointList[j][1], pointList[nextIndex][1]);
	}

	var prevCurvature = curvatureValues[numPoints - 1];
	var isIncreasing = false;
	var isDecreasing = false;
	var numChangesFound = 0;

	for (var j = 0; j < numPoints; j++) {
		var delta = curvatureValues[j] - prevCurvature;
		if (delta == 0) {
			/*
				we are at a maxima or minima of curvature, find the center of the change
				note this is a rare case where subsequent curvatures have the same value
			*/
			var k = j + 1;
			while (k < numPoints && curvatureValues[k] == curvatureValues[k - 1]) {
				k++;
			}

			var changeIndex = (j + k - 1) / 2;

			isIncreasing = false;
			isDecreasing = false;
			changeIndices[numChangesFound++] = changeIndex;
			j = k;
		}
		else if (delta > 0.0) {
			if (isDecreasing) {
				/*
					was decreasing, now increasing
				*/
				changeIndices[numChangesFound++] = j - 1;
				isDecreasing = false;
			}
			isIncreasing = true;
		}
		else {
			if (isIncreasing) {
				/*
					was increasing, now decreasing
				*/
				changeIndices[numChangesFound++] = j - 1;
				isIncreasing = false;
			}
			isDecreasing = true;
		}
		prevCurvature = curvatureValues[j];
	}

	for (var j = 1; j < numChangesFound - 1; j++) {
		var changeToPrev = curvatureValues[changeIndices[j - 1]] - curvatureValues[changeIndices[j]];
		var changeToNext = curvatureValues[changeIndices[j + 1]] - curvatureValues[changeIndices[j]];

		if (changeToPrev > 0.0 && changeToNext > 0.0) {
			/*
				a local minima
			*/
			if (changeToPrev > changeToNext) {
				if (changeToNext < changeThreshold) {
					if (j == numChangesFound - 2) {
						/*
							remove the final minima and maxima
						*/
						numChangesFound -= 2;
						j = 0;
						continue;
					}
					else if (curvatureValues[changeIndices[j]] > curvatureValues[changeIndices[j + 2]]) {
						/*
							remove this minima and the next maxima
						*/
						for (var k = j; k < numChangesFound - 2; k++) {
							changeIndices[k] = changeIndices[k + 2];
						}
						numChangesFound -= 2;
						j = 0;
						continue;
					}
				}
			}
			else {
				if (changeToPrev < changeThreshold) {
					if (curvatureValues[changeIndices[j]] > curvatureValues[changeIndices[j - 2]]) {
						/*
							remove this minima and the prev maxima
						*/
						for (var k = j - 1; k < numChangesFound - 2; k++) {
							changeIndices[k] = changeIndices[k + 2];
						}
						numChangesFound -= 2;
						j = 0;
						continue;
					}
				}
			}
		}
	}

	var numSignificantPoints = 0;
	var k = 0;
	var skipCount = maxSkipCount; // don't skip the first point
	for (var j = 0; j < numPoints; j++) {
		if (j == changeIndices[k]) {
			if (curvatureValues[j] > transitionThreshold) {
				var radius = curvatureValues[j] * 1000;
				var point = pointList[j][1];
				AddDebugCircle(point[0], point[1], radius, "orange", "transparent");
				numSignificantPoints++;
				skipCount = 0;
			}
			else if (skipCount == maxSkipCount) {
				numSignificantPoints++;
				skipCount = 0;
			}
			else {
				skipCount++;
			}
			k++;
		}
		else if (skipCount == maxSkipCount) {
			numSignificantPoints++;
			skipCount = 0;
		}
		else {
			skipCount++;
		}
	}
	return {
		curvatureValues: curvatureValues,
		changeIndices: changeIndices,
		numChangesFound: numChangesFound,
		numSignificantPoints: numSignificantPoints
	};
}
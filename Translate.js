/*
"// API callback
translateText({
 "data": {
  "translations": [
   {
    "translatedText": "was zum Teufel?"
   },
   {
    "translatedText": "Hallo Welt"
   }
  ]
 }
}
);"
*/

function parseSingleSplineFile(ct, filename, index)
{
	var lines = ct.split('\r\n'); 
	var splineFileIndex = index;
	
	for (var i = 0; i < lines.length; i++) {
		var pos;
		var values;
		if (lines[i].search("\\[Track\\]") == 0) {
			splineData = new SplineIniFile(filename);
			SplineIniFiles[splineFileIndex] = splineData;
		}
		if (lines[i].search("NumberOfSegments") == 0) {
			values = lines[i].getNums();
			if (values.length != 1) alert("error in NumberOfSegments " + lines[i]);
			splineData.NumberOfSegments = values[0];
		}
		if (lines[i].search("StartSegment") == 0) {
			values = lines[i].getNums();
			if (values.length != 1) alert("error in StartSegment " + lines[i]);
			splineData.StartSegment = values[0];
		}
		if (lines[i].search("EndSegment") == 0) {
			values = lines[i].getNums();
			if (values.length != 1) alert("error in EndSegment " + lines[i]);
			splineData.EndSegment = values[0];
		}
		if (lines[i].search("GateShape") == 0) {
			if (lines[i].search("Radius") == 0) alert("error in GateShape " + lines[i]);
			splineData.GateShape = "Radius";
		}
		if (lines[i].search("GateWidth") == 0) {
			values = lines[i].getNums();
			if (values.length != 1) alert("error in GateWidth " + lines[i]);
			splineData.GateWidth = values[0];
		}
		if (lines[i].search("GateHeight") == 0) {
			values = lines[i].getNums();
			if (values.length != 1) alert("error in GateHeight " + lines[i]);
			splineData.GateHeight = values[0];
		}
		if (lines[i].search("InitialCheckpointTime") == 0) {
			values = lines[i].getNums();
			if (values.length != 1) alert("error in InitialCheckpointTime " + lines[i]);
			splineData.InitialCheckpointTime = values[0];
		}
		if (lines[i].search("LeftoverTimeMultiplier") == 0) {
			values = lines[i].getNums();
			if (values.length != 1) alert("error in LeftoverTimeMultiplier " + lines[i]);
			splineData.LeftoverTimeMultiplier = values[0];
		}
		if (lines[i].search("TimeDecayRatePerLap") == 0) {
			values = lines[i].getNums();
			if (values.length != 1) alert("error in TimeDecayRatePerLap " + lines[i]);
			splineData.TimeDecayRatePerLap = values[0];
		}
	
		if (lines[i].search("\\[TrackSegment") == 0) {
			values = lines[i].getNums();
			if (values.length != 1) alert("error in TrackSegment " + lines[i]);
			trackSegment = values[0] - 1; // TrackSegments are 1 based, array is 0 based
			splineData.initialize(trackSegment);
		}
		if (lines[i].search("Position = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 3) alert("TrackSegment" + trackSegment + " error in Position " + lines[i]);
			splineData.Position[trackSegment] = values.slice(0);
		}
		if (lines[i].search("LeftEdgePosition = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 3) alert("TrackSegment" + trackSegment + " error in LeftEdgePosition " + lines[i]);
			splineData.LeftEdgePosition[trackSegment] = values.slice(0);
		}
		if (lines[i].search("RightEdgePosition = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 3) alert("TrackSegment" + trackSegment + " error in RightEdgePosition " + lines[i]);
			splineData.RightEdgePosition[trackSegment] = values.slice(0);
		}
		if (lines[i].search("Tangent = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 3) alert("TrackSegment" + trackSegment + " error in Tangent " + lines[i]);
			splineData.Tangent[trackSegment] = values.slice(0);
		}
		if (lines[i].search("Waypoint = ") == 0) {
			if(lines[i].search(/true/i) != -1) {
				splineData.Waypoint[trackSegment] = 1;
			}
			else if(lines[i].search(/false/i) != -1) {
				splineData.Waypoint[trackSegment] = 0;
			}
			else {
				alert("TrackSegment" + trackSegment + " error in Waypoint " + lines[i]);
				splineData.Waypoint[trackSegment] = 0;
			}
		}
		if (lines[i].search("SequenceNumber = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in SequenceNumber " + lines[i]);
			splineData.SequenceNumber[trackSegment] = values[0];
		}
		if (lines[i].search("NextGateSequenceNumber = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in NextGateSequenceNumber " + lines[i]);
			splineData.NextGateSequenceNumber[trackSegment] = values[0];
		}
		if (lines[i].search("GateRadius = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in GateRadius " + lines[i]);
			splineData.GateRadius[trackSegment] = values[0];
		}
		if (lines[i].search("OuterGateRadius = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in OuterGateRadius " + lines[i]);
			splineData.OuterGateRadius[trackSegment] = values[0];
		}
		if (lines[i].search("GatePosition = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 3) alert("TrackSegment" + trackSegment + " error in GatePosition " + lines[i]);
			splineData.GatePosition[trackSegment] = values.slice(0);
		}
		if (lines[i].search("GateLook = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 3) alert("TrackSegment" + trackSegment + " error in GateLook " + lines[i]);
			splineData.GateLook[trackSegment] = values.slice(0);
		}
		if (lines[i].search("TargetSpeed = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in TargetSpeed " + lines[i]);
			splineData.TargetSpeed[trackSegment] = values[0];
		}
		if (lines[i].search("TransitionSpeed = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in TransitionSpeed " + lines[i]);
			splineData.TransitionSpeed[trackSegment] = values[0];
		}
		if (lines[i].search("TargetGear = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in TargetGear " + lines[i]);
			splineData.TargetGear[trackSegment] = values[0];
		}
		if (lines[i].search("MaxGear = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in MaxGear " + lines[i]);
			splineData.MaxGear[trackSegment] = values[0];
		}
		if (lines[i].search("Flags = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in Flags " + lines[i]);
			splineData.Flags[trackSegment] = values[0];
		}
		if (lines[i].search("AchievableDeceleration = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in AchievableDeceleration " + lines[i]);
			splineData.AchievableDeceleration0[trackSegment] = values[0];
			splineData.AchievableDeceleration1[trackSegment] = values[0];
			splineData.AchievableDeceleration2[trackSegment] = values[0];
			splineData.AchievableDeceleration3[trackSegment] = values[0];
		}
		if (lines[i].search("AchievableDeceleration0 = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 2) alert("TrackSegment" + trackSegment + " error in AchievableDeceleration0 " + lines[i]);
			splineData.AchievableDeceleration0[trackSegment] = values[1];
		}
		if (lines[i].search("AchievableDeceleration1 = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 2) alert("TrackSegment" + trackSegment + " error in AchievableDeceleration1 " + lines[i]);
			splineData.AchievableDeceleration1[trackSegment] = values[1];
		}
		if (lines[i].search("AchievableDeceleration2 = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 2) alert("TrackSegment" + trackSegment + " error in AchievableDeceleration2 " + lines[i]);
			splineData.AchievableDeceleration2[trackSegment] = values[1];
		}
		if (lines[i].search("AchievableDeceleration3 = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 2) alert("TrackSegment" + trackSegment + " error in AchievableDeceleration3 " + lines[i]);
			splineData.AchievableDeceleration3[trackSegment] = values[1];
		}
		if (lines[i].search("MaxSpeed = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in MaxSpeed " + lines[i]);
			splineData.MaxSpeed[trackSegment] = values[0];
		}
		if (lines[i].search("LeftTrackWidth = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in LeftTrackWidth " + lines[i]);
			splineData.LeftTrackWidth[trackSegment] = values[0];
		}
		if (lines[i].search("RightTrackWidth = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in RightTrackWidth " + lines[i]);
			splineData.RightTrackWidth[trackSegment] = values[0];
		}
		if (lines[i].search("OuterFriction = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in OuterFriction " + lines[i]);
			splineData.OuterFriction[trackSegment] = values[0];
		}
		if (lines[i].search("InnerFriction = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in InnerFriction " + lines[i]);
			splineData.InnerFriction[trackSegment] = values[0];
		}
		if (lines[i].search("LastSegment = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in LastSegment " + lines[i]);
			splineData.LastSegment[trackSegment] = values[0];
		}
		if (lines[i].search("NextSegment = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in NextSegment " + lines[i]);
			splineData.NextSegment[trackSegment] = values[0];
		}
		if (lines[i].search("Branch = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in Branch " + lines[i]);
			splineData.Branch[trackSegment] = values[0];
		}
		if (lines[i].search("AIAssist = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in AIAssist " + lines[i]);
			splineData.AIAssist[trackSegment] = values[0];
		}
		if (lines[i].search("TurnDirection = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in TurnDirection " + lines[i]);
			// 1 = Left, 2 = Right, 3 = LeftBeforeRight, 4 = RightBeforeLeft
			splineData.TurnDirection[trackSegment] = values[0];
		}
		if (lines[i].search("Curvature = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in Curvature " + lines[i]);
			splineData.Curvature[trackSegment] = values[0];
		}
		if (lines[i].search("CheckpointTime = ") == 0.0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in CheckpointTime " + lines[i]);
			splineData.CheckpointTime[trackSegment] = values[0];
		}
		if (lines[i].search("BestCheckpointTime = ") == 0.0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in BestCheckpointTime " + lines[i]);
			splineData.BestCheckpointTime[trackSegment] = values[0];
		}
		if (lines[i].search("MaxExtraCheckpointTime = ") == 0.0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in MaxExtraCheckpointTime " + lines[i]);
			splineData.MaxExtraCheckpointTime[trackSegment] = values[0];
		}
	}
	var n = splineData.NumberOfSegments;
	for (var i = 0; i < n; i++) {
		if (splineData.TransitionSpeed[i]) {
			// one of our brake points, calculate the curvature
			var i1 = (i == 0) ? n - 1 : i - 1;
			var i3 = (i == n - 1) ? 0 : i + 1;
			var p1 = [splineData.Position[i1][0], splineData.Position[i1][2]];
			var p2 = [splineData.Position[i][0], splineData.Position[i][2]];
			var p3 = [splineData.Position[i3][0], splineData.Position[i3][2]];
			splineData.Curvature[i] = Calculate2DCurvature(p1, p2, p3) * 100;
		}
	}
}

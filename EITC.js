//Global variables to keep track of application state
var g_chart_loaded = false; //Is google chart library loaded?

google.load("visualization", "1", {packages:["corechart"]});
google.setOnLoadCallback(chartLoaded);

//Runs onces the Google Chart library is loaded from Google's servers
function chartLoaded() {
	
	g_chart_loaded = true;
	
	//Assign the mainCalculate routine to run whenever an input is altered	
	$("#mainContent input, #mainContent select").change(function() {
		mainCalculate();
	});
	
	//Configure the slider (uses jQuery UI)
	$("#head_slider").slider({	
		min:0,
		max:g_chart_max, 
		value:0,
		slide:function() {
			//Runs when the slider is moved
			try {
				//Get value of slider
				val = $('#head_slider').slider("option", "value");
				
				//Set wage income input to value of slider
				$("#head_wage_income").val(val);
				
				//Run the calculation
				mainCalculate(true);
			} catch (ex) {
				console.log(val);
			}
		}
	});
	
	//Run the calculation once initially once the chart library is loaded.
	mainCalculate();
}

//This will store the result of the calculation in a globally accessible variable, for the chart drawer to use.
var g_data_array = [];
                            
function mainCalculate(triggered_by_slider) {
    try {
		
		//Get scenario ID if it exists (implemented only in Ryan/Obama version of graphic)
		var scenarioID = $("#scenario_selector").val();
		if (scenarioID) var eitc_parameters = g_eitc_parameters[scenarioID];
		else var eitc_parameters = g_eitc_parameters;
		
		//Get wage income from input box.
        var wages = $("#head_wage_income").val();
		
		//Filter out non-numeric characters except for decimal points
        wages = wages.replace(/[^\d.-]/g,'');
		
		//Round to nearest dollar
        wages = Math.round(wages*1);
		
		//It's still possible to get a nonsensical value (for example, if the user enters two decimal points)
		//If so, set to zero
        if (isNaN(wages)) wages = 0;
		
		//Set input box to display the cleaned up value
        $("#head_wage_income").val(wages);
		
		//Get filing status.
        var filing_status = $("#filingStatus_select").val()*1;
		
		//Set slider to value of wage income box (unless the calculation was triggered by the slider,
		//do nothing to avoid a recursive calculation loop)
        if (triggered_by_slider != true) {
            if ($("#head_wage_income").val() <= g_chart_max) $("#head_slider").slider('value',$("#head_wage_income").val());
        }
  
  		//Get number of children
		var num_children = $('#children_selector').val();
		
		//This will also store some derived quantities.
		var base_amounts = Array();
		base_amounts[0] = 0;
		
		//Basically, this will store the result of figuring out "which of the three line segments do we use?"
		var use_bracket = 0;
		
		//Loop through the array of trapezoid lines...
		for (var bracket = 1; bracket < eitc_parameters[filing_status][num_children].length; bracket++) {
			
			//Calculate the initial EITC amount at the start of the line.
			base_amounts[bracket] = Math.round(base_amounts[bracket - 1] + 
										 eitc_parameters[filing_status][num_children][bracket]["floor"] * 
										 eitc_parameters[filing_status][num_children][bracket - 1]["rate"]);
			
			//If wages exceed the beginning of the line segment, use it. Since we're looping from left to right,
			//we'll end up using the correct one this way.
			if (wages > eitc_parameters[filing_status][num_children][bracket]["floor"]) {
				use_bracket = bracket;	
			}
		}
		
		//Calculate the final point at the end of the phase-out
		bracket = eitc_parameters[filing_status][num_children].length-1;
		var phase_out_end = Math.round(	eitc_parameters[filing_status][num_children][bracket]["floor"] - 
											base_amounts[bracket]/eitc_parameters[filing_status][num_children][bracket]["rate"]);
																
		//Mimic the IRS's EITC table. Round to lower 50, add 25, and calculate based on that number
		//(i.e. 79->75, 149->125, 6001->6025)
		var wages_rounded = Math.floor(wages/50)*50 + 25;
		
		//Do the actual calculation next.
		var eitc_amount = Math.round(Math.max(0, Math.min(wages_rounded, eitc_parameters[filing_status][num_children][1]["floor"]) * eitc_parameters[filing_status][num_children][0]["rate"] + Math.max(0,wages_rounded-eitc_parameters[filing_status][num_children][2]["floor"]) * eitc_parameters[filing_status][num_children][2]["rate"]));
		
		if (wages == 0) eitc_amount = 0;
	
		//Write the result in the orange box.
		$("#eitc_result_span").text(eitc_amount);
		
		//Draw the chart using the Google visualization library.
		if (g_chart_loaded == true) {
			drawChart(filing_status,num_children,base_amounts,phase_out_end, wages, eitc_amount, scenarioID);
        }
       
    } catch (ex) {
        console.log(ex);	
    }
}

function drawChart(filing_status,num_children,base_amounts, phase_out_end, wages, eitc_amount, scenarioID) {
	
	if (scenarioID) var eitc_parameters = g_eitc_parameters[scenarioID];
	else var eitc_parameters = g_eitc_parameters;

	//Will store the points that define the chart, as follows:
	//[x (wages), y (eitc amount), HTML of tooltip popup]
    var data_array = [];
    
    //Find first three points of trapezoid
    for (var counter = 0; counter < eitc_parameters[filing_status][num_children].length; counter++) {
        data_array[counter] = [
			eitc_parameters[filing_status][num_children][counter]["floor"],  
			base_amounts[counter],
			"<span style=\"font-size:15px\"><strong>Wages&#58; &#36;</strong>" + 
				eitc_parameters[filing_status][num_children][counter]["floor"] + 
				"<br /><strong>EITC&#58; &#36;</strong>" +  base_amounts[counter] + "</span>"
		];
    }
	
    //Final points on trapezoid end point and - user's wages. Need an actual point here, even though it doesn't affect the shape at all,
	//so that it's selectable and there's an orange dot in the right place.
    data_array.push(
	[	phase_out_end, 
		0, 
		"<span style=\"font-size:15px\"><strong>Wages&#58; &#36;</strong>" + phase_out_end + "<br /><strong>EITC&#58; &#36;0</strong></span>"
	],
	[	wages,
		eitc_amount,
		"<span style=\"font-size:15px\"><strong>Wages&#58; &#36;</strong>" + wages + "<br /><strong>EITC&#58; &#36;</strong>" +  eitc_amount + "</span>"
	]);
   
    //Sort in order so user entry goes in between two points if necessary
    data_array.sort(function(arr1, arr2) {return arr1[0] - arr2[0];});
	
	//Store data in global variable. Not entirely sure why I thought this was necessary but maybe I had a good reason for it.
	g_data_array = data_array;
    
	//This will store the same data, but in the format that Google wants, built using the methods Google requires.
	var data = new google.visualization.DataTable();
	
	//Define the data structure.
	data.addColumn('number','Wages');
    data.addColumn('number','EITC');
    data.addColumn({type: 'string', role: 'tooltip', 'p': {'html': true}});
	
	//Add the data to the Google data object.
    data.addRows(data_array);
    
	//Define some options for the chart.
    var options_obj = {
        chartArea:{left:"0%",top:"3%",width:"100%",height:"97%"},
        tooltip: {isHtml: true},
		colors:["#e1911e"],
        hAxis: {	viewWindow:{min:0,max:g_chart_max},
					textStyle: {fontName:"'Droid Sans',Arial, Helvetica, sans-serif",fontSize:14},
					baselineColor:"#FFFFFF",
					gridlines: {color:"#FFF"},
					titleTextStyle:{fontName:"'Droid Sans',Arial, Helvetica, sans-serif",fontSize:14}
				},
        vAxis: {	viewWindow: {min:0,max:g_chart_y_max},
					gridlines: {color:"#ddd"},
					textStyle: {fontName:"'Droid Sans',Arial, Helvetica, sans-serif",fontSize:14},
					titleTextStyle:{fontName:"'Droid Sans',Arial, Helvetica, sans-serif",fontSize:14}
				},
        titleTextStyle:{fontName:"'Droid Sans',Arial, Helvetica, sans-serif",fontSize:16},
        legend: {position: 'none'}
    };

	//Create the chart object using the options defined above.
    var chart = new google.visualization.ChartWrapper({	
		chartType: 'LineChart',
		dataTable: data,
		options:options_obj,
		containerId: 'chart_area'
	});
				
	//Listen for when the user clicks on a point.															
	google.visualization.events.addListener(chart,'select',function() {
		try {
			//Get the selected point
			var selected_object = chart.getChart().getSelection();
			
			//Extract the wage amount from it. Aha. So this is what that global object was for.
			var wageLevel = g_data_array[selected_object[0]["row"]][0];
			
			//Set the slider/input to that amount.
			$("#head_slider").slider({value:wageLevel});
			$("#head_wage_income").val(wageLevel);
			
			mainCalculate();
			
		} catch (ex) {
			console.log(ex);	
		}
	});
	
	//Actually draw the damn thing on the screen
    chart.draw();

	//Set the calculated point to be the actively selected one in the chart.
    var use_counter = 0;
    for (var counter = 0;counter<data_array.length;counter++) {
        if (data_array[counter][0] == wages) {
            use_counter = counter;	
        }
    }
    
   	chart.getChart().setSelection([{row:use_counter}]);
}

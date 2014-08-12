//Global variables to keep track of application state
var g_chart_loaded = false; //Is google chart library loaded?
var g_button_pressed = false;	//
var g_chart_max = 52000;
var g_tries = 0;

//Runs onces the Google Chart library is loaded from Google's servers
function chartLoaded() {
	
	g_chart_loaded = true;
	
	//Assign the mainCalculate routine to run whenever an input is altered	
	$("#mainContent input, #mainContent select").change(function() {mainCalculate();});
	
	
	g_button_pressed = true; 
	$("#head_slider").slider({	min:0,
			max:g_chart_max, 
			value:0,
			change:function() {
				try {
					val = $('#head_slider').slider("option", "value");
					$("#head_wage_income").val(val);
					mainCalculate(true);
				} catch (ex) {
					LogWrite(val);
				}
			}
		});
	mainCalculate();
}
google.load("visualization", "1", {packages:["corechart"]});
google.setOnLoadCallback(chartLoaded);

//eitc_parameters[filing_status][number_of_children] = [{"floor":val,"rate":val},{},{}...]

var eitc_parameters = new Array();
eitc_parameters[1] = new Array();
eitc_parameters[1][0] = [{"floor":0,"rate":0.0765},{"floor":6370,"rate":0},{"floor":7970,"rate":-0.0765}];
eitc_parameters[1][1] = [{"floor":0,"rate":0.34},{"floor":9560,"rate":0},{"floor":17530,"rate":-0.1598}];
eitc_parameters[1][2] = [{"floor":0,"rate":0.4},{"floor":13430,"rate":0},{"floor":17530,"rate":-0.2106}];
eitc_parameters[1][3] = [{"floor":0,"rate":0.45},{"floor":13430,"rate":0},{"floor":17530,"rate":-0.2106}];

eitc_parameters[2] = new Array();
eitc_parameters[2][0] = [{"floor":0,"rate":0.0765},{"floor":6370,"rate":0},{"floor":13310,"rate":-0.0765}];
eitc_parameters[2][1] = [{"floor":0,"rate":0.34},{"floor":9560,"rate":0},{"floor":22870,"rate":-0.1598}];
eitc_parameters[2][2] = [{"floor":0,"rate":0.4},{"floor":13430,"rate":0},{"floor":22870,"rate":-0.2106}];
eitc_parameters[2][3] = [{"floor":0,"rate":0.45},{"floor":13430,"rate":0},{"floor":22870,"rate":-0.2106}];

function LogWrite(text) {
    $("#error_log").html($("#error_log").html() + "<pre>" + text + "</pre>");
}

var g_data_array = [];
                            
function mainCalculate(triggered_by_slider) {
    try {
		
        var wages = $("#head_wage_income").val();
        wages = wages.replace(/[^\d.-]/g,'');
        wages = Math.round(wages*1);
        if (isNaN(wages)) wages = 0;
        $("#head_wage_income").val(wages);
        var filing_status = $("#filingStatus_select").val()*1;
        if (triggered_by_slider != true) {
            if ($("#head_wage_income").val() <= g_chart_max) $("#head_slider").slider('value',$("#head_wage_income").val());
        }
        if (g_button_pressed == true) {
            wages = Math.round(wages);
            var num_children = $('#children_selector').val()
            var base_amounts = Array();
            base_amounts[0] = 0;
            var use_bracket = 0;
            for (var bracket = 1; bracket < eitc_parameters[filing_status][num_children].length; bracket++) {
                base_amounts[bracket] = Math.round(base_amounts[bracket - 1] + 
                                        eitc_parameters[filing_status][num_children][bracket]["floor"] * 
                                        eitc_parameters[filing_status][num_children][bracket - 1]["rate"]);
                if (wages > eitc_parameters[filing_status][num_children][bracket]["floor"]) {
                    use_bracket = bracket;	
                }
            }
            bracket = eitc_parameters[filing_status][num_children].length-1;
            phase_out_end = Math.round(eitc_parameters[filing_status][num_children][bracket]["floor"] - 
                                        base_amounts[bracket]/eitc_parameters[filing_status][num_children][bracket]["rate"]);
			//Check if wage amount exactly equals a change point - rounding is different
			
			wages_rounded = Math.floor(wages/50)*50 + 25;
			if (eitc_parameters[filing_status][num_children][use_bracket+1]) {
				if (wages - eitc_parameters[filing_status][num_children][use_bracket+1]["floor"] == 0) {
					wages_rounded = wages;
					eitc_amount = base_amounts[use_bracket+1];
				} else {
					eitc_amount = Math.max(0,Math.round(base_amounts[use_bracket] + (wages_rounded - eitc_parameters[filing_status][num_children][use_bracket]["floor"]) * eitc_parameters[filing_status][num_children][use_bracket]["rate"]));
				}
			} else {
           		eitc_amount = Math.max(0,Math.round(base_amounts[use_bracket] + (wages_rounded - eitc_parameters[filing_status][num_children][use_bracket]["floor"]) * eitc_parameters[filing_status][num_children][use_bracket]["rate"]));
			}
			if (wages == 0) eitc_amount = 0;
        
            $("#eitc_result_span").text(eitc_amount);
            $("#result_text").slideDown();
            if (g_chart_loaded == true) {
                drawChart(filing_status,num_children,base_amounts,phase_out_end, wages, eitc_amount);
            }
        }
    } catch (ex) {
        LogWrite(ex);	
    }
    
}



function drawChart(filing_status,num_children,base_amounts, phase_out_end, wages, eitc_amount) {

    data_array = [];
    
    //first three points of trapezoid
    for (var counter = 0; counter < eitc_parameters[filing_status][num_children].length; counter++) {
        data_array[counter] = [eitc_parameters[filing_status][num_children][counter]["floor"],  
                               base_amounts[counter],
                               "<strong>Wages&#58; &#36;</strong>" + eitc_parameters[filing_status][num_children][counter]["floor"] + "<br /><strong>EITC&#58; &#36;</strong>" +  base_amounts[counter]];
    }
	
    
    //final point on trapezoid, user wages
    data_array.push(
        [phase_out_end, 0, "<strong>Wages&#58; &#36;</strong>" + phase_out_end + "<br /><strong>EITC&#58; &#36;0</strong>"],
        [wages,
        eitc_amount,
        "<strong>Wages&#58; &#36;</strong>" + wages + "<br /><strong>EITC&#58; &#36;</strong>" +  eitc_amount]);
   
    //sort in order so user entry goes in between two points if necessary
    data_array.sort(function(arr1, arr2) {return arr1[0] - arr2[0];});
	
	g_data_array = data_array;
    
	
    var data = new google.visualization.DataTable();
	
    
	data.addColumn('number','Wages');
    data.addColumn('number','EITC');
    data.addColumn({type: 'string', role: 'tooltip', 'p': {'html': true}});
    data.addRows(data_array);
    
    var fs_dict = new Array();
    fs_dict[1] = "Single";
    fs_dict[2] = "Married";
    var title_string = 'EITC Chart: ' + num_children + " Children, " + fs_dict[filing_status];
    if (num_children == 1) {title_string = "EITC Chart: 1 Child, " + fs_dict[filing_status]};
    if (num_children == 0) {title_string = "EITC Chart: No Children, " + fs_dict[filing_status]};
    
    var options_obj = {
        chartArea:{left:"0%",top:"3%",width:"100%",height:"97%"},
        tooltip: {isHtml: true},
		colors:["#e1911e"],
		//backgroundColor: 'none',
       // title: title_string,
        hAxis: {//title: 'Household Wage Income',
                viewWindow:{min:0,max:g_chart_max},
                format: '$#,##0',
                textStyle: {fontName:"'Droid Sans',Arial, Helvetica, sans-serif",fontSize:14},
				baselineColor:"#FFFFFF",
				gridlines: {color:"#FFF"},
                titleTextStyle:{fontName:"'Droid Sans',Arial, Helvetica, sans-serif",fontSize:14},
				slantedText: true,
				slantedTextAngle: 45},
        vAxis: {//title: 'EITC Amount',
                viewWindow: {min:0,max:6100},
                format: '$#,##0',
				gridlines: {color:"#ddd"},
                textStyle: {fontName:"'Droid Sans',Arial, Helvetica, sans-serif",fontSize:14},
                titleTextStyle:{fontName:"'Droid Sans',Arial, Helvetica, sans-serif",fontSize:14}},
        titleTextStyle:{fontName:"'Droid Sans',Arial, Helvetica, sans-serif",fontSize:16},
        legend: {position: 'none'}
    };

    var chart = new google.visualization.ChartWrapper({	chartType: 'LineChart',
                                                        dataTable: data,
                                                        options:options_obj,
                                                        containerId: 'chart_area'});
	google.visualization.events.addListener(chart,'select',function() {
		try {
			var selected_object = chart.getChart().getSelection();
			var wageLevel = g_data_array[selected_object[0]["row"]][0];
			$("#head_slider").slider({value:wageLevel});
			
		} catch (ex) {
			LogWrite(ex);	
		}
	});
    chart.draw();
	$("circle").attr("fill","#F00");
    var use_counter = 0;
    for (var counter = 0;counter<data_array.length;counter++) {
        if (data_array[counter][0] == wages) {
            use_counter = counter;	
        }
    }
    
    chart.getChart().setSelection([{row:use_counter}]);
}

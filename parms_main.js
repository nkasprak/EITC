var g_chart_max = 52000;
var g_chart_y_max = 6100;

//Define the parameters. Convetion is as follows:
//g_eitc_parameters[filing_status][number_of_children] = [{"floor":val,"rate":val},{},{}...]

var g_eitc_parameters = new Array();
g_eitc_parameters[1] = new Array();
g_eitc_parameters[1][0] = [{"floor":0,"rate":0.0765},{"floor":6370,"rate":0},{"floor":7970,"rate":-0.0765}];
g_eitc_parameters[1][1] = [{"floor":0,"rate":0.34},{"floor":9560,"rate":0},{"floor":17530,"rate":-0.1598}];
g_eitc_parameters[1][2] = [{"floor":0,"rate":0.4},{"floor":13430,"rate":0},{"floor":17530,"rate":-0.2106}];
g_eitc_parameters[1][3] = [{"floor":0,"rate":0.45},{"floor":13430,"rate":0},{"floor":17530,"rate":-0.2106}];

g_eitc_parameters[2] = new Array();
g_eitc_parameters[2][0] = [{"floor":0,"rate":0.0765},{"floor":6370,"rate":0},{"floor":13310,"rate":-0.0765}];
g_eitc_parameters[2][1] = [{"floor":0,"rate":0.34},{"floor":9560,"rate":0},{"floor":22870,"rate":-0.1598}];
g_eitc_parameters[2][2] = [{"floor":0,"rate":0.4},{"floor":13430,"rate":0},{"floor":22870,"rate":-0.2106}];
g_eitc_parameters[2][3] = [{"floor":0,"rate":0.45},{"floor":13430,"rate":0},{"floor":22870,"rate":-0.2106}];
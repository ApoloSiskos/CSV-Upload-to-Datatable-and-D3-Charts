let inputElement = document.getElementById("input"),
    csvs = ["text/csv", "application/vnd.ms-excel"],
    example = null;

inputElement.addEventListener("change", handleFiles, false);

function handleFiles() {


    document.getElementById("main").innerHTML = `  
    <div class="row">
    <div class="col-xs">
       <div class="box-row">
        <div class="box-row">
            <hr/>
            <table id="example">
            </table>                  
        </div>
      </div>
    </div>
</div>

<div class="row">
    <div class="col-xs">
       <div class="box-row">
        <div class="box-row">
            <div id="myChart"></div>
        </div>
      </div>
    </div>
     <div class="col-xs">
       <div class="box-row">
        <div class="box-row">
            <div id="chart"></div>
        </div>
      </div>
    </div>
</div>    
    `;


    let file = this.files[0];
    if (window.File && window.FileReader && window.FileList && window.Blob) {
        if (csvs.indexOf(file.type) === -1) {
            alert("Please only upload CSV files.")
        } else {
            $.blockUI();
            let timer = {
                start: moment()
            };
            Papa.parse(file, {
                "download": true,
                "header": true,
                "dynamicTyping": true,
                "complete": results => {
                    if ($.fn.DataTable.isDataTable("#example")) {
                        example.destroy();
                        $('#example').empty();
                    }
                    example = $("#example").DataTable({
                        "responsive": true,
                        "columns": results.meta.fields.map(c => ({
                            "title": c,
                            "data": c,
                            /*"visible": c.toLowerCase() !== "id",*/
                            "default": ""
                        })),
                        "data": results.data,
                        "drawCallback": function(settings) {
                            $.unblockUI();
                            timer.end = moment();
                            let duration = moment.duration(timer.end.diff(timer.start));

                        }
                    });

                    //CSV to JSON
                    const rows = results.data.map(row => [row.Country, row.Price, row.Discount]);
                    var dataD3a = {
                        "headers": ["Dimension 1", "Metric 1", "Metric 2"],
                        "rows": rows
                    };

                    d3Chart(dataD3a);

                }
            });
        }
    }
}

///////////////////// First D3 Graph
function d3Chart(dataD3a) {
    var json_data = dataD3a;
    var headers = json_data.headers;
    var platform_data = json_data.rows;
    var data = [];
    var metric = 0;
    for (var i in platform_data) {
        var dimension = platform_data[i][0];
        metric = (platform_data[i][1]).toFixed(0);
        object = {
            label: dimension,
            value: metric
        };
        data.push(object);
    }

    var data = data,
        groups = Object.create(null),
        result = [];


    var nested_data = d3.nest()
        .key(function(d) {
            return d.label;
        })
        .rollup(function(d) {
            return d3.sum(d, function(v) {
                return +v.value;
            })
        }).entries(data);

    data = nested_data.map(function(row) {
        return {
            label: row.key,
            value: row.values
        };
    });

    data.sort(function(a, b) {
        return a.value > b.value ? -1 : a.value === b.value ? 0 : 1;
    });

    var div = d3.select("#graph").append("div").attr("class", "toolTip");

    var axisMargin = 20,
        margin = 40,
        valueMargin = 4,
        width = parseInt(d3.select('body').style('width'), 10),
        height = parseInt(d3.select('body').style('height'), 10),
        barHeight = (height - axisMargin - margin * 2) * 0.4 / data.length,
        barPadding = (height - axisMargin - margin * 2) * 0.6 / data.length,
        data, lines, svg, scale, xAxis, labelWidth = 0;

    max = d3.max(data, function(d) {
        return d.value;
    });

    svg = d3.select('#myChart')
        .append("svg")
        .attr("width", width)
        .attr("height", height);


    bar = svg.selectAll("g")
        .data(data)
        .enter()
        .append("g");

    bar.attr("class", "bar")
        .attr("cx", 0)
        .attr("transform", function(d, i) {
            return "translate(" + margin + "," + (i * (barHeight + barPadding) + barPadding) + ")";
        });

    bar.append("text")
        .attr("class", "label")
        .attr("y", barHeight / 2)
        .attr("dy", ".35em") //vertical align middle
        .text(function(d) {
            return d.label;
        }).each(function() {
            labelWidth = Math.ceil(Math.max(labelWidth, this.getBBox().width));
        });

    scale = d3.scale.linear()
        .domain([0, max])
        .range([0, width - margin * 2 - labelWidth]);

    xAxis = d3.svg.axis()
        .scale(scale)
        .tickSize(-height + 2 * margin + axisMargin)
        .orient("bottom");

    bar.append("rect")
        .attr("transform", "translate(" + labelWidth + ", 0)")
        .attr("height", barHeight)
        .attr("width", function(d) {
            return scale(d.value);
        });

    bar.append("text")
        .attr("class", "value")
        .attr("y", barHeight / 2)
        .attr("dx", -valueMargin + labelWidth) //margin right
        .attr("dy", ".35em") //vertical align middle
        .attr("text-anchor", "end")
        .text(function(d) {
            return (d.value);
        })
        .attr("x", function(d) {
            var width = this.getBBox().width;
            return Math.max(width + valueMargin, scale(d.value));
        });

    bar
        .on("mousemove", function(d) {
            div.style("left", d3.event.pageX + 10 + "px");
            div.style("top", d3.event.pageY - 25 + "px");
            div.style("display", "inline-block");
            div.html((d.label) + "<br>" + (d.value));
        });
    bar
        .on("mouseout", function(d) {
            div.style("display", "none");
        });

    svg.insert("g", ":first-child")
        .attr("class", "axisHorizontal")
        .attr("transform", "translate(" + (margin + labelWidth) + "," + (height - axisMargin - margin) + ")")
        .call(xAxis);

    ///////////////////// Second D3 Graph
    var w = 400,
        h = 400,
        r = 180,
        inner = 90,
        color = d3.scale.ordinal()
        .range(["#124", "#214183", "#3061c2", "#4876d1", "#87a5e1", "#c5d4f1"]);

    var total = d3.sum(data, function(d) {
        return d3.sum(d3.values(d));
    });

    var vis = d3.select("#chart")
        .append("svg:svg")
        .data([data])
        .attr("width", w)
        .attr("height", h)
        .append("svg:g")
        .attr("transform", "translate(" + r * 1.1 + "," + r * 1.1 + ")")

    var textTop = vis.append("text")
        .attr("dy", ".35em")
        .style("text-anchor", "middle")
        .attr("class", "textTop")
        .text("TOTAL")
        .attr("y", -10),
        textBottom = vis.append("text")
        .attr("dy", ".35em")
        .style("text-anchor", "middle")
        .attr("class", "textBottom")
        .text(total.toFixed(2) + "m")
        .attr("y", 10);

    var arc = d3.svg.arc()
        .innerRadius(inner)
        .outerRadius(r);

    var arcOver = d3.svg.arc()
        .innerRadius(inner + 5)
        .outerRadius(r + 5);

    var pie = d3.layout.pie()
        .value(function(d) {
            return d.value;
        });

    var arcs = vis.selectAll("g.slice")
        .data(pie)
        .enter()
        .append("svg:g")
        .attr("class", "slice")
        .on("mouseover", function(d) {
            d3.select(this).select("path").transition()
                .duration(200)
                .attr("d", arcOver)

            textTop.text(d3.select(this).datum().data.label)
                .attr("y", -10);
            textBottom.text(d3.select(this).datum().data.value.toFixed(2))
                .attr("y", 10);
        })
        .on("mouseout", function(d) {
            d3.select(this).select("path").transition()
                .duration(100)
                .attr("d", arc);

            textTop.text("TOTAL")
                .attr("y", -10);
            textBottom.text(total.toFixed(2) + "m");
        });

    arcs.append("svg:path")
        .attr("fill", function(d, i) {
            return color(i);
        })
        .attr("d", arc);

    var legend = d3.select("#chart").append("svg")
        .attr("class", "legend")
        .attr("width", r)
        .attr("height", r * 2)
        .selectAll("g")
        .data(data)
        .enter().append("g")
        .attr("transform", function(d, i) {
            return "translate(0," + i * 20 + ")";
        });

    legend.append("rect")
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", function(d, i) {
            return color(i);
        });

    legend.append("text")
        .attr("x", 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .text(function(d) {
            return d.label;
        });

}
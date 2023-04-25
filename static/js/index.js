$(document).ready(function () {
	// Global variable that holds the original 10 movies that will be displayed if "Reset" button is clicked
	var originalMovies = [];
	// Global variable that holds the original ratings for a given user that will be displayed if "Reset" button is clicked
	var originalRatings = [];
	var cluster_data = [];
	var cluster_chart;
	var representativeDots;
	var nonRepresentativeDots;

	var occupations = [
		"Other or Not Specified",
		"Academic/Educator",
		"Artist",
		"Clerical/Admin",
		"College/Grad Student",
		"Customer Service",
		"Doctor/Health Care",
		"Executive/Managerial",
		"Farmer",
		"Homemaker",
		"K-12 Student",
		"Lawyer",
		"Programmer",
		"Retired",
		"Sales/Marketing",
		"Scientist",
		"Self-Employed",
		"Technician/Engineer",
		"Tradesman/Craftsman",
		"Unemployed",
		"Writer"
	];

	function createSliders(genre_ratings) {
		$(".slider").each(function (i) {
			$(this).empty().slider({
				value: genre_ratings[i],
				range: "min",
				animate: true,
				orientation: "horizontal",
				tooltip: "show", // display the slider value as a tooltip
				slide: function (event, ui) { // update the tooltip as the slider is moved
					$(this).find(".ui-slider-handle").text(ui.value);
				},
				stop: function (event, ui) { // hide the tooltip when slider is not being moved
					$(this).find(".ui-slider-handle").text("");
				}
			});
		
			// Add mousedown event handler to show the value when the slider is active
			$(this).find(".ui-slider-handle").on("mousedown", function () {
				$(this).text($(this).parent().slider("option", "value"));
			});
		
			// Add mouseup event handler to hide the value when the slider is not active
			$(this).find(".ui-slider-handle").on("mouseup", function () {
				$(this).text("");
			});
		});
	}

	$('#userId').selectize({
		create: false,
		placeholder: 'Enter ID between 1 - 6040',
		allowEmptyOption: true
	});

	$('#age').selectize({
		create: false,
		placeholder: 'None',
		allowEmptyOption: true
	});

	$('#gender').selectize({
		create: false,
		placeholder: 'None',
		allowEmptyOption: true
	});

	$('#location').selectize({
		create: false,
		placeholder: 'None',
		allowEmptyOption: true
	});

	$('#occupation').selectize({
		create: false,
		placeholder: 'None',
		allowEmptyOption: true
	});

	$('#top-genre').selectize({
		create: false,
		placeholder: 'None',
		allowEmptyOption: true
	});

	createSliders("50|50|50|50|50|50|50|50|50|50|50|50|50|50|50|50|50|50|50".split("|"));

	function updateSliders(ratings) {
		$(".slider").each(function (i) {
			$(this).slider({
				value: ratings[i]
			});
		});
	}

  	function ageRange(age) {
		const ageMapping = {
			1: "Under 18",
			18: "18-24",
			25: "25-34",
			35: "35-44",
			45: "45-49",
			50: "50-55",
			56: "56+"
		};
		return ageMapping[age] || "Unknown";
	}

	// Function that displays random 10 movies
	function displayMovies(data) {
		// Clear the movies container and append the new movies
		$('#movies-container').empty();
		console.log(data)
		$.each(data, function (index, movie) {
		const movieHtml = '<div class="movie">' +
			'<img src="' + (["n/a", "nan"].indexOf(movie.poster) !== -1 ? $("#placeholderImage").attr("src") : movie.poster) + '">' +
			'<h2>' + movie.title + ' (' + movie.year + ')' + '</h2>' +
			'</div>';
		$('#movies-container').append(movieHtml);
		});
	}

	// Function that resets sliders to original values and displays original 10 movies
	function resetSliders() {
		displayMovies(originalMovies);
		updateSliders(originalRatings);
	}

	// Set a flag to keep track of whether any slider value has been changed
	var slidersChanged = false;

	// Add an event listener to the sliders to set the flag when a value is changed
	$(".slider").on("slidechange", function (event, ui) {
		slidersChanged = true;
	});

	// Add an event listener to the update button to update the movies when clicked
	$("#update-button").on("click", function () {
		if (slidersChanged) {
		// Make the AJAX call to get the updated movies
		$.ajax({
			url: "/ajax/",
			type: "POST",
			dataType: "json",
			data: {
			call: 'get_movies',
			genre_ratings: $(".slider").map(function () {
				return $(this).slider("value");
			}).get(),
			csrfmiddlewaretoken: $('input[name="csrfmiddlewaretoken"]').val()
			},
			success: function (data) {
			// Clear the movies container and append the new movies
			$('#movies-container').empty();
			displayMovies(data);
			},
			error: function (xhr, errmsg, err) {
			console.log(xhr.status + ": " + xhr.responseText);
			}
		});
		}

		// Reset the flag after the movies have been updated
		slidersChanged = false;
	});

	// Resets sliders and movies to original values when reset button is clicked
	$("#reset-button").click(resetSliders);

	// Search for users in the Users Cluster View when search button is clicked
	$("#search").click(function (e) {
		e.preventDefault();
		$.ajax({
			url: "/ajax/",
			type: "POST",
			dataType: "json",
			data: {
				call: 'search_users',
				userId: $('#userId').val(),
				age: $("#age").val(),
				gender: $("#gender").val(),
				location: $("#location").val(),
				occupation: $("#occupation").val(),
				top_genre: $("#top-genre").val(),
				csrfmiddlewaretoken: $('input[name="csrfmiddlewaretoken"]').val()
			},
			success: function (json) {
				console.log(json);
				// cluster_chart.update(json);
				generate_cluster(json);
			},
			error: function (xhr, errmsg, err) {
				console.log("Error", xhr.status + ": " + xhr.responseText);
			}
		})
	});

	// Fetch User Info
	$("#fetchUser").click(function (e) {
		e.preventDefault();
		$.ajax({
			url: "/ajax/",
			type: "POST",
			dataType: "json",
			data: {
				call: 'fetch_user_info',
				userId: $('#userId').val(),
				extra: 1,
				csrfmiddlewaretoken: $('input[name="csrfmiddlewaretoken"]').val()
			},
			success: function (json) {
				$('#userIdLabel').text($('#userId').val());
				$('#genderLabel').text(json.gender);
				$('#ageLabel').text(ageRange(json.age));
				$('#occupationLabel').text(occupations[json.occupation]);
				$('#locationLabel').text(json.zipCode);
				updateSliders(json.genreRatings.split("|"));
				originalRatings = json.genreRatings.split("|");

				// Populate recent interactions
				let recentInteractions = $('#recentInteractions');
				recentInteractions.empty();
				for (let rating of json.ratings) {
					recentInteractions.append('<li>' + rating + '</li>');
				}
			},
			error: function (xhr, errmsg, err) {
				console.log("Error", xhr.status + ": " + xhr.responseText);
			}
		})
	});

	// Get the User Explorer Data
	$.ajax({
		url: "/ajax/",
		type: "POST",
		dataType: "json",
		data: {
			call: 'cluster_csv',
			csrfmiddlewaretoken: $('input[name="csrfmiddlewaretoken"]').val()
		},
		success: function (data) {
			cluster_chart = generate_cluster(data);
		},
		error: function (xhr, errmsg, err) {
			console.log("Error", xhr.status + ": " + xhr.responseText);
		}
	});

	// Get initial 10 random movies
	$.ajax({
			url: "/ajax/",
			type: "POST",
			dataType: "json",
			data: {
			call: 'get_movies',
			csrfmiddlewaretoken: $('input[name="csrfmiddlewaretoken"]').val()
		},
		success: function (data) {
			originalMovies = data; // assign these original 10 movies to originalMovies global variable
			displayMovies(data);
		},
		error: function (xhr, errmsg, err) {
			console.log(xhr.status + ": " + xhr.responseText);
		}
	});

    async function fetchUser(userId) {
		return new Promise((resolve, reject) => {
			$.ajax({
				url: "/ajax/",
				type: "POST",
				dataType: "json",
				data: {
					call: 'fetch_user_info',
					userId: userId,
					extra: 0,
					csrfmiddlewaretoken: $('input[name="csrfmiddlewaretoken"]').val()
				},
				success: function (json) {
					resolve(json);
				},
				error: function (xhr, errmsg, err) {
					console.log("Error", xhr.status + ": " + xhr.responseText);
					reject(xhr);
				}
			});
		});
	}

	async function fetchUserTooltip(userId) {
		let userData = await fetchUser(userId)
		return `<b>User: </b>${userId}<br><b>Gender: </b>${userData.gender}<br><b>Age: </b>${ageRange(userData.age)}<br><b>Occupation: </b>${occupations[userData.occupation]}<br><b>Location: </b>${userData.zipCode}`;
	}
  
	async function addCounterfactualPersona(userId) {

	}

  	function generate_cluster(data) {
		// Zoomable, Pannable, Hoverable Scatter Plot
		// Set height/width of plot
		height = 240;
		width = 400;
		k = height / width

		$("#chart").empty();

		grid = (g, x, y) => g
			.attr("stroke", "currentColor")
			.attr("stroke-opacity", 0.1)
			.call(g => g
				.selectAll(".x")
				.data(x.ticks(12))
				.join(
					enter => enter.append("line").attr("class", "x").attr("y2", height),
					update => update,
					exit => exit.remove()
				)
				.attr("x1", d => 0.5 + x(d))
				.attr("x2", d => 0.5 + x(d)))
			.call(g => g
				.selectAll(".y")
				.data(y.ticks(12 * k))
				.join(
					enter => enter.append("line").attr("class", "y").attr("x2", width),
					update => update,
					exit => exit.remove()
				)
				.attr("y1", d => 0.5 + y(d))
				.attr("y2", d => 0.5 + y(d)));

		yAxis = (g, y) => g.call(d3.axisRight(y).ticks(12 * k)).call(g => g.select(".domain").attr("display", "none"))
		xAxis = (g, x) => g.attr("transform", `translate(0,${height})`).call(d3.axisTop(x).ticks(12)).call(g => g.select(".domain").attr("display", "none"))

		z = d3.scaleOrdinal().domain(data.map(d => d[2])).range(d3.schemeCategory10)
		const firstDomainValue = data.map(d => d[2])[0];
		const secondDomainValue = data.map(d => d[2])[1];

		const firstColor = z(firstDomainValue);
		const secondColor = z(secondDomainValue);

		console.log("First color:", firstColor);
		console.log("Second color:", secondColor);
		y = d3.scaleLinear().domain([-4.5 * k, 4.5 * k]).range([height, 0])
		x = d3.scaleLinear().domain([-4.5, 4.5]).range([0, width])

		const chart = () => {
			const zoom = d3.zoom().scaleExtent([8, 128]).on("zoom", zoomed);
			const svg = d3.create("svg").attr("viewBox", [0, 0, width, height]);
			const gGrid = svg.append("g");

			// Create a tooltip div
			const tooltip = d3.select("#chart").append("div").style("opacity", 0).attr("class", "tooltip");
			const gDot = svg.append("g").attr("fill", "none").attr("stroke-linecap", "round")

			let tooltipTimeout;
			let lastHoveredPoint;

			nonReprData = data.filter(d => d[4] !== 1)
			reprData = data.filter(d => d[4] == 1)

			console.log(reprData)
			console.log(nonReprData)

			nonRepresentativeDots = gDot.selectAll(".non-representative")
				.data(nonReprData)
				.join("path")
				.classed("non-representative", true)
				.attr("d", d => `M${x(d[0])},${y(d[1])}h0`)
				.attr("stroke", d => z(d[2]))
				// .attr("stroke-width", z(0.1))

			representativeDots = gDot.selectAll(".representative")
				.data(reprData)
				.join("path")
				.classed("representative", true)
				.attr("d", d => `M${x(d[0])},${y(d[1]) - 0.05}l-0.05,.1h.1z`)
				.attr("stroke", d => d3.color(z(d[2])).brighter(1))
				.attr("stroke-width", z(.05))
				.attr("fill", d => d3.color(z(d[2])).brighter(1))
		
			gDot.selectAll(".representative, .non-representative")
				.on("mouseover", async function (event, d) {
					if (lastHoveredPoint !== d[3]) {
						clearTimeout(tooltipTimeout);
				
						tooltipTimeout = setTimeout(async () => {
							let tooltipHtml = await fetchUserTooltip(d[3]);
							tooltip.html(tooltipHtml).style("left", (event.x) + "px").style("top", (event.y - 300) + "px");
							tooltip.transition().duration(100).style("opacity", .9);
						}, 30);
					}
					lastHoveredPoint = d[3];
				}).on("mouseout", function (d) {
						clearTimeout(tooltipTimeout);
						tooltip.transition().duration(500).style("opacity", 0);
						lastHoveredPoint = null;
				}).on("click", function (event, d) {
					console.log("Clicked point's d[3]:", d[3]);
					addCounterfactualPersona(d[3]);
				});

			let hideTooltipTimeout;

			$(document).on("mousemove", function(event) {
				const targetTagName = event.target.tagName.toLowerCase();
			
				if (targetTagName !== "g" && targetTagName !== "svg" && targetTagName !== "path") {
				clearTimeout(hideTooltipTimeout);
			
				hideTooltipTimeout = setTimeout(function() {
					tooltip.transition()
					.duration(500)
					.style("opacity", 0);
					lastHoveredPoint = null;
				}, 500);
				} else {
				clearTimeout(hideTooltipTimeout);
				}
			});

			const gx = svg.append("g");

			const gy = svg.append("g");

			const initial_scale = 10;
			const initial_translate_x = -x(-0.05) * (initial_scale - 1);
			const initial_translate_y = -y(0.025) * (initial_scale - 1);
			svg.call(zoom).call(zoom.transform, d3.zoomIdentity.translate(initial_translate_x, initial_translate_y).scale(initial_scale));

			function zoomed({
				transform
			}) {
				const zx = transform.rescaleX(x).interpolate(d3.interpolateRound);
				const zy = transform.rescaleY(y).interpolate(d3.interpolateRound);
				gDot.attr("transform", transform).attr("stroke-width", 5 / transform.k);
				gx.call(xAxis, zx);
				gy.call(yAxis, zy);
				gGrid.call(grid, zx, zy);
			}

			return Object.assign(svg.node(), {
				reset() {
				svg.transition()
					.duration(750)
					.call(zoom.transform, d3.zoomIdentity);
				}
			});
		};

		const chartDiv = d3.select("#chart");
		const chartSvg = chartDiv.append(() => chart());

		return chart;
	}	
});
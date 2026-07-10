let mountedData = [];

function mount() {
  let data = [
    {
      tag: "Concurrency",
      type: "toggles2",
      description:
        "Swift has built-in support for writing asynchronous and parallel code in a structured way. Asynchronous code can be suspended and resumed later, although only one piece of the program executes at a time.",
    },
    {
      tag: "Defining and Calling Asynchronous Functions",
      type: "code-slash",
      description:
        "An asynchronous function or asynchronous method is a special kind of function or method that can be suspended while it’s partway through execution.",
    },
    {
      tag: "Asynchronous Sequences",
      type: "controller",
      description:
        "The listPhotos(inGallery:) function in the previous section asynchronously returns the whole array at once, after all of the array’s elements are ready.",
    },
    {
      tag: "Calling Asynchronous Functions in Parallel",
      type: "droplet-fill",
      description:
        "Calling an asynchronous function with await runs only one piece of code at a time. While the asynchronous code is running, the caller waits for that code to finish before moving on to run the next line of code.",
    },
    {
      tag: "Tasks and Task Groups",
      type: "envelope-open-fill",
      description:
        "A task is a unit of work that can be run asynchronously as part of your program. All asynchronous code runs as part of some task. The async-let syntax described in the previous section creates a child task for you.",
    },
    {
      tag: "Unstructured Concurrency",
      type: "github",
      description:
        "In addition to the structured approaches to concurrency described in the previous sections, Swift also supports unstructured concurrency.",
    },
    {
      tag: "Task Cancellation",
      type: "shield-fill-check",
      description:
        "Swift concurrency uses a cooperative cancellation model. Each task checks whether it has been canceled at the appropriate points in its execution, and responds to cancellation in whatever way is appropriate.",
    },
    {
      tag: "Actors",
      type: "umbrella",
      description:
        "Like classes, actors are reference types, so the comparison of value types and reference types in Classes Are Reference Types applies to actors as well as classes. ",
    },
  ];
  mountedData = data;
  reloadWithData(mountedData);
}

// function:
// Parameters:
//  - value: String
// Properties:
//  - listMatchs: [Object] // Structure: { tag: String, type: String, description: String }
// Return: Void
// Complexity:
function searchTags(value) {
  if (value == null || value == "") {
    reloadWithData(mountedData);
    return;
  }
  const listMatchs = [];
  const listSimilarityPrices = [];
  const mapPriceToIndex = [];
  mountedData.forEach((item, index) => {
    // if (item.tag.toLowerCase().includes(value.toLowerCase())) {
    //   listMatchs[listMatchs.length] = item;
    // }

    let priceWithTag = 1 - compareTwoStrings(item.tag.toLowerCase(), value.toLowerCase()); // lower value better match
    let priceWithDescription = compareTwoStrings(item.description.toLowerCase(), value.toLowerCase());
    let FixedPriceWithDescription = priceWithDescription > 0.5 ? priceWithDescription : priceWithDescription / 3;

    let price = priceWithTag > 0.5 ? priceWithTag : priceWithDescription;
    let sortedIndex = getIndexCompatible(listSimilarityPrices, price);
    listSimilarityPrices.splice(sortedIndex, 0, price);
    mapPriceToIndex.splice(sortedIndex, 0, index);
  });
  // console.log(listSimilarityPrices);
  // console.log(mapPriceToIndex);
  mapPriceToIndex.forEach((item, index) => {
    listMatchs[index] = mountedData[item];
  });

  let list = document.getElementById("tagsList");
  list.innerHTML = "";
  reloadWithData(listMatchs);
}

// function: if value is null this function reload with fetched data
// Parameters:
//  - value: [Object] // Structure: { tag: String, type: String, description: String }
// Return: Void
// Complexity:
function reloadWithData(value) {
  let data = [];
  if (value == null) {
    data = mountedData == null ? [] : mountedData;
  } else {
    data = value;
  }
  let list = document.getElementById("tagsList");
  data.forEach((item) => {
    let element = document.createElement("div");
    element.classList.add("col");
    element.classList.add("d-flex");
    element.classList.add("align-items-start");
    element.innerHTML =
      '<div class="icon-square bg-light text-dark flex-shrink-0 me-3"><i class="bi-' +
      item.type +
      '" width="1em" height="1em"></i></div><div><a href="posts-of-tag-page.html" class="text-dark text-decoration-none"><h4 class="fw-bold mt-2">' +
      item.tag +
      "</h4><p>" +
      item.description +
      "</p></a></div>";
    list.appendChild(element);
  });
}

// Measure 2 String similarity.
function compareTwoStrings(first, second) {
	first = first.replace(/\s+/g, '')
	second = second.replace(/\s+/g, '')

	if (first === second) return 1; // identical or empty
	if (first.length < 2 || second.length < 2) return 0; // if either is a 0-letter or 1-letter string

	let firstBigrams = new Map();
	for (let i = 0; i < first.length - 1; i++) {
		const bigram = first.substring(i, i + 2);
		const count = firstBigrams.has(bigram)
			? firstBigrams.get(bigram) + 1
			: 1;

		firstBigrams.set(bigram, count);
	};

	let intersectionSize = 0;
	for (let i = 0; i < second.length - 1; i++) {
		const bigram = second.substring(i, i + 2);
		const count = firstBigrams.has(bigram)
			? firstBigrams.get(bigram)
			: 0;

		if (count > 0) {
			firstBigrams.set(bigram, count - 1);
			intersectionSize++;
		}
	}

	return (2.0 * intersectionSize) / (first.length + second.length - 2);
}

function findBestMatch(mainString, targetStrings) {
	if (!areArgsValid(mainString, targetStrings)) throw new Error('Bad arguments: First argument should be a string, second should be an array of strings');
	
	const ratings = [];
	let bestMatchIndex = 0;

	for (let i = 0; i < targetStrings.length; i++) {
		const currentTargetString = targetStrings[i];
		const currentRating = compareTwoStrings(mainString, currentTargetString)
		ratings.push({target: currentTargetString, rating: currentRating})
		if (currentRating > ratings[bestMatchIndex].rating) {
			bestMatchIndex = i
		}
	}
	
	
	const bestMatch = ratings[bestMatchIndex]
	
	return { ratings: ratings, bestMatch: bestMatch, bestMatchIndex: bestMatchIndex };
}

// usecase: want to find index when add an element into a sorted array.
// function: if it take an equal value to compare, it return a lower index.
// Parameters:
//  - value: [Object] // Structure: { tag: String, type: String, description: String }
// Return: Int //
// Complexity:
function getIndexCompatible(array, value) {
	var low = 0,
		high = array.length;

	while (low < high) {
		var mid = low + high >>> 1;
		if (array[mid] < value) low = mid + 1;
		else high = mid;
	}
	return low;
}
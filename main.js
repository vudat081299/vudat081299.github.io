let mountedData = [];

function mount() {
  let data = [
    {
      tag: "Concurrency",
      type: "",
      description:
        "Swift has built-in support for writing asynchronous and parallel code in a structured way. Asynchronous code can be suspended and resumed later, although only one piece of the program executes at a time.",
    },
    {
      tag: "Defining and Calling Asynchronous Functions",
      type: "",
      description:
        "An asynchronous function or asynchronous method is a special kind of function or method that can be suspended while it’s partway through execution.",
    },
    {
      tag: "Asynchronous Sequences",
      type: "",
      description:
        "The listPhotos(inGallery:) function in the previous section asynchronously returns the whole array at once, after all of the array’s elements are ready.",
    },
    {
      tag: "Calling Asynchronous Functions in Parallel",
      type: "",
      description:
        "Calling an asynchronous function with await runs only one piece of code at a time. While the asynchronous code is running, the caller waits for that code to finish before moving on to run the next line of code.",
    },
    {
      tag: "Tasks and Task Groups",
      type: "",
      description:
        "A task is a unit of work that can be run asynchronously as part of your program. All asynchronous code runs as part of some task. The async-let syntax described in the previous section creates a child task for you.",
    },
    {
      tag: "Unstructured Concurrency",
      type: "",
      description:
        "In addition to the structured approaches to concurrency described in the previous sections, Swift also supports unstructured concurrency.",
    },
    {
      tag: "Task Cancellation",
      type: "",
      description:
        "Swift concurrency uses a cooperative cancellation model. Each task checks whether it has been canceled at the appropriate points in its execution, and responds to cancellation in whatever way is appropriate.",
    },
    {
      tag: "Actors",
      type: "",
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
  mountedData.forEach((item) => {
    if (item.tag.toLowerCase().includes(value.toLowerCase())) {
      listMatchs[listMatchs.length] = item;
    }
  });

  let list = document.getElementById("tagsList");
  list.innerHTML = "";
  console.log(listMatchs.length);
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
      '<div class="icon-square bg-light text-dark flex-shrink-0 me-3"><svg class="bi" width="1em" height="1em"><use xlink:href="#toggles2"/></svg></div><div><a href="posts-of-tag-page.html" class="text-dark text-decoration-none"><h4 class="fw-bold mt-2">' +
      item.tag +
      "</h4><p>" +
      item.description +
      "</p></a></div>";
    list.appendChild(element);
  });
}

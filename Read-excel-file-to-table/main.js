// The code below uses following scripts, they are injected already:
// 1. https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.15.1/xlsx.full.min.js 
// 2. https://cdnjs.cloudflare.com/ajax/libs/json2html/1.3.0/json2html.min.js

let fileInputEl;
let columnsEl;
let output;

window.onload = () => {
  fileInputEl = document.getElementById('file-btn');
  columnsEl = document.getElementById('columns');
  outputEl = document.getElementById('output');
  fileInputEl.addEventListener('change', onUpload);
  fileInputEl.addEventListener('click', onClick);
}

function onClick(event) {
  if (!columnsEl.value) {
    alert('You forgot to specify columns');
    event.preventDefault();
  }
}

function onUpload(event) {
  const reader = new FileReader();
  const file = event.target.files[0];
  
  const columns = columnsEl.value.split(',').map(col => col.trim());
  const tableHeader = columns.map(col => `<th>${col}</th>`).join('');
  outputEl.innerHTML = tableHeader;
  
  reader.onload = (e) => {
    const fileContent = e.target.result;
    const workbook = XLSX.read(fileContent, { type: 'binary' });
    workbook.SheetNames.forEach(sheetname => {
      const data = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetname]);
      const html = json2html.transform(data, {
        '<>': 'tr',
        'html': columns.map(col => `<td>\${${col}}</td>`).join('')
      });
      outputEl.innerHTML += html;
    });
  }
  
  reader.onerror = (error) => {
    console.log('Error', error);
  };
  
  reader.readAsBinaryString(file);
}

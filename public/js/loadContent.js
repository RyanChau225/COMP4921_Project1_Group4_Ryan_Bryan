const links = [
  "https://example1.com",
  "https://example2.com",
  "https://example3.com",
  // ... more links
];

document.addEventListener("DOMContentLoaded", function() {
  // Load header
  fetch('../template/header.html')
      .then(response => response.text())
      .then(content => {
          document.getElementById('header').innerHTML = content;
      });

  // Load footer
  fetch('../template/footer.html')
      .then(response => response.text())
      .then(content => {
          document.getElementById('footer').innerHTML = content;
      });

  // Load footer
  fetch('../template/links.html')
      .then(response => response.text())
      .then(content => {
          document.getElementById('links').innerHTML = content;
      });



    setupInteractiveElements();
});
function setupInteractiveElements() {
  populateTable();

  const searchBox = document.getElementById("searchBox");
  searchBox.addEventListener("input", searchFunction);

  document.getElementById('btnAddLink').addEventListener('click', function() {
      const newLink = prompt("Enter the new link:");
      if (newLink) {
          links.push(newLink);
          populateTable();
      }
  });

  // Similarly, for images and text:
  // Assuming you just want to add URLs for images and plain text for text
  document.getElementById('btnAddImage').addEventListener('click', function() {
      const newImageLink = prompt("Enter the image link:");
      if (newImageLink) {
          links.push(newImageLink);
          populateTable();
      }
  });

  document.getElementById('btnAddText').addEventListener('click', function() {
      const newText = prompt("Enter the text:");
      if (newText) {
          links.push(newText);
          populateTable();
      }
  });
}

function populateTable() {
  const tableBody = document.querySelector("#linksTable tbody");
  tableBody.innerHTML = '';  // Clear the existing rows

  links.forEach(link => {
      const row = tableBody.insertRow();
      const cell = row.insertCell(0);
      const anchor = document.createElement("a");
      anchor.href = link;
      anchor.textContent = link;
      cell.appendChild(anchor);
  });
}

function searchFunction() {
  const query = this.value.toLowerCase();
  const rows = document.querySelectorAll("#linksTable tbody tr");
  rows.forEach(row => {
      const link = row.querySelector("a").href.toLowerCase();
      if (link.includes(query)) {
          row.style.display = "";
      } else {
          row.style.display = "none";
      }
  });
}
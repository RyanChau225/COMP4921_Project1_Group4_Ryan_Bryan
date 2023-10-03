function toggleInputFields() {
  const mediaType = document.querySelector('[name="media_type"]').value;
  document.getElementById('original-link-field').style.display = mediaType === 'links' ? 'block' : 'none';
  document.getElementById('text-area-field').style.display = mediaType === 'text' ? 'block' : 'none';
  document.getElementById('custom-url-field').style.display = mediaType === 'links' ? 'block' : 'none';
}

// Call the function on page load to set the initial state
window.onload = toggleInputFields;

function validateForm() {
  console.log("validateForm called");  // Add this line
  var originalLinkInput = document.querySelector('input[name="original_link"]');
  var originalLink = originalLinkInput.value;
  if (originalLink === '') {
      // Set the error message
      document.getElementById('error-data').setAttribute('data-error', 'Please provide an original link.');
      // Show your modal
      openModal();
      return false;  // Prevent form submission
  }
  if (!originalLink.startsWith('http://') && !originalLink.startsWith('https://')) {
      // Update the input value to include 'http://'
      originalLinkInput.value = 'http://' + originalLink;
  }
  return true;  // Allow form submission
}



function openModal() {
  document.getElementById('errorModal').classList.add('is-active');
}

function closeModal() {
  document.getElementById('errorModal').classList.remove('is-active');
}

document.addEventListener('DOMContentLoaded', function () {
  var errorElement = document.getElementById('error-data');
  if (errorElement) {  // Check if errorElement is not null
      var error = errorElement.getAttribute('data-error');
      if (error) {
          var errorModal = document.getElementById('errorModal');
          errorModal.classList.add('is-active');

          var modalContent = errorModal.querySelector('.modal-card-body');
          modalContent.textContent = error;
      }
  } else {
      console.error('Error element not found');
  }
});

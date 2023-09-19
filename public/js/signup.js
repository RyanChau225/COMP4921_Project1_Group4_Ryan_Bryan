function saveUserToDatabase() {
    let username = $("#username-text-field").val();
    let password = $("#password-text-field").val();
    let name = $("#name-text-field").val();

    $.ajax({
        url: 'http://localhost:3000/userSignUp',
        type: 'POST',
        data: {
            username: username,
            password: password,
            name: name
        },
        success: processUserSignUp
    })
}

function processUserSignUp(data) {
    if (data == true) {
        window.alert("That username is taken. Please try again.")
    } else {
        window.alert(`You have successfully sign up ${data}!`);
        window.location.href = "http://localhost:3000/";
    }
    
}

function setup() {
   $("#signup-button").click(saveUserToDatabase);
}

$(document).ready(setup);
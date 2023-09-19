function processLogin(data) {
    if (data) {
        window.alert('You have successfully logged in!');
        window.location.href = "http://localhost:3000/";
    } else {
        window.alert('No User or Pass exists, please dbl check');
    }

}

function checkUserCredentials() {
    let usernameToCheck = $("#username-text-field").val();
    let passwordToCheck = $("#password-text-field").val();
    
    $.ajax({
        url: 'http://localhost:3000/checkUserCredentials',
        type: 'POST',
        data: {
            username: usernameToCheck,
            password: passwordToCheck
        },
        success: processLogin
        
    })
    localStorage.setItem('name',(usernameToCheck));
    console.log(usernameToCheck)
}

function setup() {
    $("#login-button").click(checkUserCredentials);
}

console.log("test")

$(document).ready(setup);
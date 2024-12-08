//const API_URL = "https://api-server-5.glitch.me/api/contacts";
const API_URL = "http://localhost:5000/api/Accounts";
let currentHttpError = "";

function API_getcurrentHttpError () {
    return currentHttpError; 
}

function API_RegisterUser(user) {
    return new Promise(resolve => {
        $.ajax({
            url: `${API_URL}/register`, 
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify(user),
            success: (response) => {
                currentHttpError = "";
                resolve(response);
            },
            error: (xhr) => {
                console.error(xhr);
                resolve(null);
            }
        });
    });
}

async function API_LoginUser(loginInfo) {
    try {
        let response = await $.ajax({
            url: `${API_URL}/login`, 
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify(loginInfo)
        });

        return response;
    } catch (error) {
        console.error("Login failed:", error);
        return null;  
    }
}

async function API_LogoutUser(loggeduser) {
    try {
        console.log("Sending logout request..."); 
        let response = await $.ajax({
            url: `${API_URL}/logout`, 
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify(loggeduser)
        });
        return response;
    } catch (error) {
        console.log("Error:", error);
        return null;  
    }
}




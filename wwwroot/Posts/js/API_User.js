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


async function API_ModifyUser(data) { 
    console.log(data);
    try {
        const response = await $.ajax({
            url: `${API_URL}/modify`, 
            method: "PUT",
            contentType: "application/json",
            headers: {
                'authorization': `Bearer ${data.AccessToken}`
            },
            data: JSON.stringify(data)
        });
        currentHttpError = ""; 
        return response;
    } catch (xhr) {
        currentHttpError = xhr.responseJSON?.message || xhr.statusText || "Unknown error"; 
        return null;
    }
}
    async function API_LoginUser(loggeduser) {
        return new Promise(resolve => {
            $.ajax({
                url: `${API_URL}/login`, 
                method: "POST",
                contentType: "application/json",
                data: JSON.stringify(loggeduser),
                success: (response) => {
                    currentHttpError = "";
                    
                    if (response) {
                        localStorage.setItem('authToken', response);
                        resolve(response); 
                    } else {
                        console.error("Token not found in response");
                        resolve(null); 
                    }
                },
                error: (xhr) => {
                    console.error('Login failed:', xhr);
                    resolve(null);  
                }
            });
        });
    }
    
    
async function API_LogoutUser(loggininfo) {
    return new Promise(resolve => {
        $.ajax({
            url: `${API_URL}/logout`, 
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify(loggininfo),
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

function API_verify(id, code) {
    const url = `${API_URL}/verify`; 
    $.ajax({
        url: url, 
        type: 'GET', 
        data: { id: id, code: code }, 
        success: function(response) {
            currentHttpError = "";
            resolve(response);
        },
        error: function(xhr) {
            console.error(xhr);
            resolve(null);
        }
    });
}


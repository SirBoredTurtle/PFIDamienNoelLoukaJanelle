//const API_URL = "https://api-server-5.glitch.me/api/contacts";
const API_URL = "http://localhost:5000/api/user";
let currentHttpError = "";

function API_getcurrentHttpError () {
    return currentHttpError; 
}
function API_GetUser() {
    return new Promise(resolve => {
        $.ajax({
            url: API_URL,
            success: users => { currentHttpError = ""; resolve(users); },
            error: (xhr) => { console.log(xhr); resolve(null); }
        });
    });
}
function API_GetUser(userId) {
    return new Promise(resolve => {
        $.ajax({
            url: API_URL + "/" + userId,
            success: user => { currentHttpError = ""; resolve(user); },
            error: (xhr) => { currentHttpError = xhr.responseJSON.error_description; resolve(null); }
        });
    });
}
function API_SaveUser(user, create) {
    return new Promise(resolve => {
        $.ajax({
            url: create ? API_URL :  API_URL + "/" + user.Id,
            type: create ? "POST" : "PUT",
            contentType: 'application/json',
            data: JSON.stringify(user),
            success: (/*data*/) => { currentHttpError = ""; resolve(true); },
            error: (xhr) => {currentHttpError = xhr.responseJSON.error_description; resolve(false /*xhr.status*/); }
        });
    });
}
function API_DeleteUser(id) {
    return new Promise(resolve => {
        $.ajax({
            url: API_URL + "/" + id,
            type: "DELETE",
            success: () => { currentHttpError = ""; resolve(true); },
            error: (xhr) => { currentHttpError = xhr.responseJSON.error_description; resolve(false /*xhr.status*/); }
        });
    });
}
class API_user
{
static API_URL() { return "http://localhost:5000/api/Accounts" };
static initHttpState() {
    this.currentHttpError = "";
    this.currentStatus = 0;
    this.error = false;
}
static async HEAD() {
    API_user.initHttpState();
    return new Promise(resolve => {
        $.ajax({
            url: this.API_URL(),
            type: 'HEAD',
            contentType: 'text/plain',
            complete: data => { resolve(data.getResponseHeader('ETag')); },
            error: (xhr) => { Posts_API.setHttpErrorState(xhr); resolve(null); }
        });
    });
}


static API_getcurrentHttpError () {
    return currentHttpError; 
}

static API_RegisterUser(user) {
    return new Promise(resolve => {
        $.ajax({
            url: `${this.API_URL()}/register`, 
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify(user),
            success: (response) => {
                resolve(response);
            },
            error: (xhr) => {
                console.error(xhr);
                resolve(null);
            }
        });
    });
}

static API_ModifyUser(data, accessToken = null) {
    return new Promise(resolve => {
        $.ajax({
            url: `${this.API_URL()}/modify`, 
            method: "put",
            contentType: "application/json",
            headers: {
                'authorization': `Bearer ${accessToken}`
            },
            data: JSON.stringify(data),
            success: (response) => {
                resolve(response);
            },
            error: (xhr) => {
                resolve(xhr);
            }
        });
    });
}
    static async  API_LoginUser(loggeduser) {
        return new Promise(resolve => {
            $.ajax({
                url: `${this.API_URL()}/login`, 
                method: "POST",
                contentType: "application/json",
                data: JSON.stringify(loggeduser),
                success: (response) => {
                    if (response) {
                        resolve(response); 
                    } else {
                        resolve(null); 
                    }
                },
                error: (xhr) => {
                    resolve(xhr);  
                }
            });
        });
    }
    
    
static async  API_LogoutUser(loggininfo) {
    return new Promise(resolve => {
        $.ajax({
            url: `${this.API_URL()}/logout`, 
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify(loggininfo),
            success: (response) => {
                resolve(response);
            },
            error: (xhr) => {
                console.error(xhr);
                resolve(null);
            }
        });
    });
}
static async API_verify(id, code) {
    console.log(id);
    const url = `${API_user.API_URL()}/verify`; 
    $.ajax({
        url: url, 
        type: 'GET', 
        data: { id: id, code: code }, 
        success: function(response) {
            resolve(response);
        },
        error: function(xhr) {
            console.error(xhr);
            resolve(null);
        }
    });
}
static async API_GetUserData(userId, accessToken) {
    return new Promise(resolve => {
        let url = this.API_URL();
        if (userId) {
            url += `/${userId}`; 
        }
        $.ajax({
            url: url,
            method: "GET",
            contentType: "application/json",
            headers: {
                'authorization': `Bearer ${accessToken}`
            },
            success: (response) => {
                if (response) {
                    resolve(response); 
                } else {
                    resolve(null);
                }
            },
            error: (xhr) => {
                console.error('Failed to fetch user data:', xhr);
                resolve(null);
            }
        });
    });
}


static async  API_RemoveUser(userId, accessToken) {
    return new Promise((resolve) => {
        $.ajax({
            url: `${this.API_URL()}/remove`,
            method: "GET", 
            contentType: "application/json",
            headers: {
                'authorization': `Bearer ${accessToken}`
            },
            data: { id: userId}, 
            success: (response) => {
                resolve(response);
            },
            error: (xhr) => {
                resolve(xhr);
            }
        });
    });
}
static async API_Promote(userId, accessToken) {
    return new Promise((resolve) => {
        $.ajax({
            url: `${this.API_URL()}/promote`,
            method: "GET", 
            contentType: "application/json",
            headers: {
                'authorization': `Bearer ${accessToken}`
            },
            data: { Id: userId}, 
            success: (response) => {
                if (response) {
                    resolve(response); 
                } else {
                    resolve(null); 
                }
            },
            error: (xhr) => {
                resolve(xhr);  
            }
        });
    });
}
static async API_Block(userId, accessToken) {
    return new Promise((resolve) => {
        $.ajax({
            url: `${this.API_URL()}/block`,
            method: "GET", 
            contentType: "application/json",
            headers: {
                'authorization': `Bearer ${accessToken}`
            },
            data: { Id: userId}, 
            success: (response) => {
                if (response) {
                    resolve(response); 
                } else {
                    resolve(null); 
                }
            },
            error: (xhr) => {
                resolve(xhr);  
            }
        });
    });
}


}
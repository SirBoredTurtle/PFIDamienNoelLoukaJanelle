////// Author: Nicolas Chourot
////// 2024
//////////////////////////////
const periodicRefreshPeriod = 10;
const waitingGifTrigger = 2000;
const minKeywordLenth = 3;
const keywordsOnchangeDelay = 500;

let categories = [];
let selectedCategory = "";
let currentETag = "";
let periodic_Refresh_paused = false;
let timeoutuser_paused = false;
let postsPanel;
let itemLayout;
let waiting = null;
let showKeywords = false;
let keywordsOnchangeTimger = null;
let loggedUser;
let Likes = [];

Init_UI();
async function Init_UI() {
    ResetLoggedUser();
    postsPanel = new PageManager('postsScrollPanel', 'postsPanel', 'postSample', renderPosts);
    $('#createPost').on("click", async function () {
        showCreatePostForm();
    });
    $('loginCmd').on("click", function () {
        showLoginCmdForm();
    });
    $('#abort').on("click", async function () {
        showPosts();
    });
    $('#aboutCmd').on("click", function () {
        showAbout();
    });
    $("#showSearch").on('click', function () {
        toogleShowKeywords();
        showPosts();
    });

    createTimeoutPopup();
    installKeywordsOnkeyupEvent();
    await showPosts();
    start_Periodic_Refresh();

}

/////////////////////////// Search keywords UI //////////////////////////////////////////////////////////

function ResetLoggedUser() {
    const loggedUserData = localStorage.getItem('loggedUser');
    if (loggedUserData) {
        loggedUser = JSON.parse(loggedUserData);
    }
}
function installKeywordsOnkeyupEvent() {
    $("#searchKeys").on('keyup', function () {
        clearTimeout(keywordsOnchangeTimger);
        keywordsOnchangeTimger = setTimeout(() => {
            cleanSearchKeywords();
            showPosts(true);
        }, keywordsOnchangeDelay);
    });
    $("#searchKeys").on('search', function () {
        showPosts(true);
    });
}
function cleanSearchKeywords() {
    /* Keep only keywords of 3 characters or more */
    let keywords = $("#searchKeys").val().trim().split(' ');
    let cleanedKeywords = "";
    keywords.forEach(keyword => {
        if (keyword.length >= minKeywordLenth) cleanedKeywords += keyword + " ";
    });
    $("#searchKeys").val(cleanedKeywords.trim());
}
function showSearchIcon() {
    $("#hiddenIcon").hide();
    $("#showSearch").show();
    if (showKeywords) {
        $("#searchKeys").show();
    }
    else
        $("#searchKeys").hide();
}
function hideSearchIcon() {
    $("#hiddenIcon").show();
    $("#showSearch").hide();
    $("#searchKeys").hide();
}
function toogleShowKeywords() {
    showKeywords = !showKeywords;
    if (showKeywords) {
        $("#searchKeys").show();
        $("#searchKeys").focus();
    }
    else {
        $("#searchKeys").hide();
        showPosts(true);
    }
}

/////////////////////////// Views management ////////////////////////////////////////////////////////////

function intialView() {
    $("#createPost").show();
    $("#hiddenIcon").hide();
    $("#hiddenIcon2").hide();
    $('#menu').show();
    $('#commit').hide();
    $('#abort').hide();
    $('#form').hide();
    $('#form').empty();
    $('#aboutContainer').hide();
    $('#errorContainer').hide();
    showSearchIcon();
}
async function showPosts(reset = false) {
    timeoutuser_paused = false;
    periodic_Refresh_paused = false;

    if (loggedUser != undefined) {
        if(loggedUser.Authorizations.readAccess == -1 && loggedUser.Authorizations.writeAccess == -1)
        {
            Deconnection(true);
        }
        else if (loggedUser.VerifyCode != "verified") {
            showverifyForm();
        }
        else {
            $("#createPost").show();
            intialView();
            $("#viewTitle").text("Fil de nouvelles");
            periodic_Refresh_paused = false;
            await postsPanel.show(reset);
        }
    }
    else {
        intialView();
        $("#createPost").hide();
        $("#viewTitle").text("Fil de nouvelles");
        await postsPanel.show(reset);
    }


}
function hidePosts() {
    postsPanel.hide();
    hideSearchIcon();
    $("#createPost").hide();
    $('#menu').hide();
    periodic_Refresh_paused = true;
}

function showForm() {
    hidePosts();
    $('#form').show();
    $('#commit').show();
    $('#abort').show();
    $('#loginForm').hide();
}

function showverifyForm() {
    showForm();
    $('#commit').hide();
    $('#abort').hide();
    $("#viewTitle").text("Verification");
    renderVerifyForm();
}

function showFormCompte() {
    hidePosts();
    $('#form').show();
    $('#abort').show();
}
function showError(message, details = "") {
    hidePosts();
    $('#form').hide();
    $('#form').empty();
    $("#hiddenIcon").show();
    $("#hiddenIcon2").show();
    $('#commit').hide();
    $('#abort').show();
    $("#viewTitle").text("Erreur du serveur...");
    $("#errorContainer").show();
    $("#errorContainer").empty();
    $("#errorContainer").append($(`<div>${message}</div>`));
    $("#errorContainer").append($(`<div>${details}</div>`));
}

function showCreatePostForm() {
    showForm();
    $("#viewTitle").text("Ajout de nouvelle");
    renderPostForm();
}
function showConCmdForm(blocked = false) {
    showFormCompte();
    if(blocked)
        $("#viewTitle").text("Désolé votre compte est bloqué");
    else
        $("#viewTitle").text("Connexion");
    renderConForm();
}
function showLoginCmdForm() {
    showFormCompte();
    renderRegisterForm();
}
function showEditPostForm(id) {
    showForm();
    $("#viewTitle").text("Modification");
    renderEditPostForm(id);
}
function showDeletePostForm(id) {
    showForm();
    $("#viewTitle").text("Retrait");
    renderDeletePostForm(id);
}
function showAbout() {
    hidePosts();
    $("#hiddenIcon").show();
    $("#hiddenIcon2").show();
    $('#abort').show();
    $("#viewTitle").text("À propos...");
    $("#aboutContainer").show();
}

//////////////////////////// Posts rendering /////////////////////////////////////////////////////////////

//////////////////////////// Posts rendering /////////////////////////////////////////////////////////////

function start_Periodic_Refresh() {
    setInterval(async () => {
        if (!periodic_Refresh_paused) {
            let etag = await Posts_API.HEAD();
            if (currentETag != etag) {
                currentETag = etag;
                await showPosts();
            }
        }
    },
        periodicRefreshPeriod * 1000);
}
let remainingTime
function startDeconnectionTimer() {
    let deconnectionTime = 60;
    let expirationTime = 10;
    let remainingTime = deconnectionTime;
      currentTimeouID = setInterval(async () => {
        if (!timeoutuser_paused) {
            remainingTime--;

            if (remainingTime > expirationTime) {
                $(".popup").hide();
            } else if (remainingTime > 0) {
                if ($("#popUpMessage").length === 0) {
                    createTimeoutPopup();
                }
                $(".popup").show();
                $("#popUpMessage").text("Expiration dans " + remainingTime + " secondes");
                console.log("Message: Expiration dans " + remainingTime + " secondes");
            } else {
                clearTimeout(currentTimeouID);
                $(".popup").hide();
                Deconnection();
            }
        }

    }, 1000);
}


async function renderPosts(queryString) {
    let endOfData = false;
    queryString += "&sort=date,desc";
    compileCategories();
    for (let i = 0; i < Likes.length; i++) {
        Likes[i] = null;
    }
    let responselike = await Likes_API.Get();
    if (!Posts_API.error) {
        let ListLikes = responselike.data;
        if (ListLikes.length > 0) {
            ListLikes.forEach(like => {
                Likes.push(like);
            });
        } else
            endOfData = true;
    } else {
        showError(Posts_API.currentHttpError);
    }
    if (selectedCategory != "") queryString += "&category=" + selectedCategory;
    if (showKeywords) {
        let keys = $("#searchKeys").val().replace(/[ ]/g, ',');
        if (keys !== "")
            queryString += "&keywords=" + $("#searchKeys").val().replace(/[ ]/g, ',')
    }
    addWaitingGif();
    let response = await Posts_API.Get(queryString);
    if (!Posts_API.error) {
        currentETag = response.ETag;
        let Posts = response.data;
        if (Posts.length > 0) {
            Posts.forEach(Post => {
                postsPanel.itemsPanel.append(renderPost(Post));
            });
        } else
            endOfData = true;
        linefeeds_to_Html_br(".postText");
        highlightKeywords();
        attach_Posts_UI_Events_Callback();
    } else {
        showError(Posts_API.currentHttpError);
    }
    removeWaitingGif();
    return endOfData;
}

function AfficherListe(loggedUser) {
    return $(`
        <div>
            <i class="menuIcon fa ${loggedUser.Name} mx-2"></i>
        </div>
    `);
}

function renderPost(post) {

    let date = convertToFrenchDate(UTC_To_Local(post.Date));
    let thispostlikes = [];
    if (Likes.length > 0) {
        Likes.forEach(like => {
            if (like != null) {
                if (like.PostId == post.Id) {
                    thispostlikes.push(like);
                }
            }
        });

    } else
        endOfData = true;
        let crudIcon = "";
        if (loggedUser)
        {
            if(post.UserId == loggedUser.Id || loggedUser.Authorizations.readAccess == 3  ) {
            crudIcon += `
                <span class="editCmd cmdIconSmall fa fa-pencil" postId="${post.Id}" title="Modifier nouvelle"></span>
                <span class="deleteCmd cmdIconSmall fa fa-trash" postId="${post.Id}" title="Effacer nouvelle"></span>
            `;
            }
        }
        let userLike = loggedUser ? thispostlikes.find(like => like.UserId == loggedUser.Id) : null;
        crudIcon += `
            <span class="${userLike ? 'unlikeCmd' : 'likeCmd'} cmdIconSmall fa-${userLike ? 'solid' : 'regular'} fa-thumbs-up" 
                  postId="${post.Id}" 
                  ${userLike ? `data-like-id="${userLike.Id}"` : ""} 
                  title="${userLike ? 'Retirer votre like' : 'Liker nouvelle'}">
            </span>
        `;
        let likesTitle = thispostlikes.map(like => like.Name).join(", ");
        crudIcon += `
            <span postId="${post.Id}" title="${likesTitle}">${thispostlikes.length}</span>
        `;
        
        
    return $(`
        <div class="post" id="${post.Id}">
            <div class="postHeader">
                ${post.Category}
                ${crudIcon}
            </div>
            <div class="postTitle"> ${post.Title} </div>
            <img class="postImage" src='${post.Image}'/>
            <div class="postDate"> ${date} </div>
            <div postId="${post.Id}" class="postTextContainer hideExtra">
                <div class="postText" >${post.Text}</div>
            </div>
            <div class="postfooter">
                <span postId="${post.Id}" class="moreText cmdIconXSmall fa fa-angle-double-down" title="Afficher la suite"></span>
                <span postId="${post.Id}" class="lessText cmdIconXSmall fa fa-angle-double-up" title="Réduire..."></span>
            </div>         
        </div>
    `);
}

async function compileCategories() {
    categories = [];
    let response = await Posts_API.GetQuery("?fields=category&sort=category");
    if (!Posts_API.error) {
        let items = response.data;
        if (items != null) {
            items.forEach(item => {
                if (!categories.includes(item.Category))
                    categories.push(item.Category);
            })
            if (!categories.includes(selectedCategory))
                selectedCategory = "";
            updateDropDownMenu(categories);
        }
    }
}
function updateDropDownMenu() {
    let DDMenu = $("#DDMenu");
    let selectClass = selectedCategory === "" ? "fa-check" : "fa-fw";
    DDMenu.empty();


    if (loggedUser) {
        DDMenu.append($(`
            <div class="dropdown-item userProfile">
                <img class="avatar mx-2" src="${loggedUser.Avatar}" alt="Avatar">
                <span class="userName">${loggedUser.Name}</span>
            </div>
        `));

        if (loggedUser.Authorizations.readAccess == 3 && loggedUser.Authorizations.writeAccess == 3) {
            DDMenu.append($(`
                <div class="dropdown-item menuItemLayout" id="OpenAdminMenu">
                    <i class="menuIcon fa fa-users-gear mx-2"></i> Gestion Usagers
                </div>
            `));
        }
        DDMenu.append($(`
            <div class="dropdown-item menuItemLayout" id="editProfileCmd">
                <i class="menuIcon fa fa-user-edit mx-2"></i> Modifier profile
            </div>
        `));
        DDMenu.append($(`<div class="dropdown-divider"></div>`));
    }

    if (!loggedUser) {
        DDMenu.append($(`
        <div class="dropdown-item" id="ConnectionCmd">
                <i class="menuIcon fa fa-sign-in mx-2"></i> Connexion
        </div>
        `));
    }
    else {
        DDMenu.append($(`
            <div class="dropdown-item" id="DeconnectionCmd">
                    <i class="menuIcon fa fa-sign-in mx-2"></i> Deconnexion
            </div>
            `));
    }

    DDMenu.append($(`<div class="dropdown-divider"></div>`));
    DDMenu.append($(`
        <div class="dropdown-item menuItemLayout" id="allCatCmd">
            <i class="menuIcon fa ${selectClass} mx-2"></i> Toutes les catégories
        </div>
        `));
    DDMenu.append($(`<div class="dropdown-divider"></div>`));
    categories.forEach(category => {
        selectClass = selectedCategory === category ? "fa-check" : "fa-fw";
        DDMenu.append($(`
            <div class="dropdown-item menuItemLayout category" id="allCatCmd">
                <i class="menuIcon fa ${selectClass} mx-2"></i> ${category}
            </div>
        `));
    })
    DDMenu.append($(`<div class="dropdown-divider"></div> `));
    DDMenu.append($(`
        <div class="dropdown-item menuItemLayout" id="aboutCmd">
            <i class="menuIcon fa fa-info-circle mx-2"></i> À propos...
        </div>
        `));
    $('#aboutCmd').on("click", function () {
        showAbout();
    });
    $('#ConnectionCmd').on("click", function () {
        showFormCompte();
        showConCmdForm();
    });
    $('#DeconnectionCmd').on("click", function () {
        Deconnection();
    });
    $('#editProfileCmd').on("click", function () {
        showFormCompte();
        renderRegisterForm(loggedUser);
    });
    $('#OpenAdminMenu').on("click", function () {
        showFormCompte();
        AdminMenu();
    });
    $('#allCatCmd').on("click", async function () {
        selectedCategory = "";
        await showPosts(true);
        updateDropDownMenu();
    });

    $('.category').on("click", async function () {
        selectedCategory = $(this).text().trim();
        await showPosts(true);
        updateDropDownMenu();
    });
}
function attach_Posts_UI_Events_Callback() {
    linefeeds_to_Html_br(".postText");
    // attach icon command click event callback
    $(".editCmd").off();
    $(".editCmd").on("click", function () {
        showEditPostForm($(this).attr("postId"));
    });
    $(".deleteCmd").off();
    $(".deleteCmd").on("click", function () {
        showDeletePostForm($(this).attr("postId"));
    });
    $(".likeCmd").off();
    $(".likeCmd").on("click", async function ()
    {
        let likedata = {};
        likedata.PostId =  $(this).attr("postId");
        likedata.Name = loggedUser.Name;
        likedata.UserId = loggedUser.Id;
        likecmd(likedata);
    });
    $(".unlikeCmd").off();
    $(".unlikeCmd").on("click", async function ()
    {
        let LikeId =  $(this).attr("userLike");
        unlike(LikeId);
    });
    $(".moreText").off();
    $(".moreText").click(function () {
        $(`.commentsPanel[postId=${$(this).attr("postId")}]`).show();
        $(`.lessText[postId=${$(this).attr("postId")}]`).show();
        $(this).hide();
        $(`.postTextContainer[postId=${$(this).attr("postId")}]`).addClass('showExtra');
        $(`.postTextContainer[postId=${$(this).attr("postId")}]`).removeClass('hideExtra');
    })
    $(".lessText").off();
    $(".lessText").click(function () {
        $(`.commentsPanel[postId=${$(this).attr("postId")}]`).hide();
        $(`.moreText[postId=${$(this).attr("postId")}]`).show();
        $(this).hide();
        $(`.postTextContainer[postId=${$(this).attr("postId")}]`).addClass('hideExtra');
        $(`.postTextContainer[postId=${$(this).attr("postId")}]`).removeClass('showExtra');
    })
}
async function likecmd(likedata)
{
    let result = await Likes_API.Save(likedata, true);
}
async function unlike(likedata)
{
    let result = await Likes_API.Save(likedata, true);
}
function addWaitingGif() {
    clearTimeout(waiting);
    waiting = setTimeout(() => {
        postsPanel.itemsPanel.append($("<div id='waitingGif' class='waitingGifcontainer'><img class='waitingGif' src='Loading_icon.gif' /></div>'"));
    }, waitingGifTrigger)
}
function removeWaitingGif() {
    clearTimeout(waiting);
    $("#waitingGif").remove();
}
async function Deconnection(blocked = false) {
    let Deconnection = await API_user.API_LogoutUser(loggedUser);
    if (Deconnection == "") {
        localStorage.removeItem('loggedUser');
        loggedUser = undefined;
        showConCmdForm(blocked);
    }
}
/////////////////////// Posts content manipulation ///////////////////////////////////////////////////////

function linefeeds_to_Html_br(selector) {
    $.each($(selector), function () {
        let postText = $(this);
        var str = postText.html();
        var regex = /[\r\n]/g;
        postText.html(str.replace(regex, "<br>"));
    })
}
function highlight(text, elem) {
    text = text.trim();
    if (text.length >= minKeywordLenth) {
        var innerHTML = elem.innerHTML;
        let startIndex = 0;

        while (startIndex < innerHTML.length) {
            var normalizedHtml = innerHTML.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            var index = normalizedHtml.indexOf(text, startIndex);
            let highLightedText = "";
            if (index >= startIndex) {
                highLightedText = "<span class='highlight'>" + innerHTML.substring(index, index + text.length) + "</span>";
                innerHTML = innerHTML.substring(0, index) + highLightedText + innerHTML.substring(index + text.length);
                startIndex = index + highLightedText.length + 1;
            } else
                startIndex = innerHTML.length + 1;
        }
        elem.innerHTML = innerHTML;
    }
}
function highlightKeywords() {
    if (showKeywords) {
        let keywords = $("#searchKeys").val().split(' ');
        if (keywords.length > 0) {
            keywords.forEach(key => {
                let titles = document.getElementsByClassName('postTitle');
                Array.from(titles).forEach(title => {
                    highlight(key, title);
                })
                let texts = document.getElementsByClassName('postText');
                Array.from(texts).forEach(text => {
                    highlight(key, text);
                })
            })
        }
    }
}

//////////////////////// Forms rendering /////////////////////////////////////////////////////////////////

async function renderVerifyForm() {
    let formHtml = `
        <div class="verifyForm">
            <div class="formHeader">Verification</div>
            <div class="formText">Un Courriel de Verification a ete envoye a votre courriel:</div>
            <input type="text" id="verifyCode" class="formInput" placeholder=Entrer votre code de verification" />
            <button id="verifyButton" class="formButton">Verifier</button>
            <button id="cancelButton" class="formButton">Annuler</button>
        </div>
    `;
    $("#form").append(formHtml);

    $('#verifyButton').on("click", async function () {
        let verifyCode = $("#verifyCode").val().trim();
        if (verifyCode) {
            let response = await API_user.API_verify(loggedUser.Id, verifyCode);
            let loggedUserData = localStorage.getItem('loggedUser');
            if (loggedUserData) {
                loggedUser = JSON.parse(loggedUserData);

                loggedUser.VerifyCode = 'verified';

                localStorage.setItem('loggedUser', JSON.stringify(loggedUser));

                ResetLoggedUser();
                showPosts();
            } else {


            }

        }
    });

    $('#cancelButton').on("click", async function () {
        Deconnection()
    });
}


async function renderEditPostForm(id) {
    $('#commit').show();
    addWaitingGif();
    let response = await Posts_API.Get(id)
    if (!Posts_API.error) {
        let Post = response.data;
        if (Post !== null)
            renderPostForm(Post);
        else
            showError("Post introuvable!");
    } else {
        showError(Posts_API.currentHttpError);
    }
    removeWaitingGif();
}
async function renderDeletePostForm(id) {
    let response = await Posts_API.Get(id)
    if (!Posts_API.error) {
        let post = response.data;
        if (post !== null) {
            let date = convertToFrenchDate(UTC_To_Local(post.Date));
            $("#form").append(`
                <div class="post" id="${post.Id}">
                <div class="postHeader">  ${post.Category} </div>
                <div class="postTitle ellipsis"> ${post.Title} </div>
                <img class="postImage" src='${post.Image}'/>
                <div class="postDate"> ${date} </div>
                <div class="postTextContainer showExtra">
                    <div class="postText">${post.Text}</div>
                </div>
            `);
            linefeeds_to_Html_br(".postText");
            $('#commit').on("click", async function () {
                await Posts_API.Delete(post.Id);
                if (!Posts_API.error) {
                    await showPosts();
                }
                else {
                    console.log(Posts_API.currentHttpError)
                    showError("Une erreur est survenue!");
                }
            });
            $('#cancel').on("click", async function () {
                await showPosts();
            });

        } else {
            showError("Post introuvable!");
        }
    } else
        showError(Posts_API.currentHttpError);
}
function newUser() {
    user = {};
    user.Id = 0;
    user.Name = "";
    user.Password = "";
    user.Email = "";
    return user;
}
function renderConForm() {
    $("#form").show();
    $("#form").empty();
    $("#form").append(`
        <form class="form" id="loginForm">
            <div class='containerLog'>
                <label for="Email" class="form-label">Courriel</label>
                <input 
                    class="form-control Email"
                    name="Email"
                    id="Email"
                    placeholder="Courriel"
                    required
                    value="${loggedUser ? loggedUser.Email : ''}" 
                    RequireMessage="Veuillez entrer votre courriel" 
                />
            </div>

            <div class='containerLog'>
                <label for="Password" class="form-label">Mot de passe</label>
                <input
                    class="form-control Alpha"
                    name="Password"
                    id="Password"
                    placeholder="Mot de passe"
                    type="password"  <!-- Hide password text -->
                
            </div>

            <input type="submit" value="Se connecter" id="loginUser" class="btn btn-primary">
            <div class="dropdown-divider"></div>
            <input type="button" value="Inscription" id="registerButton" class="btn btn-secondary">
        </form>
    `);


    initFormValidation();

    $('#registerButton').on("click", async function () {
        await renderRegisterForm();
    });

    $('#loginForm').on("submit", async function (event) {
        event.preventDefault();
        let loginInfo = getFormData($("#loginForm"));
        let result = await API_user.API_LoginUser(loginInfo);
        if (result && result.User) {
            loggedUser = result;
            const userToSave = {
                Id: loggedUser.User.Id,
                AccessToken: loggedUser.Access_token,
                Name: loggedUser.User.Name,
                Password: loginInfo.Password,
                Email: loggedUser.User.Email,
                Avatar: loggedUser.User.Avatar,
                VerifyCode: loggedUser.User.VerifyCode,
                Authorizations: loggedUser.User.Authorizations,
                Created: loggedUser.User.Created,
                isAdmin: loggedUser.User.isAdmin,
                isBlocked: loggedUser.User.isBlocked
            };
            localStorage.setItem('loggedUser', JSON.stringify(userToSave));
            let loggedUserData = localStorage.getItem('loggedUser');
            if (loggedUserData) {
                loggedUser = JSON.parse(loggedUserData);
            }

            ResetLoggedUser();
            showPosts();
            startDeconnectionTimer();
        } else {
            showError("Identifiants incorrects. Veuillez vérifier votre email et mot de passe.");
        }
    });
}
async function AdminMenu() {
    try {
        const data = await API_user.API_GetUserData("", loggedUser.AccessToken);
        if (data) {
            console.log('Fetched user data:', data);
            displayUserList(data);
        } else {
            showError("Impossible de récupérer les données utilisateur.");
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
        showError("Impossible de récupérer les données utilisateur.");
    }
}

function displayUserList(users) {
    timeoutuser_paused = true;
    $("#form").empty();

    $("#viewTitle").text("Gestion d'usagers");


    const filteredUsers = users.filter(user => user.Id !== loggedUser.Id);

    filteredUsers.forEach(user => {
        let promoteButton = "";
        let banButtonLabel = "Bloquer";
        if (user.Authorizations.readAccess === -1 && user.Authorizations.writeAccess === -1) {
            banButtonLabel = "Debloquer";
        } else
            if (user.Authorizations.readAccess === 1 && user.Authorizations.writeAccess === 1) {
                promoteButton = "<button class=\"user-button\" data-user-id=" + user.Id + ">Utilisateur</button>";
            } else if (user.Authorizations.readAccess === 2 && user.Authorizations.writeAccess === 2) {
                promoteButton = "<button class=\"user-button\" data-user-id=" + user.Id + ">Super Sutilisateur</button>";
            } else if (user.Authorizations.readAccess === 3 && user.Authorizations.writeAccess === 3) {
                promoteButton = "<button class=\"user-button\" data-user-id=" + user.Id + ">Admin</button>";
            }

        const userRow = `
            <div class="user-row">
                <img src="${user.Avatar || 'default-avatar.jpg'}" alt="${user.Name}'s avatar" class="avatar" />
                <a class="edituser" data-user-id="${user.Id}">${user.Name}</a>
                <div class="buttons-container">
                ${promoteButton}
                <button class="block-button" data-user-id="${user.Id}">${banButtonLabel}</button>
                <button class="delete-button" data-user-id="${user.Id}">Supprimer</button>
                </div>
            </div>
        `;

        $("#form").append(userRow);
    });

    $(".edituser").on("click", function ()
    {
        event.preventDefault();
        const userId = $(this).data("user-id");
        handleEditAction(userId)
    })  
    $(".delete-button").on("click", function () {
        const userId = $(this).data("user-id");
        handleDeleteAction(userId);
    });

    $(".delete-button").on("click", function () {
        const userId = $(this).data("user-id");
        handleDeleteAction(userId);
    });

    $(".user-name").on("click", function (event) {
        event.preventDefault();
        const userId = $(this).data("user-id");
        handleUserAction(userId);
    });

    $(".user-button").on("click", function () {
        const userId = $(this).data("user-id");
        handlePromoteAction(userId);
    });
    $(".block-button").on("click", function () {
        const userId = $(this).data("user-id");
        handleBlockAction(userId);
    });
}


async function handleEditAction(userId)
{
    let result = await API_user.API_GetUserData(userId, loggedUser.AccessToken);
    showFormCompte();
    renderRegisterForm(result);

}
async function handlePromoteAction(userId) {
    let result = await API_user.API_Promote(userId, loggedUser.AccessToken)
    showFormCompte();
    AdminMenu();
}


async function handleBlockAction(userId) {
    let result = await API_user.API_Block(userId, loggedUser.AccessToken)
    showFormCompte();
    AdminMenu();
}

async function handleDeleteAction(userId) {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce compte?")) {
        try {
            let result = await API_user.API_RemoveUser(userId, loggedUser.AccessToken);
            showFormCompte();
            AdminMenu();
            if (result) {
            } else {
                showError("Impossible de supprimer le compte.");
            }
        } catch (error) {
            showError("Une erreur s'est produite lors de la suppression.");
        }
    }
}




function renderRegisterForm(user = null, admin = false) {
    timeoutuser_paused = true;
    let create = user == null;
    if (create) {
        user = {
            Id: "",
            Created: "",
            VerifyCode: "",
            Authorizations: "",
            Email: "",
            Name: "",
            Avatar: "no-avatar.png",
            isAdmin: false,
            isBlocked: false,
            AccessToken: ""
        };
    }

    $("#viewTitle").text(create ? "Inscription" : "Modification");
    $("#form").show();
    $("#form").empty();
    $("#form").append(`
        <form class="form" id="userForm">
            <!-- Hidden inputs for user data -->
            <input type="hidden" name="Id" value="${user.Id || ""}"/>
            <input type="hidden" name="AccessToken" value="${user.AccessToken || ""}"/>
            <input type="hidden" name="Created" value="${user.Created || ""}"/>
            <input type="hidden" name="VerifyCode" value="${user.VerifyCode || ""}"/>
            <input type="hidden" name="Authorizations" value="${user.Authorizations || ""}"/>
            <input type="hidden" name="isAdmin" value="${user.isAdmin || false}"/>
            <input type="hidden" name="isBlocked" value="${user.isBlocked || false}"/>

            <div class='containerLog'>
                <label for="Email" class="form-label"> Courriel </label>
                <input 
                    class="form-control Email"
                    name="Email"
                    id="Email"
                    placeholder="Courriel"
                    required
                    value="${user.Email || ""}"
                />
                <input 
                    class="form-control Email"
                    name="EmailVerification"
                    id="EmailVerification"
                    placeholder="Vérification"
                    value="${user.Email || ""}"
                    required
                />
            </div>

            <div class='containerLog'>
                <label for="Password" class="form-label"> Mot de passe </label>
                <input
                    class="form-control Alpha"
                    name="Password"
                    id="Password"
                    placeholder="Mot de passe"
                    type="password"
                    value=""
                />
                <input
                    class="form-control Alpha"
                    name="PasswordVerification"
                    id="PasswordVerification"
                    placeholder="Vérification"
                    type="password"
                    value=""
                />
            </div>

            <div class='containerLog'>
                <label for="Name" class="form-label">Nom </label>
                <input 
                    class="form-control Alpha"
                    name="Name" 
                    id="Name" 
                    placeholder="Nom"
                    value="${user.Name || ""}"
                />
            </div>

            <label class="form-label">Avatar </label>
            <div class='imageUploader' 
                 newImage='${create}' 
                 controlId='Avatar' 
                 imageSrc='${user.Avatar || "no-avatar.png"}' 
                 waitingImage="Loading_icon.gif">
            </div>
            <hr>
            <input type="submit" value="Enregistrer" id="saveUser" class="btn btn-primary">
            ${!create ? `<input type="button" value="Supprimer le compte" id="deleteAccount" class="btn btn-danger">` : ""}
        </form>
    `);
    initImageUploaders();
    initFormValidation();
    $('#userForm').on("submit", async function (event) {
        event.preventDefault();
        let user = getFormData($("#userForm"));
        if (user.Email !== user.EmailVerification) {
            showError("Les emails ne correspondent pas.");
            return;
        }
        if (user.Password !== user.PasswordVerification) {
            showError("Les mots de passe ne correspondent pas.");
            return;
        }
        delete user.EmailVerification;
        delete user.PasswordVerification;

        let result = create ? await API_user.API_RegisterUser(user) : await API_user.API_ModifyUser(user, loggedUser.AccessToken);
        if (result) {
            Deconnection();
            showPosts();
        } else {
            showError("Une erreur est survenue! " + API_getcurrentHttpError());
        }
    });

    if (!create) {
        $('#deleteAccount').on("click", async function () {
            if (confirm("Êtes-vous sûr de vouloir supprimer votre compte?")) {
                let result = await API_user.API_RemoveUser(loggedUser.Id, loggedUser.AccessToken);
                Deconnection();

                if (result) {
                } else {
                    showError("Impossible de supprimer le compte.");
                }
            }
        });
    }
}
function newPost() {
    let Post = {};
    Post.Id = 0;
    Post.Title = "";
    Post.Text = "";
    Post.Image = "news-logo-upload.png";
    Post.Category = "";
    return Post;
}
function renderPostForm(post = null) {
    timeoutuser_paused = true;
    let create = post == null;
    if (create) post = newPost();
    $("#form").show();
    $("#form").empty();
    $("#form").append(`
        <form class="form" id="postForm">
            <input type="hidden" name="Id" value="${post.Id}"/>
            <input type="hidden" name="UserId" value="${loggedUser.Id}"/>

             <input type="hidden" name="Date" value="${post.Date}"/>
            <label for="Category" class="form-label">Catégorie </label>
            <input 
                class="form-control"
                name="Category"
                id="Category"
                placeholder="Catégorie"
                required
                value="${post.Category}"
            />
            <label for="Title" class="form-label">Titre </label>
            <input 
                class="form-control"
                name="Title" 
                id="Title" 
                placeholder="Titre"
                required
                RequireMessage="Veuillez entrer un titre"
                InvalidMessage="Le titre comporte un caractère illégal"
                value="${post.Title}"
            />
            <label for="Url" class="form-label">Texte</label>
             <textarea class="form-control" 
                          name="Text" 
                          id="Text"
                          placeholder="Texte" 
                          rows="9"
                          required 
                          RequireMessage = 'Veuillez entrer une Description'>${post.Text}</textarea>

            <label class="form-label">Image </label>
            <div class='imageUploaderContainer'>
                <div class='imageUploader' 
                     newImage='${create}' 
                     controlId='Image' 
                     imageSrc='${post.Image}' 
                     waitingImage="Loading_icon.gif">
                </div>
            </div>
            <div id="keepDateControl">
                <input type="checkbox" name="keepDate" id="keepDate" class="checkbox" checked>
                <label for="keepDate"> Conserver la date de création </label>
            </div>
            <input type="submit" value="Enregistrer" id="savePost" class="btn btn-primary displayNone">
        </form>
    `);
    if (create) $("#keepDateControl").hide();

    initImageUploaders();
    initFormValidation();

    $("#commit").click(function () {
        $("#commit").off();
        return $('#savePost').trigger("click");
    });
    $('#postForm').on("submit", async function (event) {
        event.preventDefault();
        let post = getFormData($("#postForm"));
        if (post.Category != selectedCategory)
            selectedCategory = "";
        if (create || !('keepDate' in post))
            post.Date = Local_to_UTC(Date.now());
        delete post.keepDate;
        post.UserId = loggedUser.Id;
        post = await Posts_API.Save(post, create);
        if (!Posts_API.error) {
            await showPosts();
            postsPanel.scrollToElem(post.Id);
        }
        else
            showError("Une erreur est survenue! ", Posts_API.currentHttpError);
    });
    $('#cancel').on("click", async function () {
        await showPosts();
    });
}
function getFormData($form) {
    const removeTag = new RegExp("(<[a-zA-Z0-9]+>)|(</[a-zA-Z0-9]+>)", "g");
    var jsonObject = {};
    $.each($form.serializeArray(), (index, control) => {
        jsonObject[control.name] = control.value.replace(removeTag, "");
    });
    return jsonObject;
}

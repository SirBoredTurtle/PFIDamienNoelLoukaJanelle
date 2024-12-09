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
let postsPanel;
let itemLayout;
let waiting = null;
let showKeywords = false;
let keywordsOnchangeTimger = null;
let loggedUser;
let access_token;
let Likes = [];

Init_UI();
async function Init_UI() {
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

    


    installKeywordsOnkeyupEvent();
    await showPosts();
    start_Periodic_Refresh();
}

/////////////////////////// Search keywords UI //////////////////////////////////////////////////////////

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
    intialView();
    $("#viewTitle").text("Fil de nouvelles");
    periodic_Refresh_paused = false;
    await postsPanel.show(reset);
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
function showConCmdForm() {
    showFormCompte();
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
async function renderPosts(queryString) {
    let endOfData = false;
    queryString += "&sort=date,desc";
    compileCategories();
    for (let i = 0; i < Likes.length; i++) {
        Likes[i] = null;
    }
    let responselike = await Likes_API.Get();
    if (!Posts_API.error) {
        currentETag = responselike.ETag;
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
function renderPost(post, loggedUser) {

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
    let crudIcon =
        `
        <span class="editCmd cmdIconSmall fa fa-pencil" postId="${post.Id}" title="Modifier nouvelle"></span>
        <span class="deleteCmd cmdIconSmall fa fa-trash" postId="${post.Id}" title="Effacer nouvelle"></span>
        <span class="likeCmd cmdIconSmall fa-regular fa-thumbs-up" postId="${post.Id}" title="Liker nouvelle"></span>
        <span postId="${post.Id}">${thispostlikes.length}</span>
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
                <img class="avatar mx-2" src="${loggedUser.User.Avatar}" alt="Avatar">
                <span class="userName">${loggedUser.User.Name}</span>
            </div>
        `));
        DDMenu.append($(`<div class="dropdown-divider"></div>`)); 

        DDMenu.append($(`
            <div class="dropdown-item menuItemLayout" id="editProfileCmd">
                <i class="menuIcon fa fa-user-edit mx-2"></i> Modifier profile
            </div>
        `));
        DDMenu.append($(`<div class="dropdown-divider"></div>`));
    }

    if(!loggedUser)
    {
    DDMenu.append($(`
        <div class="dropdown-item" id="ConnectionCmd">
                <i class="menuIcon fa fa-sign-in mx-2"></i> Connexion
        </div>
        `));
    }
    else
    {
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
async function Deconnection()
{
    let Deconnection = await API_LogoutUser(loggedUser);
    if(Deconnection == "")
    {
        loggedUser = undefined;
        showPosts();
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
            <div class="formText">A verification code has been sent to your email. Please enter it below:</div>
            <input type="text" id="verifyCode" class="formInput" placeholder="Enter Verification Code" />
            <button id="verifyButton" class="formButton">Verify</button>
            <button id="cancelButton" class="formButton">Cancel</button>
        </div>
    `;
    $("#form").append(formHtml);

    $('#verifyButton').on("click", async function () {
        let verifyCode = $("#verifyCode").val().trim();
        if (verifyCode) {
            let response = await API_verify(loggedUser.User.Id, verifyCode);
            if (response) {
                showPosts()
            } 
        } else {
            showError("Please enter a valid verification code.");
        }
    });

    $('#cancelButton').on("click", async function () {
        showPosts(); // Assuming you want to return to the list of posts
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
            // attach form buttons click event callback
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
    $("#viewTitle").text("Connexion");
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
        let result = await API_LoginUser(loginInfo);            
        if (result && result.User) {
            loggedUser = result;

            if (result.Token) {
                localStorage.setItem('authToken', result.Token);
            }

            if(loggedUser.User.VerifyCode != "verified") {
                showverifyForm();
            } else {
                showPosts();
            }
        } else {
            RenderError("Identifiants incorrects. Veuillez vérifier votre email et mot de passe.");
        }
    });
    
    
}

function renderRegisterForm(user = null) {
    let create = user == null;
    if (create) {
        user = newUser();
        user.Avatar = "no-avatar.png";
    }
    $("#viewTitle").text(create ? "Inscription" : "Modification");
    $("#form").show();
    $("#form").empty();
    $("#form").append(`
        <form class="form" id="userForm">
            <input type="hidden" name="Id" value="${user.User.Id}"/>
            <input type="hidden" name="AccessToken" value="${user.Access_token}"/>
            <input type="hidden" name="Created" value="${user.User.Created}"/>
            <input type="hidden" name="VerifyCode" value="${user.User.VerifyCode}"/>
            <input type="hidden" name="Authorizations" value="${user.User.Authorizations}"/>
    
            <div class='containerLog'>
                <label for="Email" class="form-label"> Courriel </label>
                <input 
                    class="form-control Email"
                    name="Email"
                    id="Email"
                    placeholder="Courriel"
                    required
                    value="${user.User.Email}"
                />
                <input 
                    class="form-control Email"
                    name="EmailVerification"
                    id="EmailVerification"
                    placeholder="Vérification"
                    value="${user.User.Email}"
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
                    value="${user.User.Name}"
                />
            </div>
    
            <label class="form-label">Avatar </label>
            <div class='imageUploader' 
                 newImage='${create}' 
                 controlId='Avatar' 
                 imageSrc='${user.User.Avatar}' 
                 waitingImage="Loading_icon.gif">
            </div>
            <hr>
            <input type="submit" value="Enregistrer" id="saveUser" class="btn btn-primary">
            <input type="button" value="Supprimer le compte" id="deleteAccount" class="btn btn-danger">
        </form>
    `);
    initImageUploaders();
    initFormValidation();
    
    $('#userForm').on("submit", async function (event) {
        event.preventDefault();
        let user = getFormData($("#userForm"));
        if (user.Email !== user.EmailVerification) {
            renderError("Les emails ne correspondent pas.");
            return;
        }
        if (user.Password !== user.PasswordVerification) {
            renderError("Les mots de passe ne correspondent pas.");
            return;
        }
        delete user.EmailVerification;
        delete user.PasswordVerification;
    
        let result = create ? await API_RegisterUser(user) : await API_ModifyUser(user);
        console.log(result);

        if (result) {
            renderPosts();
        } else {
            renderError("Une erreur est survenue! " + API_getcurrentHttpError());
        }
    });
    
    $('#deleteAccount').on("click", async function () {
        if (confirm("Êtes-vous sûr de vouloir supprimer votre compte?")) {
            let result = await API_DeleteUser(user.User.Id, user.Access_token);
            if (result) {
                showPosts()
            } else {
                renderError("Impossible de supprimer le compte.");
            }
        }
    });  
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
    let create = post == null;
    if (create) post = newPost();
    $("#form").show();
    $("#form").empty();
    $("#form").append(`
        <form class="form" id="postForm">
            <input type="hidden" name="Id" value="${post.Id}"/>
            <input type="hidden" name="Id" value="${loggedUser.User.Id}"/>

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
    initFormValidation(); // important do to after all html injection!

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
    // prevent html injections
    const removeTag = new RegExp("(<[a-zA-Z0-9]+>)|(</[a-zA-Z0-9]+>)", "g");
    var jsonObject = {};
    // grab data from all controls
    $.each($form.serializeArray(), (index, control) => {
        jsonObject[control.name] = control.value.replace(removeTag, "");
    });
    return jsonObject;
}

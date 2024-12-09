import UserModel from '../models/user.js';
import Repository from '../models/repository.js';
import TokenManager from '../tokensManager.js';
import * as utilities from "../utilities.js";
import Gmail from "../gmail.js";
import Controller from './Controller.js';
import AccessControl from '../accessControl.js';

export default class AccountsController extends Controller {
    constructor(HttpContext) {
        super(HttpContext, new Repository(new UserModel()), AccessControl.admin());
    }
    index(id) {
        if (id != '') {
            if (AccessControl.readGranted(this.HttpContext.authorizations, AccessControl.admin()))
                this.HttpContext.response.JSON(this.repository.get(id));
            else
                this.HttpContext.response.unAuthorized("Unauthorized access");
        }
        else {
            if (AccessControl.granted(this.HttpContext.authorizations, AccessControl.admin()))
                this.HttpContext.response.JSON(this.repository.getAll(this.HttpContext.path.params), this.repository.ETag, false, AccessControl.admin());
            else
                this.HttpContext.response.unAuthorized("Unauthorized access");
        }
    }
    // POST: /token body payload[{"Email": "...", "Password": "..."}]
    login(loginInfo) {
        if (loginInfo) {
            if (this.repository != null) {
                let user = this.repository.findByField("Email", loginInfo.Email);
                if (user != null) {
                    if (user.Password == loginInfo.Password) {
                        user = this.repository.get(user.Id);
                        let newToken = TokenManager.create(user);
                        this.HttpContext.response.created(newToken);
                    } else {
                        this.HttpContext.response.wrongPassword("Wrong password.");
                    }
                } else
                    this.HttpContext.response.userNotFound("This user email is not found.");
            } else
                this.HttpContext.response.notImplemented();
        } else
            this.HttpContext.response.badRequest("Credential Email and password are missing.");
    }
    logout() {
        let userId = this.HttpContext.payload.Id;
        if (userId) {
            TokenManager.logout(userId);
            this.HttpContext.response.ok();
        } else {
            this.HttpContext.response.badRequest("UserId is not specified.")
        }
    }
    sendVerificationEmail(user) {
        // bypass model bindeExtraData wich hide the user verifyCode
        let html = `
                Bonjour ${user.Name}, <br /> <br />
                Voici votre code pour confirmer votre adresse de courriel
                <br />
                <h3>${user.VerifyCode}</h3>
            `;
        const gmail = new Gmail();
        gmail.send(user.Email, 'Vérification de courriel...', html);
    }

    sendConfirmedEmail(user) {
        let html = `
                Bonjour ${user.Name}, <br /> <br />
                Votre courriel a été confirmé.
            `;
        const gmail = new Gmail();
        gmail.send(user.Email, 'Courriel confirmé...', html);
    }

    //GET : /accounts/verify?id=...&code=.....
    verify() {
        if (this.repository != null) {
            let id = this.HttpContext.path.params.id;
            let code = parseInt(this.HttpContext.path.params.code);
            let userFound = this.repository.findByField('Id', id);
            if (userFound) {
                if (userFound.VerifyCode == code) {
                    userFound.VerifyCode = "verified";
                    this.repository.update(userFound.Id, userFound);
                    if (this.repository.model.state.isValid) {
                        userFound = this.repository.get(userFound.Id); 
                        this.HttpContext.response.JSON(userFound);
                        this.sendConfirmedEmail(userFound);
                    } else {
                        this.HttpContext.response.unprocessable();
                    }
                } else {
                    this.HttpContext.response.unverifiedUser("Verification code does not matched.");
                }
            } else {
                this.HttpContext.response.unprocessable();
            }
        } else
            this.HttpContext.response.notImplemented();
    }
    //GET : /accounts/conflict?Id=...&Email=.....
    conflict() {
        if (this.repository != null) {
            let id = this.HttpContext.path.params.Id;
            let email = this.HttpContext.path.params.Email;
            if (id && email) {
                let prototype = { Id: id, Email: email };
                this.HttpContext.response.JSON(this.repository.checkConflict(prototype));
            } else
                this.HttpContext.response.JSON(false);
        } else
            this.HttpContext.response.JSON(false);
    }

    // POST: account/register body payload[{"Id": 0, "Name": "...", "Email": "...", "Password": "..."}]
    register(user) {
        if (this.repository != null) {
            user.Created = utilities.nowInSeconds();
            let verifyCode = utilities.makeVerifyCode(6);
            user.VerifyCode = verifyCode;
            user.Authorizations = AccessControl.user();
            let newUser = this.repository.add(user);
            if (this.repository.model.state.isValid) {
                this.HttpContext.response.created(newUser);
                newUser.Verifycode = verifyCode;
                this.sendVerificationEmail(newUser);
            } else {
                if (this.repository.model.state.inConflict)
                    this.HttpContext.response.conflict(this.repository.model.state.errors);
                else
                    this.HttpContext.response.badRequest(this.repository.model.state.errors);
            }
        } else
            this.HttpContext.response.notImplemented();
    }
    promote(user) {
        if (this.repository != null) {
            let foundUser = this.repository.findByField("Id", user.Id);
            foundUser.Authorizations.readAccess++;
            if (foundUser.Authorizations.readAccess > 3) foundUser.Authorizations.readAccess = 1;
            foundUser.Authorizations.writeAccess++;
            if (foundUser.Authorizations.writeAccess > 3) foundUser.Authorizations.writeAccess = 1;
            let updatedUser = this.repository.update(user.Id, foundUser);
            if (this.repository.model.state.isValid)
                this.HttpContext.response.JSON(updatedUser);
            else
                this.HttpContext.response.badRequest(this.repository.model.state.errors);
        } else
            this.HttpContext.response.notImplemented();
    }
    block(user) {
        if (this.repository != null) {
            let foundUser = this.repository.findByField("Id", user.Id);
            foundUser.Authorizations.readAccess = foundUser.Authorizations.readAccess == 1 ? -1 : 1;
            foundUser.Authorizations.writeAccess = foundUser.Authorizations.writeAccess == 1 ? -1 : 1;
            let updatedUser = this.repository.update(user.Id, foundUser);
            if (this.repository.model.state.isValid)
                this.HttpContext.response.JSON(updatedUser);
            else
                this.HttpContext.response.badRequest(this.repository.model.state.errors);
        } else
            this.HttpContext.response.notImplemented();
    }


    // PUT:account/modify body payload[{"Id": 0, "Name": "...", "Email": "...", "Password": "..."}]
    modify(user) {
        if (AccessControl.writeGranted(this.HttpContext.authorizations, AccessControl.user())) {
            if (this.repository != null) {
                let existingUser = this.repository.findByField("Id", user.Id);
                if (existingUser != null) {
                    const updatedUser = {
                        Id: existingUser.Id, 
                        Authorizations: existingUser.Authorizations, 
                        Created: existingUser.Created,
                        Email: existingUser.Email, 
                        VerifyCode: existingUser.VerifyCode,
                        Password: existingUser.Password,
                        Name: existingUser.Name, 
                        Avatar: existingUser.Avatar
                    };
    
                    if (user.Email && user.Email !== existingUser.Email) {
                        updatedUser.Email = user.Email;
                        updatedUser.VerifyCode = utilities.makeVerifyCode(6);
                        this.sendVerificationEmail({ ...updatedUser, VerifyCode: updatedUser.VerifyCode });
                    }
    
                    if (user.Password) updatedUser.Password = user.Password;
                    if (user.Name) updatedUser.Name = user.Name;
                    if (user.Avatar) updatedUser.Avatar = user.Avatar;
    
                    delete updatedUser.AccessToken;
    
                    this.repository.update(user.Id, updatedUser);
    
                    let result = this.repository.get(user.Id);
                    if (this.repository.model.state.isValid) {
                        delete result.AccessToken; 
                        this.HttpContext.response.JSON(result, this.repository.ETag);
                    } else {
                        this.HttpContext.response.badRequest(this.repository.model.state.errors);
                    }
                } else {
                    this.HttpContext.response.notFound("User not found.");
                }
            } else {
                this.HttpContext.response.notImplemented();
            }
        } else {
            this.HttpContext.response.unAuthorized("Unauthorized access.");
        }
    }
    
    
    // GET:account/remove/id
    remove(id) { // warning! this is not an API endpoint 
        // todo make sure that the requester has legitimity to delete ethier itself or its an admin
        if (AccessControl.writeGrantedAdminOrOwner(this.HttpContext.authorizations, this.requiredAuthorizations, id)) {
            // todo
        }
    }
}

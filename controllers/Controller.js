import AccessControl from '../accessControl.js';
import TokensManager from '../tokensManager.js';

export default class Controller {
    constructor(HttpContext, repository = null, requiredAuthorizations = null) {
        this.requiredAuthorizations = requiredAuthorizations ? requiredAuthorizations : AccessControl.anonymous();
        this.HttpContext = HttpContext;
        this.repository = repository;
    }
    head() {
        if (AccessControl.readGranted(this.HttpContext.authoriations, this.requiredAuthorizations)) {
            if (this.repository != null) {
                this.HttpContext.response.ETag(this.repository.ETag);
            } else
                this.HttpContext.response.notImplemented();
        } else
            this.HttpContext.response.unAuthorized("Unauthorized access");
    }
    get(id) {
        const route = this.HttpContext.path.id;
        if (route === "verify") {
            const requiredAuthorization = AccessControl.anonymous();
            if (AccessControl.writeGranted(this.HttpContext.authorizations, requiredAuthorization)) {
                this.verify();
            } else {
                this.HttpContext.response.unAuthorized("Unauthorized access");
            }
        }
        else if (route === "remove") {
            this.remove(id);
        }
        else if (route === "promote") {
            this.promote(this.HttpContext);
        }
        else if (route === "block") {
            this.block(this.HttpContext);

        }
        else if
            (AccessControl.readGranted(this.HttpContext.authorizations, this.requiredAuthorizations)) {
            if (this.repository != null) {
                if (id !== '') {
                    let data = this.repository.get(id);
                    if (data != null)
                        this.HttpContext.response.JSON(data);
                    else
                        this.HttpContext.response.notFound("Ressource not found.");
                } else {
                    let data = this.repository.getAll(this.HttpContext.path.params);
                    if (this.repository.valid())
                        this.HttpContext.response.JSON(data, this.repository.ETag, false, this.requiredAuthorizations);
                    else
                        this.HttpContext.response.badRequest(this.repository.errorMessages);
                }
            } else
                this.HttpContext.response.notImplemented();
        } else
            this.HttpContext.response.unAuthorized("Unauthorized access");
    }


    post(data) {
        const route = this.HttpContext.path.id;
        if (route === "register") {
            const requiredAuthorization = AccessControl.anonymous();
            if (AccessControl.writeGranted(this.HttpContext.authorizations, requiredAuthorization)) {
                this.register(data);
            } else {
                this.HttpContext.response.unAuthorized("Unauthorized access");
            }
        } else if (route === "login") {
            const requiredAuthorization = AccessControl.anonymous();
            if (AccessControl.writeGranted(this.HttpContext.authorizations, requiredAuthorization)) {
                this.login(data);
            } else {
                this.HttpContext.response.unAuthorized("Unauthorized access");
            }
        } else if (route === "logout") {
            const requiredAuthorization = AccessControl.anonymous();
            if (AccessControl.writeGranted(this.HttpContext.authorizations, requiredAuthorization)) {
                this.logout(data.Id);
            } else {
                this.HttpContext.response.unAuthorized("Unauthorized access");
            }
        }
        else {
            if (AccessControl.writeGranted(this.HttpContext.authorizations, this.requiredAuthorizations)) {
                data = this.repository.add(data);
                if (this.repository.model.state.isValid) {
                    this.HttpContext.response.created(data);
                } else {
                    if (this.repository.model.state.inConflict)
                        this.HttpContext.response.conflict(this.repository.model.state.errors);
                    else
                        this.HttpContext.response.badRequest(this.repository.model.state.errors);
                }
            } else
                this.HttpContext.response.unAuthorized("Unauthorized access");
        }
    }


    put(data) {
        if (this.HttpContext.user != null) {
            if (this.HttpContext.user.Id == data.Id || this.HttpContext.user.Authorizations.writeAccess == 3) {
                if (this.HttpContext.path.id == "modify") {
                    this.modify(data);
                }
                else if (this.repository.model.state.isValid) {
                    this.HttpContext.response.accepted(data);
                } else {
                    if (this.repository.model.state.notFound) {
                        this.HttpContext.response.notFound(this.repository.model.state.errors);
                    } else {
                        if (this.repository.model.state.inConflict)
                            this.HttpContext.response.conflict(this.repository.model.state.errors)
                        else
                            this.HttpContext.response.badRequest(this.repository.model.state.errors);
                    }
                }
            }
        }
        else if (AccessControl.writeGranted(this.HttpContext.authorizations, this.requiredAuthorizations)) {
            if (this.HttpContext.path.id !== '') {
                data = this.repository.update(this.HttpContext.path.id, data);
                if (this.repository.model.state.isValid) {
                    this.HttpContext.response.accepted(data);
                } else {
                    if (this.repository.model.state.notFound) {
                        this.HttpContext.response.notFound(this.repository.model.state.errors);
                    } else {
                        if (this.repository.model.state.inConflict)
                            this.HttpContext.response.conflict(this.repository.model.state.errors)
                        else
                            this.HttpContext.response.badRequest(this.repository.model.state.errors);
                    }
                }
            } else
                this.HttpContext.response.badRequest("The Id of ressource is not specified in the request url.");
        }
    }
    remove(id) {
        if (AccessControl.writeGranted(this.HttpContext.authorizations, this.requiredAuthorizations)) {
            if (this.HttpContext.path.id !== '') {
                if (this.repository.remove(id))
                    this.HttpContext.response.accepted();
                else
                    this.HttpContext.response.notFound("Ressource not found.");
            } else
                this.HttpContext.response.badRequest("The Id in the request url is  not specified.");
        } else
            this.HttpContext.response.unAuthorized("Unauthorized access");
    }
}

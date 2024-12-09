
export default class AccessControl {
    // 0 anonymous, 1 user, 2 admin
    static anonymous() {
        return { readAccess: 0, writeAccess: 0 };
    }
    static userReadOnly() {
        return { readAccess: 1, writeAccess: 0 };
    }
    static user() {
        return { readAccess: 1, writeAccess: 1 };
    }
    static superUser() {
        return { readAccess: 2, writeAccess: 2 };
    }
    static admin() {
        return { readAccess: 3, writeAccess: 3 };
    }
    static granted(authorizations, requiredAccess) {
        if (requiredAccess) {
            if (requiredAccess.readAccess == 0 && requiredAccess.writeAccess == 0) return true;
            if (authorizations)
                return (authorizations.readAccess >= requiredAccess.readAccess &&
                    authorizations.writeAccess >= requiredAccess.writeAccess);
            else
                return false;
        }
        return true; // no authorization needed
    }
    static readGranted(authorizations, requiredAccess) {
        if (requiredAccess) {
            if (requiredAccess.readAccess == 0) return true;
            if (authorizations)
                return (authorizations.readAccess >= requiredAccess.readAccess);
            else
                return false;
        }
        return true;
    }
    static writeGranted(authorizations, requiredAccess) {
        if (requiredAccess) {
            if (requiredAccess.writeAccess == 0) return true;
            if (authorizations)
                return (authorizations.writeAccess >= requiredAccess.writeAccess);
            else
                return false;
        }
        return true;
    }
    static writeGrantedAdminOrOwner(HttpContext, requiredAccess, id) {
        if (requiredAccess) {
            if (requiredAccess.writeAccess === 0) return true; // No special access required
            if (HttpContext.user) {
                const isOwner = HttpContext.user.Id === id; // Check if user owns the resource
                const hasWriteAccess = HttpContext.authorizations?.writeAccess >= requiredAccess.writeAccess;
    
                return isOwner || hasWriteAccess;
            }
            return false; // No user logged in or invalid token
        }
        return true; // No access control required
    }
    
}